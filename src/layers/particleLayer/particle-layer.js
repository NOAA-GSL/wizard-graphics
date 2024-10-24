import { LineLayer } from '@deck.gl/layers';
import { Buffer } from '@luma.gl/core';
import { BufferTransform } from '@luma.gl/engine';
import {
    isViewportGlobe,
    getViewportGlobeCenter,
    getViewportGlobeRadius,
    getViewportBounds,
} from './utils/viewport';
import updateTransformVs from './particle-layer-update-transform.vs.glsl.js';
import gUtilities from '../../utilities/graphicsUtilities';

const DEFAULT_COLOR = [255, 255, 255, 255];

// Where cached positions are stored
const positions = {};

const defaultProps = {
    ...LineLayer.defaultProps,

    image: { type: 'image', value: null, async: true },
    imageUnscale: { type: 'array', value: null },

    numParticles: { type: 'number', min: 1, max: 1000000, value: 5000 },
    maxAge: { type: 'number', min: 1, max: 255, value: 100 },
    speedFactor: { type: 'number', min: 0, max: 10, value: 1 },

    color: { type: 'color', value: DEFAULT_COLOR },
    width: { type: 'number', value: 1 },
    animate: true,

    bounds: { type: 'array', value: [-180, -90, 180, 90], compare: true },
    wrapLongitude: true,
};

export default class ParticleLayer extends LineLayer {
    getShaders() {
        return {
            ...super.getShaders(),
            inject: {
                'vs:#decl': `
          varying float drop;
          const vec2 DROP_POSITION = vec2(0);
        `,
                'vs:#main-start': `
          drop = float(instanceSourcePositions.xy == DROP_POSITION || instanceTargetPositions.xy == DROP_POSITION);
        `,
                'fs:#decl': `
          varying float drop;
        `,
                'fs:#main-start': `
          if (drop > 0.5) discard;
        `,
            },
        };
    }

    initializeState() {
        // Grab max,min lat/lon
        let maxLng = -Infinity;
        let minLng = Infinity;
        let maxLat = -Infinity;
        let minLat = Infinity;

        const { lonlatGrid } = this.props.proj;
        const key = `${lonlatGrid[0][0]}-${lonlatGrid[0][1]}-${lonlatGrid[1][0]}-${lonlatGrid[1][1]}`;
        // Cached values
        if (positions?.[key]?.bounds) {
            ({ maxLng, minLng, maxLat, minLat } = positions[key].bounds);
        }
        // Calculted values (about 2 ms on Travis' computer)
        else {
            for (const outerArr of lonlatGrid) {
                for (const innerArr of outerArr) {
                    const [longitude, latitude] = innerArr;
                    if (longitude > maxLng) maxLng = longitude;
                    if (longitude < minLng) minLng = longitude;
                    if (latitude > maxLat) maxLat = latitude;
                    if (latitude < minLat) minLat = latitude;
                }
            }
            if (!positions[key]) positions[key] = {};
            positions[key].bounds = { maxLng, minLng, maxLat, minLat };
        }

        // Input grid must be mercator projection
        const width = lonlatGrid[0].length;
        const height = lonlatGrid.length;

        // Grids that are rotated 45 degrees will be sampled least (we could over sample)
        // Grids that are not rotated will be sampled correclty
        const dlon = (maxLng - minLng) / width;
        const dlat = (maxLat - minLat) / height;
        let index = 0;
        const uvData = new Uint8Array(width * height * 4);
        for (let j = 0; j < height; j += 1) {
            for (let i = 0; i < width; i += 1) {
                const lat = maxLat - j * dlat;
                const lon = minLng + i * dlon;
                // const [i_local, j_local] = layer.projDict.LonLatToij(lon, lat, true);
                // const ii = gUtilities.ijToIdx(i_local, j_local, width, height);
                // Faster (don't interpolate 20ms; can result in bad directions at high zoom levels)
                // const wdirection = wdir?.[ii];
                // const wmagnitude = wmag?.[ii];
                // Slower (interpolate 100ms)
                const interpolate = true;
                const units = '°';
                const wdirection = gUtilities.getreadoutvalue(
                    lat,
                    lon,
                    this.props.proj,
                    this.props.dataDir,
                    interpolate,
                    units,
                );
                const wmagnitude = gUtilities.getreadoutvalue(
                    lat,
                    lon,
                    this.props.proj,
                    this.props.dataMag,
                    interpolate,
                    units,
                );
                let uv = gUtilities.DirectionToUV(wdirection, wmagnitude);
                if (Number.isNaN(wmagnitude)) uv = [0, 0];

                const red = uv[0] + 128 >= 255 ? 255 : uv[0] + 128;
                const green = uv[1] + 128 >= 255 ? 255 : uv[1] + 128;
                const blue = 0;
                const startIndex = index * 4;
                // Set the RGB color to the pixel in the array
                uvData[startIndex] = red;
                uvData[startIndex + 1] = green;
                uvData[startIndex + 2] = blue;
                uvData[startIndex + 3] = 255; // Alpha value set to 255 (opaque)
                index += 1;
            }
        }
        // console.log('DONE!', performance.now() - t0);

        const texture = this.context.device.createTexture({
            width,
            height,
            data: uvData,
            sampler: {
                minFilter: 'linear',
                magFilter: 'linear',
                addressModeU: 'clamp-to-edge',
                addressModeV: 'clamp-to-edge',
            },
        });

        // Update the props
        Object.assign(this.props, { image: texture });

        super.initializeState({});

        this.setupTransformFeedback();

        const attributeManager = this.getAttributeManager();
        attributeManager.remove([
            'instanceSourcePositions',
            'instanceTargetPositions',
            'instanceColors',
            'instanceWidths',
        ]);
    }

    updateState({ props, oldProps, changeFlags }) {
        const { numParticles, maxAge, color, width } = props;

        super.updateState({ props, oldProps, changeFlags });
        this.state.firstTime = true;

        if (!numParticles || !maxAge || !width) {
            this.deleteTransformFeedback();
            return;
        }

        if (
            numParticles !== oldProps.numParticles ||
            maxAge !== oldProps.maxAge ||
            color[0] !== oldProps.color[0] ||
            color[1] !== oldProps.color[1] ||
            color[2] !== oldProps.color[2] ||
            color[3] !== oldProps.color[3] ||
            width !== oldProps.width ||
            props.animate != oldProps.animate
        ) {
            this.setupTransformFeedback();
        }
    }

    finalizeState() {
        this.deleteTransformFeedback();

        super.finalizeState();
    }

    draw({ uniforms }) {
        const { initialized } = this.state;
        if (!initialized) {
            return;
        }

        const {
            sourcePositions,
            targetPositions,
            sourcePositions64Low,
            targetPositions64Low,
            colors,
            widths,
            model,
        } = this.state;

        model.setAttributes({
            instanceSourcePositions: sourcePositions,
            instanceTargetPositions: targetPositions,
            instanceSourcePositions64Low: sourcePositions64Low,
            instanceTargetPositions64Low: targetPositions64Low,
            instanceColors: colors,
            instanceWidths: widths,
        });

        super.draw({ uniforms });

        // Step forward and animate
        if (this.props.animate) {
            this.step();
            this.setNeedsRedraw();
        }
        // Step forward once, don't step on redraw
        else {
            if (this.state.firstTime) {
                this.step();
            }
        }

        this.state.firstTime = false;
    }

    setupTransformFeedback() {
        const { initialized } = this.state;
        if (initialized) {
            this.deleteTransformFeedback();
        }

        const { numParticles, maxAge, color, width } = this.props;

        // sourcePositions/targetPositions buffer layout:
        // |          age0         |          age1         |          age2         |...|          ageN         |
        // |pos1,pos2,pos3,...,posN|pos1,pos2,pos3,...,posN|pos1,pos2,pos3,...,posN|...|pos1,pos2,pos3,...,posN|
        const numInstances = numParticles * maxAge;
        const numAgedInstances = numParticles * (maxAge - 1);

        /*
        const sourcePositions = new Buffer(this.context.device, new Float32Array(numInstances * 3));
        const targetPositions = new Buffer(this.context.device, new Float32Array(numInstances * 3));
        const sourcePositions64Low = new Float32Array([0, 0, 0]); // constant attribute
        const targetPositions64Low = new Float32Array([0, 0, 0]); // constant attribute
        const colors = new Buffer(
            this.context.device,
            new Float32Array(
                new Array(numInstances)
                    .fill(undefined)
                    .map((_, i) => {
                        const age = Math.floor(i / numParticles);
                        return [
                            color[0],
                            color[1],
                            color[2],
                            (color[3] ?? 255) * (1 - age / maxAge),
                        ].map((d) => d / 255);
                    })
                    .flat(),
            ),
        );
        */

        const sourcePositions = this.context.device.createBuffer(
            new Float32Array(numInstances * 3),
        );
        const targetPositions = this.context.device.createBuffer(
            new Float32Array(numInstances * 3),
        );
        const sourcePositions64Low = new Float32Array([0, 0, 0]); // constant attribute
        const targetPositions64Low = new Float32Array([0, 0, 0]); // constant attribute
        const colors = this.context.device.createBuffer(
            new Float32Array(
                new Array(numInstances)
                    .fill(undefined)
                    .map((_, i) => {
                        const age = Math.floor(i / numParticles);
                        return [
                            color[0],
                            color[1],
                            color[2],
                            (color[3] ?? 255) * (1 - age / maxAge),
                        ].map((d) => d / 255);
                    })
                    .flat(),
            ),
        );

        const widths = new Float32Array([width]); // constant attribute

        /*
        const VS = `\
            #version 300 es
            attribute float inValue;
            varying float outValue;

            void main()
            {
            outValue = 2.0 * inValue;
            }
        `;

        const sourceData = new Float32Array([10, 20, 31, 0, -57]);
        const sourceBuffer = this.context.device.createBuffer({ data: sourceData });

        // Default values applied for size (1) and type (gl.FLOAT)
        const feedbackBuffer = this.context.device.createBuffer({
            byteLength: sourceData.length * 4,
        });

        const transform = new BufferTransform(this.context.device, {
            sourceBuffers: {
                inValue: sourceBuffer,
            },
            feedbackBuffers: {
                outValue: feedbackBuffer,
            },
            vs: VS,
            varyings: ['outValue'],
            elementCount: 5,
        });
        console.log('DONE!');
        // Perform one transform feedback iteration
        transform.run();
        */

        const transform = new BufferTransform(this.context.device, {
            sourceBuffers: {
                sourcePosition: sourcePositions,
            },
            feedbackBuffers: {
                targetPosition: targetPositions,
            },
            feedbackMap: {
                sourcePosition: 'targetPosition',
            },
            // varyings: ['targetPosition'],
            vs: updateTransformVs,
            elementCount: numParticles,
        });
        console.log('TRANSFORM', transform);

        this.setState({
            initialized: true,
            firstTime: true,
            numInstances,
            numAgedInstances,
            sourcePositions,
            targetPositions,
            sourcePositions64Low,
            targetPositions64Low,
            colors,
            widths,
            transform,
        });
    }

    runTransformFeedback() {
        const { initialized } = this.state;
        if (!initialized) {
            return;
        }

        const { viewport, timeline } = this.context;
        const { image, imageUnscale, bounds, numParticles, speedFactor, maxAge } = this.props;
        const { numAgedInstances, transform, previousViewportZoom, previousTime } = this.state;
        const time = timeline.getTime();
        if (!image || time === previousTime) {
            return;
        }

        // viewport
        const viewportGlobe = isViewportGlobe(viewport);
        const viewportGlobeCenter = getViewportGlobeCenter(viewport);
        const viewportGlobeRadius = getViewportGlobeRadius(viewport);
        const viewportBounds = getViewportBounds(viewport);
        const viewportZoomChangeFactor = 2 ** ((previousViewportZoom - viewport.zoom) * 4);

        // speed factor for current zoom level
        const currentSpeedFactor = speedFactor / 2 ** (viewport.zoom + 7);

        // update particles age0
        const uniforms = {
            viewportGlobe,
            viewportGlobeCenter: viewportGlobeCenter || [0, 0],
            viewportGlobeRadius: viewportGlobeRadius || 0,
            viewportBounds: viewportBounds || [0, 0, 0, 0],
            viewportZoomChangeFactor: viewportZoomChangeFactor || 0,

            bitmapTexture: image,
            imageUnscale: imageUnscale || [0, 0],
            bounds,
            numParticles,
            maxAge,
            speedFactor: currentSpeedFactor,

            time,
            seed: Math.random(),
        };
        transform.run({ uniforms });

        // update particles age1-age(N-1)
        // copy age0-age(N-2) sourcePositions to age1-age(N-1) targetPositions
        const sourcePositions =
            transform.bufferTransform.bindings[transform.bufferTransform.currentIndex].sourceBuffers
                .sourcePosition;
        const targetPositions =
            transform.bufferTransform.bindings[transform.bufferTransform.currentIndex]
                .feedbackBuffers.targetPosition;
        sourcePositions.copyData({
            sourceBuffer: targetPositions,
            readOffset: 0,
            writeOffset: numParticles * 4 * 3,
            size: numAgedInstances * 4 * 3,
        });

        transform.swap();

        // const {sourcePositions, targetPositions} = this.state;
        // console.log(uniforms, sourcePositions.getData().slice(0, 6), targetPositions.getData().slice(0, 6));

        this.state.previousViewportZoom = viewport.zoom;
        this.state.previousTime = time;
    }

    resetTransformFeedback() {
        const { initialized } = this.state;
        if (!initialized) {
            return;
        }

        const { numInstances, sourcePositions, targetPositions } = this.state;

        sourcePositions.subData({ data: new Float32Array(numInstances * 3) });
        targetPositions.subData({ data: new Float32Array(numInstances * 3) });
    }

    deleteTransformFeedback() {
        const { initialized } = this.state;
        if (!initialized) {
            return;
        }

        const { sourcePositions, targetPositions, colors, transform } = this.state;

        sourcePositions.delete();
        targetPositions.delete();
        colors.delete();
        transform.delete();

        this.setState({
            initialized: false,
            sourcePositions: undefined,
            targetPositions: undefined,
            sourcePositions64Low: undefined,
            targetPositions64Low: undefined,
            colors: undefined,
            widths: undefined,
            transform: undefined,
        });
    }

    step() {
        this.runTransformFeedback();
    }

    clear() {
        this.resetTransformFeedback();

        this.setNeedsRedraw();
    }
}

ParticleLayer.layerName = 'ParticleLayer';
ParticleLayer.defaultProps = defaultProps;
