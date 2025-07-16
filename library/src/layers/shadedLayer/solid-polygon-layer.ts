// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

// THW modified deck.gl 
// In the future compare tag v9.1.13 with whatever version you are trying to upgrade
// - 7/15/2025: updated to deck.gl v9.1.13
// - ?/?/2024: updated to deck.gl v9.0.33

import { Layer, project32, picking, COORDINATE_SYSTEM } from '@deck.gl/core';
import { Model, Geometry } from '@luma.gl/engine';
import {gouraudMaterial} from '@luma.gl/shadertools';
import { Texture } from '@luma.gl/core';

// Polygon geometry generation is managed by the polygon tesselator
import PolygonTesselator from './polygon-tesselator';

import {solidPolygonUniforms, SolidPolygonProps} from './solid-polygon-layer-uniforms';
import vsTop from './solid-polygon-layer-vertex-top.glsl';
import vsSide from './solid-polygon-layer-vertex-side.glsl';
import fs from './solid-polygon-layer-fragment.glsl';

import type {
    LayerProps,
    LayerDataSource,
    Color,
    Material,
    Accessor,
    AccessorFunction,
    UpdateParameters,
    GetPickingInfoParams,
    PickingInfo,
    DefaultProps,
    TextureSource,
} from '@deck.gl/core';
import type { PolygonGeometry } from './polygon';
import gUtilities from '../../utilities/graphicsUtilities';
import TriangulateGrid from './TriangulateGrid';

// Where all the verticies, indicies, rgbValues, and startIndicies
// are stored so we only have to caluclate once per model
const positions = {};

type _ShadedLayerProps<DataT> = {
    data: LayerDataSource<DataT>;
    /** Whether to fill the polygons
     * @default true
     */
    filled?: boolean;
    /** Whether to extrude the polygons
     * @default false
     */
    extruded?: boolean;
    /** Whether to generate a line wireframe of the polygon.
     * @default false
     */
    wireframe?: boolean;
    /**
     * (Experimental) If `false`, will skip normalizing the coordinates returned by `getPolygon`.
     * @default false
     */
    _normalize?: boolean;
    /**
     * (Experimental) This prop is only effective with `_normalize: false`.
     * It specifies the winding order of rings in the polygon data, one of 'CW' (clockwise) and 'CCW' (counter-clockwise)
     */
    _windingOrder?: 'CW' | 'CCW';

    /**
     * (Experimental) This prop is only effective with `XYZ` data.
     * When true, polygon tesselation will be performed on the plane with the largest area, instead of the xy plane.
     * @default false
     */
    _full3d?: boolean;

    /** Elevation multiplier.
     * @default 1
     */
    elevationScale?: number;

    /** Polygon geometry accessor. */
    getPolygon?: AccessorFunction<DataT, PolygonGeometry>;
    /** Extrusion height accessor.
     * @default 1000
     */
    getElevation?: Accessor<DataT, number>;
    /** Fill color accessor.
     * @default [0, 0, 0, 255]
     */
    getFillColor?: Accessor<DataT, Color>;
    /** Stroke color accessor.
     * @default [0, 0, 0, 255]
     */
    getLineColor?: Accessor<DataT, Color>;

    /** Extrusion height accessor.
     * @default 1
     */
    getPolygonData?: Accessor<DataT, number>;
    /** Extrusion height accessor.
     * @default 1
     */
    getVertex1?: Accessor<DataT, number>;
    /** Extrusion height accessor.
     * @default 1
     */
    getVertex2?: Accessor<DataT, number>;
    /** Extrusion height accessor.
     * @default 1
     */
    getVertex3?: Accessor<DataT, number>;
    /** Extrusion height accessor.
     * @default 1
     */
    getOpacity?: Accessor<DataT, number>;
    texture?: string | TextureSource | Promise<TextureSource>;
    /** Whether to fill the polygons
     * @default true
     */
    interpolateData?: boolean;
    /**
     * Material settings for lighting effect. Applies if `extruded: true`
     *
     * @default true
     * @see https://deck.gl/docs/developer-guide/using-lighting
     */
    material?: Material;
};

/** Render filled and/or extruded polygons. */
export type SolidPolygonLayerProps<DataT = unknown> = _ShadedLayerProps<DataT> & LayerProps;

const DEFAULT_COLOR: [number, number, number, number] = [0, 0, 0, 255];

const defaultProps: DefaultProps<SolidPolygonLayerProps> = {
    filled: true,
    extruded: false,
    wireframe: false,
    _normalize: false,
    _windingOrder: 'CW',
    _full3d: false,

    elevationScale: { type: 'number', min: 0, value: 1 },

    getPolygon: { type: 'accessor', value: (f: any) => f.polygon },
    getElevation: { type: 'accessor', value: 1000 },

    // THW ADD
    getVertex1: { type: 'accessor', value: -1 },
    getVertex2: { type: 'accessor', value: -1 },
    getVertex3: { type: 'accessor', value: -1 },
    getPolygonData: { type: 'accessor', value: 1000 },
    texture: {
        type: 'image',
        value: null,
        async: true,
    },
    // Optional opacity layer
    getOpacity: { type: 'accessor', value: -1 },
    interpolateData: true,
    // THW Done

    // Accessor for colors
    getFillColor: { type: 'accessor', value: DEFAULT_COLOR },
    getLineColor: { type: 'accessor', value: DEFAULT_COLOR },

    material: true,
};

const ATTRIBUTE_TRANSITION = {
    enter: (value, chunk) => {
        return chunk.length ? chunk.subarray(chunk.length - value.length) : value;
    },
};

export default class ShadedLayer<DataT = any, ExtraPropsT extends {} = {}> extends Layer<
    ExtraPropsT & Required<_ShadedLayerProps<DataT>>
> {
    static defaultProps = defaultProps;
    static layerName = 'ShadedLayer';

    state!: {
        topModel?: Model;
        sideModel?: Model;
        wireframeModel?: Model;
        model?: Model;
        texture?: Texture;
        emptyTexture: Texture;
        models?: Model[];
        numInstances: number;
        polygonTesselator: PolygonTesselator;
    };

    getShaders(type) {
        return super.getShaders({
            vs: type === 'top' ? vsTop : vsSide,
            fs,
            defines: {
                RING_WINDING_ORDER_CW:
                    !this.props._normalize && this.props._windingOrder === 'CCW' ? 0 : 1,
            },
            modules: [project32, gouraudMaterial, picking, solidPolygonUniforms]
        });
    }

    get wrapLongitude(): boolean {
        return false;
    }

    getBounds(): [number[], number[]] | null {
        return this.getAttributeManager()?.getBounds(['vertexPositions']);
    }

    initializeState() {
        const { viewport } = this.context;
        let { coordinateSystem } = this.props;
        const { _full3d } = this.props;
        if (viewport.isGeospatial && coordinateSystem === COORDINATE_SYSTEM.DEFAULT) {
            coordinateSystem = COORDINATE_SYSTEM.LNGLAT;
        }

        let preproject: ((xy: number[]) => number[]) | undefined;

        if (coordinateSystem === COORDINATE_SYSTEM.LNGLAT) {
            if (_full3d) {
                preproject = viewport.projectPosition.bind(viewport);
            } else {
                preproject = viewport.projectFlat.bind(viewport);
            }
        }

        this.setState({
            numInstances: 0,
            emptyTexture: this.context.device.createTexture({
                data: new Uint8Array(4),
                width: 1,
                height: 1,
            }),
            polygonTesselator: new PolygonTesselator({
                // Lnglat coordinates are usually projected non-linearly, which affects tesselation results
                // Provide a preproject function if the coordinates are in lnglat
                preproject,
                fp64: this.use64bitPositions(),
                IndexType: Uint32Array,
            }),
        });

        const attributeManager = this.getAttributeManager()!;
        const noAlloc = true;

        attributeManager.remove(['instancePickingColors']);

        /* eslint-disable max-len */
        attributeManager.add({
            indices: {
                size: 1,
                isIndexed: true,
                // eslint-disable-next-line @typescript-eslint/unbound-method
                update: this.calculateIndices,
                noAlloc,
            },
            vertexPositions: {
                size: 3,
                type: 'float64',
                stepMode: 'dynamic',
                fp64: this.use64bitPositions(),
                transition: ATTRIBUTE_TRANSITION,
                accessor: 'getPolygon',
                // eslint-disable-next-line @typescript-eslint/unbound-method
                update: this.calculatePositions,
                noAlloc,
                shaderAttributes: {
                    nextVertexPositions: {
                        vertexOffset: 1,
                    },
                },
            },
            instanceVertexValid: {
                size: 1,
                type: 'uint16',
                stepMode: 'instance',
                // eslint-disable-next-line @typescript-eslint/unbound-method
                update: this.calculateVertexValid,
                noAlloc,
            },
            // THW ADD
            polygondata: {
                size: 1,
                stepMode: 'dynamic',
                transition: ATTRIBUTE_TRANSITION,
                accessor: 'getPolygonData',
            },
            opacitydata: {
                size: 1,
                stepMode: 'dynamic',
                transition: ATTRIBUTE_TRANSITION,
                accessor: 'getOpacity',
            },
            vertex1: {
                size: 1,
                stepMode: 'dynamic',
                transition: ATTRIBUTE_TRANSITION,
                accessor: 'getVertex1',
            },
            vertex2: {
                size: 1,
                stepMode: 'dynamic',
                transition: ATTRIBUTE_TRANSITION,
                accessor: 'getVertex2',
            },
            vertex3: {
                size: 1,
                stepMode: 'dynamic',
                transition: ATTRIBUTE_TRANSITION,
                accessor: 'getVertex3',
            },

            elevations: {
                size: 1,
                stepMode: 'dynamic',
                transition: ATTRIBUTE_TRANSITION,
                accessor: 'getElevation',
            },
            fillColors: {
                size: this.props.colorFormat.length,
                type: 'unorm8',
                stepMode: 'dynamic',
                transition: ATTRIBUTE_TRANSITION,
                accessor: 'getFillColor',
                defaultValue: DEFAULT_COLOR,
            },
            lineColors: {
                size: this.props.colorFormat.length,
                type: 'unorm8',
                stepMode: 'dynamic',
                transition: ATTRIBUTE_TRANSITION,
                accessor: 'getLineColor',
                defaultValue: DEFAULT_COLOR,
            },
            pickingColors: {
                size: 4,
                type: 'uint8',
                stepMode: 'dynamic',
                accessor: (object, { index, target: value }) =>
                    this.encodePickingColor(
                        object && object.__source ? object.__source.index : index,
                        value,
                    ),
            },
        });
        /* eslint-enable max-len */
    }

    getPickingInfo(params: GetPickingInfoParams): PickingInfo {
        const info = super.getPickingInfo(params);
        const { index } = info;
        const data = this.props.data as any[];

        // Check if data comes from a composite layer, wrapped with getSubLayerRow
        if (data[0] && data[0].__source) {
            // index decoded from picking color refers to the source index
            info.object = data.find((d) => d.__source.index === index);
        }
        return info;
    }

    disablePickingIndex(objectIndex: number) {
        const data = this.props.data as any[];

        // Check if data comes from a composite layer, wrapped with getSubLayerRow
        if (data[0] && data[0].__source) {
            // index decoded from picking color refers to the source index
            for (let i = 0; i < data.length; i++) {
                if (data[i].__source.index === objectIndex) {
                    this._disablePickingIndex(i);
                }
            }
        } else {
            super.disablePickingIndex(objectIndex);
        }
    }

    draw({ uniforms }) {
        const { extruded, filled, wireframe, elevationScale } = this.props;
        const { topModel, sideModel, wireframeModel, polygonTesselator } = this.state;

        const renderUniforms: SolidPolygonProps = {
            extruded: Boolean(extruded),
            elevationScale,
            isWireframe: false
        };

        // Note - the order is important
        if (wireframeModel && wireframe) {
            wireframeModel.setInstanceCount(polygonTesselator.instanceCount - 1);
            wireframeModel.shaderInputs.setProps({solidPolygon: {...renderUniforms, isWireframe: true}});
            wireframeModel.draw(this.context.renderPass);
        }

        if (sideModel && filled) {
            sideModel.setInstanceCount(polygonTesselator.instanceCount - 1);
            sideModel.shaderInputs.setProps({solidPolygon: renderUniforms});
            sideModel.draw(this.context.renderPass);
        }

        if (topModel && filled) {
            topModel.setVertexCount(polygonTesselator.vertexCount);
            topModel.shaderInputs.setProps({solidPolygon: renderUniforms});
            topModel.draw(this.context.renderPass);
        }
    }

    updateState(updateParams: UpdateParameters<this>) {
        super.updateState(updateParams);
        const { props, oldProps, changeFlags } = updateParams;

        const colorsChanged =
            props.colors !== oldProps.colors ||
            props.colorLevels !== oldProps.colorLevels ||
            props.colorType !== oldProps.colorType ||
            props.interpolateData !== oldProps.interpolateData;

        if (props.data !== oldProps.data || colorsChanged) {
            console.log('Updating Buffers!');
            this.setBuffers();
        }

        if (props.projection.lonlatGrid !== oldProps.projection?.lonlatGrid) {
            console.log('Updating geometry!');
            this.updateGeometry(updateParams);
        }

        const attributeManager = this.getAttributeManager();

        const regenerateModels =
            changeFlags.extensionsChanged ||
            props.filled !== oldProps.filled ||
            props.extruded !== oldProps.extruded;

        if (regenerateModels) {
            this.state.models?.forEach((model) => model.destroy());

            this.setState(this._getModels());
            attributeManager!.invalidateAll();
        }
        
        if (colorsChanged) {
            console.log('Updating Texture!');
            this.setTexture();
        }
    }

    private setBuffers() {
        // THW ADD

        // Get dimensions
        const { lonlatGrid } = this.props.projection;
        const dims = [lonlatGrid.length, lonlatGrid[0].length];

        // Get cashing key for grid, 4 points is all that is needed to figure out
        // if this is a new grid or not
        const key = `${lonlatGrid[0][0]}-${lonlatGrid[0][1]}-${lonlatGrid[1][0]}-${lonlatGrid[1][1]}-${dims}-${this.props.interpolateData}`;

        // Make normalized data if it doesn't exist
        const ndata =
            this.props.ndata ||
            gUtilities.normalize(this.props.data, this.props.colorLevels, this.props.colorType);

        //
        // Typical shaded layer where data is interpolated between point
        //
        let data;
        if (this.props.interpolateData) {
            const dataValues = TriangulateGrid.triangulate(ndata, 'data', dims);
            if (!positions?.[key]?.vertices) {
                const t0 = performance.now();
                positions[key] = {};
                [positions[key].vertices, positions[key].triangleIndices] =
                    TriangulateGrid.triangulate(
                        lonlatGrid,
                        'positions',
                        dims,
                        3,
                        this.props.elevation,
                    );
                console.log('Triangulate Time:', performance.now() - t0);
                positions[key].startIndices = new Uint32Array([0]);
            }
            data = {
                length: positions[key].startIndices.length,
                // startIndices should be [0] for a triangle and an array of start positions for a polygon
                startIndices: positions[key].startIndices,
                attributes: {
                    getPolygon: { value: positions[key].vertices, size: 3 },
                    // When supplying Triangle Indicies, the polygon is assumed to be a triangle
                    getTriangleIndices: {
                        value: positions[key].triangleIndices,
                        size: 1,
                    },
                    getPolygonData: { value: dataValues, size: 1 },
                },
            };

            // If opacity data (or normalized opacity data) is supplied, add it
            if (this.props.odata || this.props.nodata) {
                const nodata =
                    this.props.nodata || gUtilities.normalize(this.props.odata, [0, 100], 'linear');
                data.attributes.getOpacity = TriangulateGrid.triangulate(
                    nodata,
                    'data',
                    dims,
                    1,
                    1,
                    0.01,
                );
            }
        }
        //
        // Non-typical, data is not interpolated between points (paintballs)
        //
        else {
            if (!positions?.[key]?.vertices) {
                positions[key] = {};
                [positions[key].vertices, positions[key].triangleIndices, positions[key].rgb] =
                    TriangulateGrid.triangulate(
                        lonlatGrid,
                        'positions-redundant',
                        dims,
                        3,
                        this.props.elevation,
                    );
                positions[key].startIndices = new Uint32Array([0]);
            }

            const [v1, v2, v3] = TriangulateGrid.triangulate(ndata, 'data-redundant', dims);
            data = {
                length: positions[key].startIndices.length,
                startIndices: positions[key].startIndices,
                attributes: {
                    getPolygon: { value: positions[key].vertices, size: 3 },
                    getTriangleIndices: {
                        value: positions[key].triangleIndices,
                        size: 1,
                    },

                    getVertex1: { value: v1, size: 1 },
                    getVertex2: { value: v2, size: 1 },
                    getVertex3: { value: v3, size: 1 },
                    getFillColor: { value: positions[key].rgb, size: 3 },
                },
            };
        }

        // Assign new props
        Object.assign(this.props, {
            data,
        });
        // THW DONE ADD
    }

    private setTexture(): void {
        const { emptyTexture, topModel } = this.state;

        // Get colors
        const colors = [];
        this.props.colors.forEach((c) => {
            colors.push(...gUtilities.string_to_rgb(c));
        });
        const ctype = this.props.colorType === 'scaleLinear' ? 'linear' : 'nearest';
        const texture = this.context.device.createTexture({
            width: colors.length / 4,
            height: 1,
            data: new Uint8Array(colors),
            sampler: {
                minFilter: ctype,
                magFilter: ctype,
                addressModeU: 'clamp-to-edge',
                addressModeV: 'clamp-to-edge',
            },
            //format: GL.RGBA,
            //pixelStore: {
            //    [GL.UNPACK_FLIP_Y_WEBGL]: true,
            //},
            //mipmaps: false,
        });
        // props.mesh may not be ready at this time.
        // The sampler will be set when `getModel` is called
        if (topModel) {
            topModel.setBindings({
                sampler: texture || emptyTexture,
            });
            topModel.shaderInputs.setProps({
                // Looks like we need to provide a `ShaderModule` to get rid of the
                // TypeScript error? Maybe revisit this later
                // https://luma.gl/docs/api-reference/engine/shader-inputs/#shadermoduleinputs
                solidPolygon: {
                    interpolateData: Boolean(this.props.interpolateData),
                    hasTexture: Boolean(texture),
                },
            });
        }
    }

    protected updateGeometry({ props, oldProps, changeFlags }: UpdateParameters<this>) {
        const geometryConfigChanged =
            changeFlags.dataChanged ||
            (changeFlags.updateTriggersChanged &&
                (changeFlags.updateTriggersChanged.all ||
                    changeFlags.updateTriggersChanged.getPolygon));

        // When the geometry config  or the data is changed,
        // tessellator needs to be invoked
        if (geometryConfigChanged) {
            const { polygonTesselator } = this.state;
            const buffers = (props.data as any).attributes || {};
            polygonTesselator.updateGeometry({
                data: props.data,
                normalize: props._normalize,
                geometryBuffer: buffers.getPolygon,
                buffers,
                getGeometry: props.getPolygon,
                positionFormat: props.positionFormat,
                wrapLongitude: props.wrapLongitude,
                // TODO - move the flag out of the viewport
                resolution: this.context.viewport.resolution,
                fp64: this.use64bitPositions(),
                dataChanged: changeFlags.dataChanged,
                full3d: props._full3d,
            });

            this.setState({
                numInstances: polygonTesselator.instanceCount,
                startIndices: polygonTesselator.vertexStarts,
            });

            if (!changeFlags.dataChanged) {
                // Base `layer.updateState` only invalidates all attributes on data change
                // Cover the rest of the scenarios here
                this.getAttributeManager()!.invalidateAll();
            }
        }
    }

    protected _getModels() {
        const { id, filled, extruded } = this.props;

        let topModel;
        let sideModel;
        let wireframeModel;

        if (filled) {
            const shaders = this.getShaders('top');
            shaders.defines.NON_INSTANCED_MODEL = 1;
            const bufferLayout = this.getAttributeManager()!.getBufferLayouts({
                isInstanced: false,
            });

            topModel = new Model(this.context.device, {
                ...shaders,
                id: `${id}-top`,
                topology: 'triangle-list',
                bufferLayout,
                isIndexed: true,
                userData: {
                    excludeAttributes: { instanceVertexValid: true },
                },
            });
        }
        if (extruded) {
            const bufferLayout = this.getAttributeManager()!.getBufferLayouts({
                isInstanced: true,
            });

            sideModel = new Model(this.context.device, {
                ...this.getShaders('side'),
                id: `${id}-side`,
                bufferLayout,
                geometry: new Geometry({
                    topology: 'triangle-strip',
                    attributes: {
                        // top right - top left - bottom right - bottom left
                        positions: {
                            size: 2,
                            value: new Float32Array([1, 0, 0, 0, 1, 1, 0, 1]),
                        },
                    },
                }),
                isInstanced: true,
                userData: {
                    excludeAttributes: { indices: true },
                },
            });

            wireframeModel = new Model(this.context.device, {
                ...this.getShaders('side'),
                id: `${id}-wireframe`,
                bufferLayout,
                geometry: new Geometry({
                    topology: 'line-strip',
                    attributes: {
                        // top right - top left - bottom left - bottom right
                        positions: {
                            size: 2,
                            value: new Float32Array([1, 0, 0, 0, 0, 1, 1, 1]),
                        },
                    },
                }),
                isInstanced: true,
                userData: {
                    excludeAttributes: { indices: true },
                },
            });
        }

        return {
            models: [sideModel, wireframeModel, topModel].filter(Boolean),
            topModel,
            sideModel,
            wireframeModel,
        };
    }

    protected calculateIndices(attribute) {
        const { polygonTesselator } = this.state;
        attribute.startIndices = polygonTesselator.indexStarts;
        attribute.value = polygonTesselator.get('indices');
    }

    protected calculatePositions(attribute) {
        const { polygonTesselator } = this.state;
        attribute.startIndices = polygonTesselator.vertexStarts;
        attribute.value = polygonTesselator.get('positions');
    }

    protected calculateVertexValid(attribute) {
        attribute.value = this.state.polygonTesselator.get('vertexValid');
    }
}
