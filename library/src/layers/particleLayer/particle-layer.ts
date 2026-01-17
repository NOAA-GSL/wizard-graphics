import {
    Color,
    DefaultProps,
    LayerContext,
    UpdateParameters,
    COORDINATE_SYSTEM,
} from '@deck.gl/core';
import { LineLayer, LineLayerProps } from '@deck.gl/layers';
import { Buffer, Texture } from '@luma.gl/core';
import { Model, BufferTransform } from '@luma.gl/engine';
import { ShaderModule } from '@luma.gl/shadertools';
import gUtilities from '../../utilities/graphicsUtilities';
import shader from './particle-layer-update-transform.vs.glsl.js';

export type UniformProps = {
    numParticles: number;
    maxAge: number;
    speedFactor: number;
    time: number;
    seed: number;
    viewportBounds: number[];
    viewportZoomChangeFactor: number;
    bounds: number[];
    bitmapTexture: Texture;
    noiseTexture: Texture;
    isGlobe: number;
    viewportCenter: number[];
    cullBackside: number;
    viewportGlobeRadius: number;
    minWindSpeed: number;
    ringBufferIndex: number;
};

const uniformBlock = `\
uniform bitmapUniforms {
  float numParticles;
  float maxAge;
  float speedFactor;
  float time;
  float seed;
  vec4 viewportBounds;
  float viewportZoomChangeFactor;
  vec4 bounds;
  vec2 viewportCenter;
  int cullBackside;
  int isGlobe;
  float viewportGlobeRadius;
  float minWindSpeed;
  int ringBufferIndex;
} bitmap;
`;

export const bitmapUniforms = {
    name: 'bitmap',
    vs: uniformBlock,
    uniformTypes: {
        numParticles: 'f32',
        maxAge: 'f32',
        speedFactor: 'f32',
        time: 'f32',
        seed: 'f32',
        viewportBounds: 'vec4<f32>',
        viewportZoomChangeFactor: 'f32',
        bounds: 'vec4<f32>',
        viewportCenter: 'vec2<f32>',
        cullBackside: 'i32',
        isGlobe: 'i32',
        viewportGlobeRadius: 'f32',
        minWindSpeed: 'f32',
        ringBufferIndex: 'i32',
    },
} as const satisfies ShaderModule<UniformProps>;

const positionsCache = new Map<string, any>();
const MAX_CACHE_SIZE = 50; // Increased to support multi-panel setups
const DEFAULT_RADIUS = 6370972;

// Shared noise texture data - computed once, reused by all particle layers
let sharedNoiseData: Float32Array | null = null;
function getSharedNoiseData(): Float32Array {
    if (!sharedNoiseData) {
        const noiseSize = 256;
        sharedNoiseData = new Float32Array(noiseSize * noiseSize * 4);
        for (let i = 0; i < noiseSize * noiseSize; i++) {
            const o = i * 4;
            const x = i % noiseSize;
            const y = Math.floor(i / noiseSize);
            sharedNoiseData[o] = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
            sharedNoiseData[o + 1] = Math.abs(Math.sin(x * 93.9898 + y * 67.345) * 24634.6345) % 1;
            sharedNoiseData[o + 2] = Math.abs(Math.sin(x * 45.164 + y * 23.789) * 65432.1234) % 1;
            sharedNoiseData[o + 3] = Math.abs(Math.sin(x * 78.456 + y * 12.567) * 87654.3456) % 1;
        }
    }
    return sharedNoiseData;
}

// Simple hash function for objects/strings
function simpleHash(obj: any): string {
    let str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    let hash = 0,
        i,
        chr;
    if (str.length === 0) return hash.toString();
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
}

function addToCache(key: string, value: any) {
    if (positionsCache.size >= MAX_CACHE_SIZE) {
        const firstKey = positionsCache.keys().next().value;
        positionsCache.delete(firstKey);
    }
    positionsCache.set(key, value);
}

function isGlobalData(bounds: number[]): boolean {
    if (!bounds || bounds.length !== 4) return false;
    const [west, south, east, north] = bounds;
    const lonSpan = east - west;
    const latSpan = north - south;
    return lonSpan >= 350 && latSpan >= 170;
}

function toRadians(value: number): number {
    return (value / 180) * Math.PI;
}

export function distance(
    start: GeoJSON.Position,
    destination: GeoJSON.Position,
    radius: number = DEFAULT_RADIUS,
): number {
    const R = radius;
    const φ1 = toRadians(start[1]);
    const λ1 = toRadians(start[0]);
    const φ2 = toRadians(destination[1]);
    const λ2 = toRadians(destination[0]);

    const Δφ = φ2 - φ1;
    let Δλ = λ2 - λ1;

    // Handle longitude difference across date line
    if (Math.abs(Δλ) > Math.PI) {
        Δλ = Δλ > 0 ? Δλ - 2 * Math.PI : Δλ + 2 * Math.PI;
    }

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;

    return d;
}

function getViewportBounds(viewport: any): number[] {
    const [west, south, east, north] = viewport.getBounds();
    const lonMargin = (east - west) * 0.2;
    const latMargin = (north - south) * 0.2;

    let adjustedWest = west - lonMargin;
    let adjustedEast = east + lonMargin;
    const adjustedSouth = Math.max(south - latMargin, -90);
    const adjustedNorth = Math.min(north + latMargin, 90);

    // Handle date line crossing
    if (adjustedEast - adjustedWest > 360) {
        // If the span is greater than 360°, just use global bounds
        return [-180, adjustedSouth, 180, adjustedNorth];
    }

    // Normalize longitudes to [-180, 180] range
    adjustedWest = ((adjustedWest + 180) % 360) - 180;
    adjustedEast = ((adjustedEast + 180) % 360) - 180;
    // Normalize longitudes to [-180, 180] range (handle negative modulo correctly)
    //adjustedWest = ((((adjustedWest + 180) % 360) + 360) % 360) - 180;
    //adjustedEast = ((((adjustedEast + 180) % 360) + 360) % 360) - 180;

    return [adjustedWest, adjustedSouth, adjustedEast, adjustedNorth];
}

export function getViewportGlobeRadius(viewport: GlobeViewport): number {
    const viewportGlobeCenter = [viewport.longitude, viewport.latitude];

    const distances = [
        distance(viewportGlobeCenter, viewport.unproject([viewport.width / 2, 0])),
        distance(viewportGlobeCenter, viewport.unproject([0, viewport.height / 2])),
    ];

    if (viewport.width > viewport.height) {
        distances.push(
            distance(
                viewportGlobeCenter,
                viewport.unproject([viewport.width / 4, viewport.height / 2]),
            ),
            distance(
                viewportGlobeCenter,
                viewport.unproject([(viewport.width * 3) / 4, viewport.height / 2]),
            ),
            distance(
                viewportGlobeCenter,
                viewport.unproject([viewport.width, viewport.height / 2]),
            ),
        );
    } else {
        distances.push(
            distance(
                viewportGlobeCenter,
                viewport.unproject([viewport.width / 2, viewport.height / 4]),
            ),
            distance(
                viewportGlobeCenter,
                viewport.unproject([viewport.width / 2, (viewport.height * 3) / 4]),
            ),
            distance(
                viewportGlobeCenter,
                viewport.unproject([viewport.width / 2, viewport.height]),
            ),
        );
    }
    const viewportGlobeRadius = Math.max(...distances);
    return viewportGlobeRadius;
}

const DEFAULT_COLOR: [number, number, number, number] = [255, 255, 255, 255];

export type Bbox = [number, number, number, number];

export type ParticleLayerProps<D = unknown> = LineLayerProps<D> & {
    image: string | Texture | null;
    bounds: number[];
    numParticles: number;
    maxAge: number;
    speedFactor: number;
    color: Color;
    width: number;
    animate?: boolean;
    wrapLongitude: boolean;
    dataDir?: any;
    dataMag?: any;
    projection?: any;
    trailLength?: number;
    fadeTrails?: boolean;
};

const defaultProps: DefaultProps<ParticleLayerProps> = {
    ...LineLayer.defaultProps,

    image: { type: 'image', value: null, async: true },

    numParticles: { type: 'number', min: 1, max: 100000, value: 10000 },
    maxAge: { type: 'number', min: 1, max: 255, value: 50 },
    speedFactor: { type: 'number', min: 0, max: 255, value: 3 },

    color: { type: 'color', value: DEFAULT_COLOR },
    width: { type: 'number', value: 1.2 },
    animate: { type: 'boolean', value: true },

    bounds: { type: 'array', value: null, compare: true, optional: true },
    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
    fp64: false,
    wrapLongitude: true,

    trailLength: { type: 'number', min: 2, max: 100, value: 22 },
    fadeTrails: { type: 'boolean', value: true },

    particleJitter: { type: 'number', min: 0, max: 1, value: 0.7 },
    speedVariation: { type: 'number', min: 0, max: 1, value: 0.1 },
    turbulenceStrength: { type: 'number', min: 0, max: 1, value: 0.1 },

    parameters: { depthCompare: 'always', depthWriteEnabled: true, cullMode: 'none' },
};

export default class ParticleLayer<D = any, ExtraPropsT = ParticleLayerProps<D>> extends LineLayer<
    D,
    ExtraPropsT & ParticleLayerProps<D>
> {
    private boundsCache: { key: string; bounds: number[] } | null = null;

    state!: {
        model?: Model;

        initialized: boolean;
        numInstances: number;
        numAgedInstances: number;
        numTrailSegments: number;

        sourcePositions: Buffer;
        targetPositions: Buffer;

        colors: Buffer;

        transform: BufferTransform;
        texture: Texture;
        noiseTexture: Texture; // Pre-computed noise for hash lookups

        previousViewportZoom: number;
        previousTime: number;

        stepRequested: boolean;
        bounds: number[];
        trailLines: any[];
        isGlobalData: boolean;

        needsAttributeBind: boolean;
        uniformHolder: { bitmap?: any } | null;
        zeroPositions?: Float32Array;
        ringBufferIndex: number; // Current write slot for ring buffer
    };

    private _sourcePositions64Low = new Float32Array([0, 0, 0]);
    private _targetPositions64Low = new Float32Array([0, 0, 0]);
    private _pickingColors = new Float32Array([0, 0, 0]);
    private _widths = new Float32Array([1]);

    getShaders() {
        const oldShaders = super.getShaders();
        const { numParticles, trailLength = 22, maxAge } = this.props;
        const effectiveTrailLength = Math.min(trailLength, maxAge);

        return {
            ...oldShaders,
            inject: {
                'vs:#decl': `
          out float drop;
          out float trailAge;
          out float particleVariation;
          const vec2 DROP_POSITION = vec2(0);

          float hash(float n) {
            return fract(sin(n) * 43758.5453123);
          }
        `,
                'vs:#main-start': `
          // Check for dropped particles (at origin) or invalid segments
          bool isDropped = (length(instanceSourcePositions.xy) < 0.001) ||
                          (length(instanceTargetPositions.xy) < 0.001);

          // Check for unreasonably long segments (data edge artifacts)
          // Handle dateline wraparound: if longitude difference > 180, wrap it
          vec2 diff = instanceTargetPositions.xy - instanceSourcePositions.xy;
          if (abs(diff.x) > 180.0) {
            diff.x = diff.x > 0.0 ? diff.x - 360.0 : diff.x + 360.0;
          }
          float segmentLength = length(diff);
          bool isTooLong = segmentLength > 5.0; // More than 5 degrees is invalid

          drop = float(isDropped || isTooLong);

          // For instanced rendering: gl_InstanceID gives us which trail segment
          // instances 0..numParticles-1 = age 0 segments (connecting age 0 to age 1)
          // instances numParticles..2*numParticles-1 = age 1 segments, etc.
          float particleIndex = mod(float(gl_InstanceID), ${numParticles}.0);
          float ageIndex = floor(float(gl_InstanceID) / ${numParticles}.0);
          trailAge = ageIndex / ${Math.max(1, effectiveTrailLength - 1)}.0;

          particleVariation = hash(particleIndex);
        `,
                'fs:#decl': `
          in float drop;
          in float trailAge;
          in float particleVariation;
        `,
                'fs:#main-end': `
          if (drop > 0.5) discard;

          ${
              this.props.fadeTrails
                  ? `
          // Age-based fade: head (trailAge=0) is opaque, tail (trailAge=1) fades out
          float fadeVariation = 0.8 + particleVariation * 0.4;
          float trailFade = 1.0 - smoothstep(0.0, fadeVariation, trailAge);
          fragColor.a = trailFade * trailFade;
          `
                  : ''
          }
        `,
            },
        };
    }

    shouldResetParticles(viewport, previousViewport) {
        if (!previousViewport) return false;
        const zoomDiff = Math.abs(viewport.zoom - previousViewport.zoom);
        const isGlobe = viewport.projection?.mode === 'globe';
        return !isGlobe && zoomDiff > 3;
    }

    // Override to return trail segment count (not full age buffer)
    getNumInstances(): number {
        if (this.state?.numTrailSegments) {
            return this.state.numTrailSegments;
        }
        // Fallback before state is initialized
        const { numParticles, trailLength = 22, maxAge } = this.props;
        const effectiveTrailLength = Math.min(trailLength, maxAge);
        return numParticles * (effectiveTrailLength - 1);
    }

    initializeState() {
        super.initializeState();

        const attributeManager = this.getAttributeManager();
        attributeManager!.remove([
            'instanceSourcePositions',
            'instanceTargetPositions',
            'instanceColors',
            'instanceWidths',
        ]);

        attributeManager!.addInstanced({
            instanceSourcePositions: { size: 3, type: 'float32', noAlloc: true },
            instanceTargetPositions: { size: 3, type: 'float32', noAlloc: true },
            instanceColors: {
                size: 4,
                type: 'uint8',
                // @ts-ignore
                normalized: true,
                noAlloc: true,
                defaultValue: [...this.props.color.map((c) => c / 255)],
            },
        });

        this._setupState();
    }

    _createTrailLines() {
        const { numParticles, maxAge, trailLength } = this.props;
        const effectiveTrailLength = Math.min(trailLength, maxAge);
        const trailLines = [];

        for (let particleId = 0; particleId < numParticles; particleId++) {
            for (let age = 0; age < effectiveTrailLength - 1; age++) {
                const sourceIndex = particleId + age * numParticles;
                const targetIndex = particleId + (age + 1) * numParticles;

                trailLines.push({
                    sourcePosition: [0, 0, 0],
                    targetPosition: [0, 0, 0],
                    sourceIndex,
                    targetIndex,
                    age,
                    particleId,
                });
            }
        }

        return trailLines;
    }

    _getDataFingerprint(dataDir: any, dataMag: any): string {
        // Create a fingerprint by hashing sampled values from both arrays
        // Samples start, middle, end to detect changes without expensive full-array hashing
        const sampleArray = (arr: any) => {
            if (!arr?.length) return '0';
            const len = arr.length;
            return `${len}-${arr[0]}-${arr[Math.floor(len / 2)]}-${arr[len - 1]}`;
        };

        const sample = `${sampleArray(dataDir)}|${sampleArray(dataMag)}`;
        let hash = 0;
        for (let i = 0; i < sample.length; i++) {
            hash = (hash << 5) - hash + sample.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString();
    }

    _createWindTexture() {
        const { projection, dataDir, dataMag } = this.props;
        const { lonlatGrid } = projection;

        // Include data fingerprint in cache key to distinguish different datasets with same grid
        const dataFingerprint = this._getDataFingerprint(dataDir, dataMag);
        const key = `${lonlatGrid[0][0]}-${lonlatGrid[0][1]}-${lonlatGrid[1][0]}-${lonlatGrid[1][1]}-${dataFingerprint}`;
        const textureKey = `${key}-texture`;
        const cachedTexture = positionsCache.get(textureKey);

        if (cachedTexture?.texture) {
            return cachedTexture.texture as Texture;
        }

        const bounds = this._getBoundsFromGrid(lonlatGrid);
        const { minLng, minLat, maxLng, maxLat } = bounds;
        const width = lonlatGrid[0].length;
        const height = lonlatGrid.length;

        const dlon = (maxLng - minLng) / width;
        const dlat = (maxLat - minLat) / height;

        const scratchKey = `scratch-${width}x${height}`;
        let uvData: Float32Array =
            positionsCache.get(scratchKey)?.uvData || new Float32Array(width * height * 4);
        if (!positionsCache.has(scratchKey)) {
            addToCache(scratchKey, { uvData });
        }

        let ptr = 0;
        const interpolate = false;
        const noiseScale = 0.02;

        const globalData = isGlobalData([minLng, minLat, maxLng, maxLat]);

        const texNoise = (x: number, y: number) =>
            (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;

        for (let j = 0; j < height; j++) {
            const lat = maxLat - j * dlat;
            for (let i = 0; i < width; i++) {
                const lon = minLng + i * dlon;

                const wdirection = gUtilities.getreadoutvalue(
                    lat,
                    lon,
                    projection,
                    dataDir,
                    '°',
                    interpolate,
                    dataMag,
                );
                const wmagnitude = gUtilities.getreadoutvalue(
                    lat,
                    lon,
                    projection,
                    dataMag,
                    'mph',
                    interpolate,
                    dataDir,
                );

                let uv = gUtilities.DirectionToUV(wdirection, wmagnitude);
                if (isNaN(wmagnitude)) uv = [0, 0];

                uv[0] += (texNoise(i * 0.1, j * 0.1) - 0.5) * noiseScale;
                uv[1] += (texNoise(i * 0.1 + 100, j * 0.1 + 100) - 0.5) * noiseScale;

                uvData[ptr++] = uv[0];
                uvData[ptr++] = uv[1];
                uvData[ptr++] = 0;
                uvData[ptr++] = wmagnitude >= 0 && !isNaN(wmagnitude) ? 1 : 0;
            }
        }

        const texture = this.context.device.createTexture({
            width,
            height,
            data: uvData,
            format: 'rgba32float',
            mipmaps: false,
            sampler: {
                minFilter: 'linear',
                magFilter: 'linear',
                addressModeU: globalData ? 'repeat' : 'clamp-to-edge',
                addressModeV: 'clamp-to-edge',
            },
        });

        addToCache(textureKey, { texture });
        return texture;
    }

    _getBoundsFromGrid(lonlatGrid: any) {
        // Only cache bounds by grid, not by dataDir/dataMag
        const key = `${lonlatGrid[0][0]}-${lonlatGrid[0][1]}-${lonlatGrid[1][0]}-${lonlatGrid[1][1]}`;
        const cached = positionsCache.get(key);
        if (cached?.bounds) return cached.bounds;

        let maxLng = -Infinity,
            minLng = Infinity,
            maxLat = -Infinity,
            minLat = Infinity;

        for (const row of lonlatGrid) {
            for (const pair of row) {
                const [longitude, latitude] = pair;
                if (longitude > maxLng) maxLng = longitude;
                if (longitude < minLng) minLng = longitude;
                if (latitude > maxLat) maxLat = latitude;
                if (latitude < minLat) minLat = latitude;
            }
        }

        const bounds = { maxLng, minLng, maxLat, minLat };
        addToCache(key, { bounds });
        return bounds;
    }

    _setupState() {
        const { projection } = this.props;
        const { minLng, minLat, maxLng, maxLat } = this._getBoundsFromGrid(projection.lonlatGrid);

        let calculatedBounds = [minLng, minLat, maxLng, maxLat];

        if (isNaN(minLng) || isNaN(maxLng) || isNaN(minLat) || isNaN(maxLat)) {
            calculatedBounds = [-180, -90, 180, 90];
        }

        const globalData = isGlobalData(calculatedBounds);

        this.setState({
            bounds: calculatedBounds,
            trailLines: this._createTrailLines(),
            isGlobalData: globalData,
        });

        this._setupTransformFeedback();
    }

    updateState(params: UpdateParameters<this>) {
        super.updateState(params);
        const { props, oldProps } = params;

        // Check if color changed (only after initialization to avoid spurious rebuilds)
        const colorChanged =
            this.state.initialized &&
            oldProps.color &&
            (props.color[0] !== oldProps.color[0] ||
                props.color[1] !== oldProps.color[1] ||
                props.color[2] !== oldProps.color[2] ||
                props.color[3] !== oldProps.color[3]);

        // Structure changes require full buffer recreation
        const structureChanged =
            props.numParticles !== oldProps.numParticles ||
            props.maxAge !== oldProps.maxAge ||
            props.width !== oldProps.width ||
            props.trailLength !== oldProps.trailLength ||
            colorChanged;

        // Data changes only need texture update - preserve particle positions!
        const dataChanged =
            props.image !== oldProps.image ||
            props.dataDir !== oldProps.dataDir ||
            props.dataMag !== oldProps.dataMag;

        if (structureChanged) {
            this._setupState();
        } else if (dataChanged && this.state.initialized) {
            this._updateWindTexture();
        }
    }

    finalizeState(context: LayerContext) {
        this._deleteTransformFeedback();
        super.finalizeState(context);
    }

    _updateWindTexture() {
        const { projection, dataDir, dataMag } = this.props;
        const { lonlatGrid } = projection;

        const { minLng, minLat, maxLng, maxLat } = this._getBoundsFromGrid(lonlatGrid);
        let calculatedBounds = [minLng, minLat, maxLng, maxLat];
        if (isNaN(minLng) || isNaN(maxLng) || isNaN(minLat) || isNaN(maxLat)) {
            calculatedBounds = [-180, -90, 180, 90];
        }
        const globalData = isGlobalData(calculatedBounds);

        // Clear the cached texture so _createWindTexture builds a fresh one with new data
        const dataFingerprint = this._getDataFingerprint(dataDir, dataMag);
        const cacheKey = `${lonlatGrid[0][0]}-${lonlatGrid[0][1]}-${lonlatGrid[1][0]}-${lonlatGrid[1][1]}-${dataFingerprint}`;
        const textureKey = `${cacheKey}-texture`;
        const cachedEntry = positionsCache.get(textureKey);
        if (cachedEntry?.texture) {
            cachedEntry.texture.destroy();
            positionsCache.delete(textureKey);
        }

        const oldTexture = this.state.texture;
        if (oldTexture && oldTexture !== this.props.image && oldTexture !== cachedEntry?.texture) {
            oldTexture.destroy();
        }

        // Create new wind texture from updated data
        const newTexture = this.props.image || this._createWindTexture();
        if (newTexture && typeof newTexture !== 'string') {
            this.setState({
                texture: newTexture,
                bounds: calculatedBounds,
                isGlobalData: globalData,
            });
        }
    }

    _getEffectiveBounds() {
        const cacheKey = this.props.bounds?.join('-') || 'state';
        if (this.boundsCache?.key === cacheKey) {
            return this.boundsCache.bounds;
        }

        let bounds: number[];
        if (this.state?.bounds) {
            bounds = this.state.bounds;
        } else if (this.props.bounds && this.props.bounds.length === 4) {
            bounds = this.props.bounds;
        } else {
            bounds = [-180, -90, 180, 90];
        }

        this.boundsCache = { key: cacheKey, bounds };
        return bounds;
    }

    private _lastStepFrame = -1;

    draw({ uniforms }: { uniforms: any }) {
        if (!this.state.initialized) return;

        const { model, sourcePositions, targetPositions, colors, needsAttributeBind } = this.state;

        // Verify buffers exist before drawing (prevents errors during layer transitions)
        if (!sourcePositions || !targetPositions || !colors) return;

        // Only step once per frame (prevents multiple updates in multi-panel setups)
        const currentFrame = Math.floor(performance.now());
        if (this.props.animate && currentFrame !== this._lastStepFrame) {
            this._lastStepFrame = currentFrame;
            this.step();
        }

        if (model && needsAttributeBind) {
            if (this._widths[0] !== this.props.width) {
                this._widths[0] = this.props.width;
            }

            // Trail segments connect consecutive ages:
            // - sourcePositions contains: [age0, age1, age2, ...]
            // - targetPositions contains: [age1, age2, age3, ...] (copied in _runTransformFeedback)
            // This creates line segments: age0→age1, age1→age2, etc.
            model.setAttributes?.({
                instanceSourcePositions: sourcePositions,
                instanceTargetPositions: targetPositions,
                instanceColors: colors,
            });
            model.setConstantAttributes?.({
                instanceSourcePositions64Low: this._sourcePositions64Low,
                instanceTargetPositions64Low: this._targetPositions64Low,
                instancePickingColors: this._pickingColors,
                instanceWidths: this._widths,
            });

            this.state.needsAttributeBind = false;
        }

        super.draw({ uniforms });
    }

    _setupTransformFeedback() {
        if (this.state.initialized) {
            this._deleteTransformFeedback();
        }

        const { numParticles, color, maxAge, width, trailLength = 22, fadeTrails } = this.props;

        const texture = this.props.image || this._createWindTexture();
        if (!texture || typeof texture === 'string') {
            return;
        }

        const numInstances = numParticles * maxAge;
        const numAgedInstances = numParticles * (maxAge - 1);
        const effectiveTrailLength = Math.min(trailLength, maxAge);
        const numTrailSegments = numParticles * (effectiveTrailLength - 1);

        const sourcePositions = this.context.device.createBuffer(
            new Float32Array(numInstances * 3),
        );
        const targetPositions = this.context.device.createBuffer(
            new Float32Array(numInstances * 3),
        );

        // Create offset buffer for target positions - starts at age 1 (one row offset)
        // This allows trail segments to connect age N to age N+1 from the same buffer
        const targetPositionsOffset = this.context.device.createBuffer({
            byteLength: (numInstances - numParticles) * 3 * 4,
        });

        // Create noise texture using shared data (computed once, reused by all layers)
        const noiseSize = 256;
        const noiseTexture = this.context.device.createTexture({
            width: noiseSize,
            height: noiseSize,
            data: getSharedNoiseData(),
            format: 'rgba32float',
            mipmaps: false,
            sampler: {
                minFilter: 'linear',
                magFilter: 'linear',
                addressModeU: 'repeat',
                addressModeV: 'repeat',
            },
        });

        // Create color buffer with uniform alpha - the shader handles age-based fading
        const colorsArr = new Uint8Array(numInstances * 4);
        const r = color[0] as number;
        const g = color[1] as number;
        const b = color[2] as number;
        const baseAlpha = (color[3] ?? 255) as number;
        for (let i = 0; i < numInstances; i++) {
            const o = i * 4;
            colorsArr[o] = r;
            colorsArr[o + 1] = g;
            colorsArr[o + 2] = b;
            colorsArr[o + 3] = baseAlpha; // Uniform alpha, shader applies age fade
        }
        const colorBuffer = this.context.device.createBuffer({ data: colorsArr });

        const transform = new BufferTransform(this.context.device, {
            attributes: { sourcePosition: sourcePositions },
            bufferLayout: [{ name: 'sourcePosition', format: 'float32x3' }],
            feedbackBuffers: { targetPosition: targetPositions },
            vs: shader,
            varyings: ['targetPosition'],
            modules: [bitmapUniforms],
            vertexCount: numParticles,
        });

        const zeroPositions = new Float32Array(numInstances * 3);

        this.setState({
            initialized: true,
            numInstances,
            numAgedInstances,
            numTrailSegments,
            sourcePositions,
            targetPositions,
            colors: colorBuffer,
            transform,
            texture,
            noiseTexture,
            previousViewportZoom: 0,
            previousTime: 0,
            needsAttributeBind: true,
            uniformHolder: { bitmap: {} },
            zeroPositions,
            ringBufferIndex: 0,
        });

        // Bind attributes immediately to avoid "no buffer bound" error on first draw
        const { model } = this.state;
        if (model) {
            model.setAttributes?.({
                instanceSourcePositions: sourcePositions,
                instanceTargetPositions: targetPositions,
                instanceColors: colorBuffer,
            });
            model.setConstantAttributes?.({
                instanceSourcePositions64Low: this._sourcePositions64Low,
                instanceTargetPositions64Low: this._targetPositions64Low,
                instancePickingColors: this._pickingColors,
                instanceWidths: this._widths,
            });
        }
    }

    _runTransformFeedback() {
        if (!this.state.initialized) return;

        const { transform, sourcePositions, targetPositions, texture, noiseTexture } = this.state;
        // Verify resources exist before running transform
        if (!transform || !sourcePositions || !targetPositions || !texture || !noiseTexture) return;

        const { viewport, timeline } = this.context as any;
        const { numParticles, speedFactor, maxAge } = this.props;
        const { previousTime, previousViewportZoom, numAgedInstances, ringBufferIndex } =
            this.state;

        // Use performance.now() instead of timeline.getTime() for continuous animation
        // timeline.getTime() only advances when deck.gl animations are active
        const currentTime = performance.now();

        if (currentTime === previousTime) return;

        const isGlobe = viewport?.projection?.mode === 'globe' ? 1 : 0;
        const bounds = this._getEffectiveBounds();

        let viewportCenter: [number, number];
        let viewportZoomChangeFactor: number;
        let cullBackside = 0;

        const lng = viewport?.longitude ?? 0;
        const lat = viewport?.latitude ?? 0;

        // Proper modulo handling for negative numbers
        const normalizedLng = ((((lng + 180) % 360) + 360) % 360) - 180;
        viewportCenter = [normalizedLng, lat];

        const viewportGlobeRadius = getViewportGlobeRadius(viewport);
        const viewportBounds = getViewportBounds(viewport);

        viewportZoomChangeFactor = Math.max(
            1.0,
            Math.pow(2, (previousViewportZoom - viewport.zoom) * 1.5),
        );

        cullBackside = isGlobe > 0 ? 1 : 0;

        const speedVariation = 0.95 + 0.1 * Math.sin(currentTime * 0.001);

        let currentSpeedFactor: number;
        if (isGlobe > 0) {
            currentSpeedFactor = (speedFactor * speedVariation ** viewport.scale) / 90000;
        } else {
            currentSpeedFactor = (speedFactor * speedVariation) / Math.pow(2, viewport.zoom + 7);
        }

        const seed = Math.sin(currentTime * 0.0001) * 999 + Math.cos(currentTime * 0.00013) * 777;

        const u = (this.state.uniformHolder!.bitmap ||= {});
        u.bitmapTexture = texture;
        u.noiseTexture = noiseTexture;
        u.viewportBounds = viewportBounds;
        u.viewportZoomChangeFactor = viewportZoomChangeFactor;
        u.bounds = bounds;
        u.viewportCenter = viewportCenter;
        u.cullBackside = cullBackside;
        u.numParticles = numParticles;
        u.maxAge = maxAge;
        u.speedFactor = currentSpeedFactor;
        u.time = currentTime;
        u.seed = Math.abs(seed);
        u.isGlobe = isGlobe;
        u.viewportGlobeRadius = viewportGlobeRadius;
        u.minWindSpeed = 1.5; // 3 knots ≈ 1.54 m/s, drop particles in calm areas
        u.ringBufferIndex = ringBufferIndex;

        if (!transform?.model) return;

        try {
            transform.model.shaderInputs?.setProps?.({ bitmap: u });

            transform.run({
                clearColor: false,
                clearDepth: false,
                clearStencil: false,
                depthReadOnly: true,
                stencilReadOnly: true,
            });
        } catch (e) {
            console.warn('ParticleLayer transform error:', e);
            return;
        }

        try {
            // Shift aged positions down by one "age row"
            const encoder = this.context.device.createCommandEncoder();
            encoder.copyBufferToBuffer({
                sourceBuffer: sourcePositions,
                sourceOffset: 0,
                destinationBuffer: targetPositions,
                destinationOffset: numParticles * 4 * 3,
                size: numAgedInstances * 4 * 3,
            });
            encoder.finish();
            encoder.destroy();

            // Swap
            this.state.sourcePositions = targetPositions;
            this.state.targetPositions = sourcePositions;
            transform.model.setAttributes({ sourcePosition: targetPositions });
            transform.transformFeedback.setBuffers({ targetPosition: sourcePositions });

            // After swap, sourcePositions (was targetPositions) contains: [age0, age1, age2, ...]
            // For trail rendering, we need targetPositions to contain: [age1, age2, age3, ...]
            // Copy age-1-and-later from sourcePositions into targetPositions at offset 0
            const { numTrailSegments } = this.state;
            const encoder2 = this.context.device.createCommandEncoder();
            encoder2.copyBufferToBuffer({
                sourceBuffer: this.state.sourcePositions,
                sourceOffset: numParticles * 3 * 4, // Start at age 1
                destinationBuffer: this.state.targetPositions,
                destinationOffset: 0,
                size: numTrailSegments * 3 * 4, // Copy enough for trail segments
            });
            encoder2.finish();
            encoder2.destroy();
        } catch (e) {
            console.warn('ParticleLayer buffer copy error:', e);
            return;
        }

        // Mark bindings dirty for draw()
        this.state.needsAttributeBind = true;

        this.state.previousViewportZoom = viewport.zoom;
        this.state.previousTime = currentTime;
    }

    _resetTransformFeedback() {
        if (!this.state.initialized) return;
        const { sourcePositions, targetPositions, zeroPositions } = this.state;
        if (zeroPositions) {
            sourcePositions.write(zeroPositions);
            targetPositions.write(zeroPositions);
            this.state.needsAttributeBind = true;
        }
    }

    _deleteTransformFeedback() {
        if (!this.state.initialized) return;

        // Clear initialized first to prevent draw() from using deleted resources
        this.setState({ initialized: false });

        const { sourcePositions, targetPositions, colors, transform, texture, noiseTexture } =
            this.state;
        sourcePositions?.destroy();
        targetPositions?.destroy();
        colors?.destroy();
        transform?.destroy();
        noiseTexture?.destroy();

        if (texture && texture !== this.props.image) {
            // Only destroy texture if it's NOT in the cache (other layers may be using it)
            let isInCache = false;
            for (const [key, value] of positionsCache.entries()) {
                if (value.texture === texture) {
                    isInCache = true;
                    break;
                }
            }
            if (!isInCache) {
                texture.destroy();
            }
        }

        // Clear references to destroyed resources (but NOT model - it's managed by parent LineLayer)
        this.setState({
            sourcePositions: null,
            targetPositions: null,
            colors: null,
            transform: null,
            noiseTexture: null,
        });
    }

    step() {
        this._runTransformFeedback();
        this.setNeedsRedraw();
    }

    clear() {
        this._resetTransformFeedback();
        this.setNeedsRedraw();
    }
}

ParticleLayer.layerName = 'ParticleLayer';
ParticleLayer.defaultProps = defaultProps;
