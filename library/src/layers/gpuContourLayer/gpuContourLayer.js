import { CompositeLayer, Layer, project32, picking } from '@deck.gl/core';
import { TextLayer } from '@deck.gl/layers';
import { Buffer } from '@luma.gl/core';
import { Model } from '@luma.gl/engine';
import { getColors } from '../../maps/legend/legendHelperFunctions';
import graphicsUtilities from '../../utilities/graphicsUtilities';
import deckUtilities from '../../utilities/deckUtilities';
import { ContourLabels } from '../contourLayer/contourLabels';
import {
    createContourMesh,
    normalizeLevels,
    placeLabelCandidates,
    sampleLabelCandidates,
    updateContourValues,
} from './contourMesh.js';

const uniformBlock = `
uniform gpuContourUniforms {
    float levelCount;
    float lineWidth;
    float pixelRatio;
    vec2 viewportSize;
} gpuContour;
`;
const contourUniforms = {
    name: 'gpuContour',
    vs: uniformBlock,
    fs: uniformBlock,
    uniformTypes: {
        levelCount: 'f32',
        lineWidth: 'f32',
        pixelRatio: 'f32',
        viewportSize: 'vec2<f32>',
    },
};
const vertexShader = `#version 300 es
precision highp float;
precision highp int;
in uvec4 segment;
uniform sampler2D positionsTexture;
uniform sampler2D scalarsTexture;
uniform sampler2D contourTable;
out vec2 lineCoordinates;
out float screenWeight;
flat out float segmentLength;
flat out int contourIndex;
const vec2 corners[4] = vec2[4](
    vec2(1., -1.), vec2(1., 1.), vec2(0., -1.), vec2(0., 1.)
);
void main(void) {
    int textureWidth = textureSize(positionsTexture, 0).x;
    vec4 clips[3];
    float scalars[3];
    for (int vertex = 0; vertex < 3; vertex++) {
        int index = int(segment[vertex]);
        ivec2 coordinate = ivec2(index % textureWidth, index / textureWidth);
        vec3 position = texelFetch(positionsTexture, coordinate, 0).xyz;
        scalars[vertex] = texelFetch(scalarsTexture, coordinate, 0).r;
        clips[vertex] = project_position_to_clipspace(position, vec3(0.), vec3(0.), geometry.position);
        geometry.worldPosition = position;
    }
    contourIndex = int(segment.w);
    float threshold = texelFetch(contourTable, ivec2(contourIndex, 0), 0).r;
    vec4 crossings[2];
    int count = 0;
    for (int edge = 0; edge < 3; edge++) {
        int next = (edge + 1) % 3;
        if (scalars[edge] == scalars[next]) continue;
        float weight = (threshold - scalars[edge]) / (scalars[next] - scalars[edge]);
        if (weight < 0. || weight > 1.) continue;
        vec4 crossing = mix(clips[edge], clips[next], weight);
        if (count == 0 || any(notEqual(crossing, crossings[0]))) {
            crossings[count] = crossing;
            count++;
        }
        if (count == 2) break;
    }
    if (count != 2 || crossings[0].w <= 0. || crossings[1].w <= 0.) {
        gl_Position = vec4(2., 2., 2., 1.);
        return;
    }
    vec2 start = crossings[0].xy / crossings[0].w;
    vec2 end = crossings[1].xy / crossings[1].w;
    vec2 delta = (end - start) * gpuContour.viewportSize * 0.5;
    segmentLength = length(delta);
    if (segmentLength < 0.0001) {
        gl_Position = vec4(2., 2., 2., 1.);
        return;
    }
    vec2 firstEdge = clips[1].xy / clips[1].w - clips[0].xy / clips[0].w;
    vec2 secondEdge = clips[2].xy / clips[2].w - clips[0].xy / clips[0].w;
    float winding = firstEdge.x * secondEdge.y - firstEdge.y * secondEdge.x < 0. ? -1. : 1.;
    vec2 corner = corners[gl_VertexID];
    float radius = gpuContour.lineWidth * gpuContour.pixelRatio * 0.5 + 0.5;
    vec2 local = vec2(mix(-radius, segmentLength + radius, corner.x), corner.y * radius * winding);
    vec2 direction = delta / segmentLength;
    vec2 offset = direction * (local.x - corner.x * segmentLength) + vec2(-direction.y, direction.x) * local.y;
    gl_Position = mix(crossings[0], crossings[1], corner.x);
    gl_Position.xy += offset * 2. / gpuContour.viewportSize * gl_Position.w;
    geometry.pickingColor = vec3(0.);
    DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
    lineCoordinates = local * gl_Position.w;
    screenWeight = gl_Position.w;
}
`;
const fragmentShader = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D contourTable;
in vec2 lineCoordinates;
in float screenWeight;
flat in float segmentLength;
flat in int contourIndex;
out vec4 fragColor;
void main(void) {
    vec2 local = lineCoordinates / screenWeight;
    float distanceToSegment = length(vec2(max(max(-local.x, local.x - segmentLength), 0.), local.y));
    float halfWidth = gpuContour.lineWidth * gpuContour.pixelRatio * 0.5;
    float coverage = 1. - smoothstep(max(0., halfWidth - 0.5), halfWidth + 0.5, distanceToSegment);
    if (coverage <= 0.) discard;
    fragColor = texelFetch(contourTable, ivec2(contourIndex, 1), 0);
    fragColor.a *= coverage * layer.opacity;
    geometry.uv = vec2(0.);
    DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;

export class ContourSurface extends Layer {
    getShaders() {
        return super.getShaders({
            vs: vertexShader,
            fs: fragmentShader,
            modules: [project32, picking, contourUniforms],
        });
    }

    initializeState() {
        if (this.context.device.type !== 'webgl')
            throw new Error('GpuContourLayer requires WebGL2.');
        const model = new Model(this.context.device, {
            id: this.props.id,
            ...this.getShaders(),
            topology: 'triangle-strip',
            isInstanced: true,
            bufferLayout: [{ name: 'segment', format: 'uint32x4', stepMode: 'instance' }],
        });
        model.setVertexCount(4);
        this.setState({ model });
    }

    updateState({ props, oldProps }) {
        const { device } = this.context;
        const { model } = this.state;
        if (props.mesh !== oldProps.mesh) {
            this.state.positions?.destroy();
            const vertexCount = props.mesh.positions.length / 3;
            const width = Math.max(1, Math.min(2048, vertexCount));
            const height = Math.max(1, Math.ceil(vertexCount / width));
            const data = new Float32Array(width * height * 4);
            for (let index = 0; index < vertexCount; index += 1)
                data.set(props.mesh.positions.subarray(index * 3, index * 3 + 3), index * 4);
            const positions = device.createTexture({
                width,
                height,
                format: 'rgba32float',
                data,
                sampler: { minFilter: 'nearest', magFilter: 'nearest' },
            });
            this.setState({ positions });
        }
        if (props.field !== oldProps.field) {
            const { width, height } = this.state.positions;
            let { scalars, segments, scalarValues } = this.state;
            if (!scalarValues || scalarValues.length !== width * height)
                scalarValues = new Float32Array(width * height);
            scalarValues.set(props.field.values);
            if (!scalars || scalars.width !== width || scalars.height !== height) {
                scalars?.destroy();
                scalars = device.createTexture({
                    width,
                    height,
                    format: 'r32float',
                    data: scalarValues,
                    sampler: { minFilter: 'nearest', magFilter: 'nearest' },
                });
            } else scalars.writeData(scalarValues);
            if (!segments || segments.byteLength < props.field.segments.byteLength) {
                segments?.destroy();
                segments = device.createBuffer({
                    data: props.field.segments.length ? props.field.segments : new Uint32Array(4),
                    usage: Buffer.VERTEX | Buffer.COPY_DST,
                });
            } else if (props.field.segments.length) segments.write(props.field.segments);
            model.setAttributes({ segment: segments });
            model.setInstanceCount(props.field.segments.length / 4);
            this.setState({ scalars, segments, scalarValues });
        }
        if (props.table !== oldProps.table) {
            this.state.texture?.destroy();
            const texture = device.createTexture({
                width: Math.max(1, props.levelCount),
                height: 2,
                format: 'rgba32float',
                data: props.table,
                sampler: { minFilter: 'nearest', magFilter: 'nearest' },
            });
            this.setState({ texture });
        }
        model.setBindings({
            positionsTexture: this.state.positions,
            scalarsTexture: this.state.scalars,
            contourTable: this.state.texture,
        });
    }

    draw() {
        if (
            !this.props.levelCount ||
            !this.props.field.segments.length ||
            this.props.lineWidth <= 0
        )
            return;
        this.state.model.setInstanceCount(this.props.field.segments.length / 4);
        const canvas = this.context.device.canvasContext?.canvas;
        const pixelRatio = canvas?.clientWidth ? canvas.width / canvas.clientWidth : 1;
        this.state.model.shaderInputs.setProps({
            gpuContour: {
                levelCount: this.props.levelCount,
                lineWidth: this.props.lineWidth,
                pixelRatio,
                viewportSize: [
                    this.context.viewport.width * pixelRatio,
                    this.context.viewport.height * pixelRatio,
                ],
            },
        });
        this.state.model.draw(this.context.renderPass);
    }

    finalizeState() {
        for (const key of ['model', 'positions', 'scalars', 'segments', 'texture'])
            this.state[key]?.destroy();
    }
}
ContourSurface.layerName = 'GpuContourSurface';

function sameValues(left, right) {
    return (
        left === right ||
        (Array.isArray(left) &&
            Array.isArray(right) &&
            left.length === right.length &&
            left.every((value, index) => Object.is(value, right[index])))
    );
}

function createTable(levels, colorLevels, colors, colorType) {
    const colorScale = getColors(colorLevels, colors, colorType);
    const width = Math.max(1, levels.length);
    const table = new Float32Array(width * 8);
    levels.forEach((level, index) => {
        table[index * 4] = level;
        const color = graphicsUtilities.string_to_rgb(colorScale(level));
        table.set(
            [color[0] / 255, color[1] / 255, color[2] / 255, (color[3] ?? 255) / 255],
            (width + index) * 4,
        );
    });
    return table;
}

export default class GpuContourLayer extends CompositeLayer {
    initializeState() {
        this.state = {};
    }

    shouldUpdateState({ changeFlags }) {
        return changeFlags.somethingChanged;
    }

    updateState({ props, changeFlags }) {
        const points = props.lonlatGrid || props.projection?.lonlatGrid;
        if (!points || !props.data) return;
        const {
            inputs,
            mesh: previousMesh,
            field: previousField,
            levels: previousLevels,
        } = this.state;
        const geometryChanged =
            !previousMesh ||
            points !== inputs?.points ||
            !sameValues(props.shape, inputs?.shape) ||
            props.triangulationMode !== inputs?.mode ||
            props.elevation !== inputs?.elevation;
        const fieldChanged =
            geometryChanged || props.data !== inputs?.data || changeFlags.dataChanged;
        const normalized = normalizeLevels(props.contourLevels || props.colorLevels);
        const levelsChanged = !sameValues(normalized, previousLevels);
        const levels = levelsChanged ? normalized : previousLevels;
        const mesh = geometryChanged
            ? createContourMesh(points, props.shape, props.triangulationMode, props.elevation)
            : previousMesh;
        const field =
            fieldChanged || levelsChanged
                ? updateContourValues(mesh, props.data, levels)
                : previousField;
        const colorsChanged =
            levelsChanged ||
            !sameValues(props.colors, inputs?.colors) ||
            !sameValues(props.colorLevels, inputs?.colorLevels) ||
            props.colorType !== inputs?.colorType;
        const table = colorsChanged
            ? createTable(levels, props.colorLevels, props.colors, props.colorType)
            : this.state.table;
        let candidates = this.state.candidates;
        let labels = this.state.labels || [];
        let labelZoom = this.state.labelZoom;
        const { viewport } = this.context;
        if (props.labels?.enabled) {
            const candidatesChanged =
                !candidates ||
                fieldChanged ||
                levelsChanged ||
                props.labels.maxCandidates !== inputs?.maxCandidates;
            if (candidatesChanged) {
                candidates = sampleLabelCandidates(
                    mesh,
                    field,
                    levels,
                    props.labels.maxCandidates ?? 4000,
                );
            }
            const placementReset =
                candidatesChanged ||
                labelZoom === undefined ||
                Math.abs(viewport.zoom - labelZoom) >= 0.5 ||
                viewport.projectionMode !== this.state.labelProjectionMode ||
                props.labels.spacing !== inputs?.labelSpacing ||
                props.labels.padding !== inputs?.labelPadding ||
                props.labels.maxLabels !== inputs?.maxLabels;
            if (placementReset || changeFlags.viewportChanged) {
                labels = placeLabelCandidates(
                    mesh,
                    candidates,
                    viewport,
                    props.labels,
                    placementReset ? [] : labels,
                );
                if (placementReset) labelZoom = viewport.zoom;
            }
        } else {
            candidates = undefined;
            labels = [];
        }
        this.setState({
            mesh,
            field,
            levels,
            table,
            candidates,
            labels,
            labelZoom,
            labelProjectionMode: viewport.projectionMode,
            inputs: {
                points,
                shape: props.shape?.slice(),
                mode: props.triangulationMode,
                elevation: props.elevation,
                data: props.data,
                colors: Array.isArray(props.colors) ? props.colors.slice() : props.colors,
                colorLevels: props.colorLevels?.slice(),
                colorType: props.colorType,
                maxCandidates: props.labels?.maxCandidates,
                labelSpacing: props.labels?.spacing,
                labelPadding: props.labels?.padding,
                maxLabels: props.labels?.maxLabels,
            },
        });
    }

    renderLayers() {
        const { mesh, field, table, levels, labels } = this.state;
        const { viewport } = this.context;
        if (!mesh || !mesh.triangleIndices.length || !table) return null;
        const surface = new ContourSurface(
            this.getSubLayerProps({ id: 'surface', pickable: false }),
            {
                mesh,
                field,
                table,
                levelCount: levels.length,
                lineWidth: this.props.lineWidth,
            },
        );
        const text = this.props.labels?.enabled
            ? new TextLayer(
                  this.getSubLayerProps({ id: 'labels', pickable: false }),
                  ContourLabels.defaultProps,
                  this.props.labels,
                  {
                      data: labels.filter((label) =>
                          deckUtilities.isFeatureVisibleOnGlobe(
                              viewport.latitude,
                              viewport.longitude,
                              label.position[1],
                              label.position[0],
                              viewport.zoom,
                          ),
                      ),
                      getSize: this.props.labels.getSize ?? 14,
                      getPosition: (label) => label.position,
                      getText: (label) => label.text,
                  },
              )
            : null;
        return [surface, text];
    }
}
GpuContourLayer.layerName = 'GpuContourLayer';
GpuContourLayer.defaultProps = {
    triangulationMode: 'auto',
    elevation: 0,
    lineWidth: 2,
    pickable: false,
    parameters: { depthCompare: 'always', cullMode: 'back' },
    labels: { enabled: false },
};

export { GpuContourLayer };
