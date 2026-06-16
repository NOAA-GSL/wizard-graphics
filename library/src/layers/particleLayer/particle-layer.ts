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
import earcut from 'earcut';
import shader from './particle-layer-update-transform.vs.glsl.js';

type LonLatPoint = [number, number];
type GridShape = [number, number];

type ResolvedGrid = {
    points: LonLatPoint[];
    rows: number;
    cols: number;
    gridKey: string;
};

type TriangleIndices = [number, number, number];

type GlobeViewportLike = {
    longitude: number;
    latitude: number;
    width: number;
    height: number;
    unproject: (coords: [number, number]) => GeoJSON.Position;
};

export type UniformProps = {
    numParticles: number;
    maxAge: number;
    speedFactor: number;
    time: number;
    seed: number;
    viewportBounds: [number, number, number, number];
    viewportZoomChangeFactor: number;
    bounds: [number, number, number, number];
    bitmapTexture: Texture;
    noiseTexture: Texture;
    isGlobe: number;
    viewportCenter: [number, number];
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
        if (firstKey) {
            positionsCache.delete(firstKey);
        }
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

function directionToUV(direction: number, magnitude: number): [number, number] {
    const rad = (direction * Math.PI) / 180;
    return [-magnitude * Math.sin(rad), -magnitude * Math.cos(rad)];
}

function normalizeLonDelta(fromLon: number, toLon: number): number {
    let delta = toLon - fromLon;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return delta;
}

function clamp(value: number, minValue: number, maxValue: number): number {
    return Math.min(maxValue, Math.max(minValue, value));
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

export function getViewportGlobeRadius(viewport: GlobeViewportLike): number {
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
    bounds?: Bbox;
    numParticles: number;
    maxAge: number;
    speedFactor: number;
    color: Color;
    width: number;
    animate?: boolean;
    wrapLongitude: boolean;
    dataDir?: ArrayLike<number>;
    dataMag?: ArrayLike<number>;
    lonlatGrid: LonLatPoint[] | LonLatPoint[][];
    shape?: GridShape | null;
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

    bounds: undefined,
    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
    wrapLongitude: true,

    trailLength: { type: 'number', min: 2, max: 100, value: 22 },
    fadeTrails: { type: 'boolean', value: true },

    parameters: { depthCompare: 'always', depthWriteEnabled: true, cullMode: 'none' },
};

export default class ParticleLayer<D = any, ExtraPropsT = ParticleLayerProps<D>> extends LineLayer<
    D,
    ExtraPropsT & ParticleLayerProps<D>
> {
    private boundsCache: { key: string; bounds: number[] } | null = null;

    declare state: {
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
          bool isTooLong = segmentLength > 20.0; // Keep tails while filtering obvious artifacts

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
          fragColor.a = max(0.35, trailFade * trailFade);
          `
                  : ''
          }
        `,
            },
        };
    }

    shouldResetParticles(viewport: any, previousViewport: any) {
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

    _toLonLatPoint(value: any): LonLatPoint {
        if (!Array.isArray(value) || value.length < 2) return [NaN, NaN];
        return [Number(value[0]), Number(value[1])];
    }

    _getGridCacheKey(points: LonLatPoint[], rows: number, cols: number): string {
        if (!points.length) return `${rows}x${cols}-empty`;
        const first = points[0];
        const mid = points[Math.floor(points.length / 2)] || first;
        const last = points[points.length - 1] || first;
        return simpleHash(`${rows}x${cols}-${first.join(',')}-${mid.join(',')}-${last.join(',')}`);
    }

    _resolveGrid(): ResolvedGrid | null {
        const lonlatGrid = this.props.lonlatGrid;
        if (!Array.isArray(lonlatGrid) || lonlatGrid.length === 0) {
            return null;
        }

        const first = lonlatGrid[0] as any;
        const hasNestedRows =
            Array.isArray(first) && first.length > 0 && Array.isArray((first as any[])[0]);

        let points: LonLatPoint[] = [];
        let rows = 0;
        let cols = 0;

        if (hasNestedRows) {
            rows = lonlatGrid.length;
            cols = Array.isArray(lonlatGrid[0]) ? (lonlatGrid[0] as any[]).length : 0;
            if (rows <= 0 || cols <= 0) return null;

            points = new Array(rows * cols);
            let ptr = 0;
            for (let r = 0; r < rows; r++) {
                const row = lonlatGrid[r] as any[];
                if (!Array.isArray(row) || row.length < cols) return null;
                for (let c = 0; c < cols; c++) {
                    points[ptr++] = this._toLonLatPoint(row[c]);
                }
            }
        } else {
            points = (lonlatGrid as any[]).map((point) => this._toLonLatPoint(point));

            if (
                Array.isArray(this.props.shape) &&
                Number.isFinite(this.props.shape[0]) &&
                Number.isFinite(this.props.shape[1])
            ) {
                rows = Math.max(1, Math.floor(this.props.shape[0]));
                cols = Math.max(1, Math.floor(this.props.shape[1]));
            } else {
                rows = 1;
                cols = points.length;
            }

            const expectedLength = rows * cols;
            if (expectedLength <= 0 || points.length < expectedLength) return null;
            if (points.length !== expectedLength) {
                points = points.slice(0, expectedLength);
            }
        }

        return {
            points,
            rows,
            cols,
            gridKey: this._getGridCacheKey(points, rows, cols),
        };
    }

    _isFinitePoint(point: LonLatPoint | undefined): boolean {
        return (
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(point[0]) &&
            Number.isFinite(point[1])
        );
    }

    _adjustLonForBounds(lon: number, minLng: number, maxLng: number): number {
        if (!Number.isFinite(lon)) return lon;
        if (maxLng > 180 && lon < 0) {
            return lon + 360;
        }
        if (minLng < -180 && lon > 180) {
            return lon - 360;
        }
        return lon;
    }

    _buildMeshTriangles(grid: ResolvedGrid): TriangleIndices[] {
        const cacheKey = `${grid.gridKey}-triangles`;
        const cached = positionsCache.get(cacheKey);
        if (cached?.triangles) {
            return cached.triangles as TriangleIndices[];
        }

        const { points, rows, cols } = grid;
        const triangles: TriangleIndices[] = [];

        if (rows > 1 && cols > 1) {
            for (let r = 0; r < rows - 1; r++) {
                for (let c = 0; c < cols - 1; c++) {
                    const i00 = r * cols + c;
                    const i10 = i00 + 1;
                    const i01 = (r + 1) * cols + c;
                    const i11 = i01 + 1;

                    if (
                        !this._isFinitePoint(points[i00]) ||
                        !this._isFinitePoint(points[i10]) ||
                        !this._isFinitePoint(points[i01]) ||
                        !this._isFinitePoint(points[i11])
                    ) {
                        continue;
                    }

                    const p00 = points[i00];
                    const p10 = points[i10];
                    const p01 = points[i01];
                    const p11 = points[i11];

                    const topLonStep = Math.abs(normalizeLonDelta(p00[0], p10[0]));
                    const bottomLonStep = Math.abs(normalizeLonDelta(p01[0], p11[0]));
                    if (topLonStep > 120 || bottomLonStep > 120) {
                        continue;
                    }

                    triangles.push([i00, i10, i01]);
                    triangles.push([i10, i11, i01]);
                }
            }
        } else if (points.length >= 3) {
            const flatPolygon: number[] = [];
            let hasInvalidPoint = false;
            for (const point of points) {
                if (!this._isFinitePoint(point)) {
                    hasInvalidPoint = true;
                    break;
                }
                flatPolygon.push(point[0], point[1]);
            }

            if (!hasInvalidPoint) {
                const earcutIndices = earcut(flatPolygon);
                for (let i = 0; i + 2 < earcutIndices.length; i += 3) {
                    triangles.push([
                        earcutIndices[i],
                        earcutIndices[i + 1],
                        earcutIndices[i + 2],
                    ]);
                }
            }
        }

        addToCache(cacheKey, { triangles });
        return triangles;
    }

    _getWindTextureSize(
        rows: number,
        cols: number,
        pointCount: number,
        lonSpan: number,
        latSpan: number,
    ): { width: number; height: number } {
        if (rows > 1 && cols > 1) {
            return {
                width: clamp(Math.round(cols), 64, 2048),
                height: clamp(Math.round(rows), 64, 2048),
            };
        }

        const base = clamp(Math.round(Math.sqrt(Math.max(1, pointCount)) * 8), 64, 1024);
        const aspect = lonSpan > 0 && latSpan > 0 ? lonSpan / latSpan : 1;
        const width = clamp(Math.round(base * Math.sqrt(aspect)), 64, 2048);
        const height = clamp(Math.round(base / Math.sqrt(aspect)), 64, 2048);
        return { width, height };
    }

    _createTrailLines() {
        const { numParticles, maxAge = 50, trailLength = 22 } = this.props;
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
        const { dataDir, dataMag } = this.props;
        const grid = this._resolveGrid();
        if (!grid) {
            return null;
        }

        const { points, rows, cols, gridKey } = grid;

        // Include data fingerprint in cache key to distinguish different datasets with same grid
        const dataFingerprint = this._getDataFingerprint(dataDir, dataMag);
        const textureKey = `${gridKey}-${dataFingerprint}-texture`;
        const cachedTexture = positionsCache.get(textureKey);

        if (cachedTexture?.texture) {
            return cachedTexture.texture as Texture;
        }

        const bounds = this._getBoundsFromGrid(points, gridKey);
        const { minLng, minLat, maxLng, maxLat } = bounds;
        const lonSpan = Math.max(1e-6, maxLng - minLng);
        const latSpan = Math.max(1e-6, maxLat - minLat);
        const { width, height } = this._getWindTextureSize(
            rows,
            cols,
            points.length,
            lonSpan,
            latSpan,
        );

        const scratchKey = `scratch-${width}x${height}`;
        let uvData: Float32Array =
            positionsCache.get(scratchKey)?.uvData || new Float32Array(width * height * 4);
        if (!positionsCache.has(scratchKey)) {
            addToCache(scratchKey, { uvData });
        }
        uvData.fill(0);

        const noiseScale = 0.02;

        const globalData = isGlobalData([minLng, minLat, maxLng, maxLat]);

        const texNoise = (x: number, y: number) =>
            (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;

        const triangles = this._buildMeshTriangles(grid);

        // Project mesh vertices into texture pixel space and keep per-vertex wind vectors.
        const pointX = new Float32Array(points.length);
        const pointY = new Float32Array(points.length);
        const windU = new Float32Array(points.length);
        const windV = new Float32Array(points.length);
        const pointValid = new Uint8Array(points.length);

        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            if (!this._isFinitePoint(point)) {
                pointX[i] = NaN;
                pointY[i] = NaN;
                continue;
            }

            const lon = this._adjustLonForBounds(point[0], minLng, maxLng);
            const lat = point[1];
            pointX[i] = ((lon - minLng) / lonSpan) * (width - 1);
            pointY[i] = ((maxLat - lat) / latSpan) * (height - 1);

            const wdirection = Number(dataDir?.[i]);
            const wmagnitude = Number(dataMag?.[i]);
            if (Number.isFinite(wdirection) && Number.isFinite(wmagnitude) && wmagnitude >= 0) {
                const [u, v] = directionToUV(wdirection, wmagnitude);
                windU[i] = u;
                windV[i] = v;
                pointValid[i] = 1;
            }
        }

        const baryEpsilon = 1e-4;
        for (let t = 0; t < triangles.length; t++) {
            const [i0, i1, i2] = triangles[t];
            if (!pointValid[i0] || !pointValid[i1] || !pointValid[i2]) {
                continue;
            }

            const x0 = pointX[i0];
            const y0 = pointY[i0];
            const x1 = pointX[i1];
            const y1 = pointY[i1];
            const x2 = pointX[i2];
            const y2 = pointY[i2];

            if (
                !Number.isFinite(x0) ||
                !Number.isFinite(y0) ||
                !Number.isFinite(x1) ||
                !Number.isFinite(y1) ||
                !Number.isFinite(x2) ||
                !Number.isFinite(y2)
            ) {
                continue;
            }

            const denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
            if (!Number.isFinite(denom) || Math.abs(denom) < 1e-8) {
                continue;
            }

            const minX = clamp(Math.floor(Math.min(x0, x1, x2)), 0, width - 1);
            const maxX = clamp(Math.ceil(Math.max(x0, x1, x2)), 0, width - 1);
            const minY = clamp(Math.floor(Math.min(y0, y1, y2)), 0, height - 1);
            const maxY = clamp(Math.ceil(Math.max(y0, y1, y2)), 0, height - 1);

            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    const px = x + 0.5;
                    const py = y + 0.5;

                    const w0 = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / denom;
                    const w1 = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / denom;
                    const w2 = 1 - w0 - w1;

                    if (w0 < -baryEpsilon || w1 < -baryEpsilon || w2 < -baryEpsilon) {
                        continue;
                    }

                    const o = (y * width + x) * 4;
                    uvData[o] = w0 * windU[i0] + w1 * windU[i1] + w2 * windU[i2];
                    uvData[o + 1] = w0 * windV[i0] + w1 * windV[i1] + w2 * windV[i2];
                    uvData[o + 2] = 0;
                    uvData[o + 3] = 1;
                }
            }
        }

        // Add subtle deterministic turbulence only where the mesh has valid data coverage.
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const o = (y * width + x) * 4;
                if (uvData[o + 3] < 0.5) {
                    continue;
                }
                uvData[o] += (texNoise(x * 0.1, y * 0.1) - 0.5) * noiseScale;
                uvData[o + 1] += (texNoise(x * 0.1 + 100, y * 0.1 + 100) - 0.5) * noiseScale;
            }
        }

        const texture = this.context.device.createTexture({
            width,
            height,
            data: uvData,
            format: 'rgba32float',
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

    _getBoundsFromGrid(points: LonLatPoint[], gridKey: string) {
        const cacheKey = `${gridKey}-bounds`;
        const cached = positionsCache.get(cacheKey);
        if (cached?.bounds) return cached.bounds;

        let maxLng = -Infinity,
            minLng = Infinity,
            maxLat = -Infinity,
            minLat = Infinity;

        for (const pair of points) {
            const [longitude, latitude] = pair;
            if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
                continue;
            }
            if (longitude > maxLng) maxLng = longitude;
            if (longitude < minLng) minLng = longitude;
            if (latitude > maxLat) maxLat = latitude;
            if (latitude < minLat) minLat = latitude;
        }

        if (
            !Number.isFinite(minLng) ||
            !Number.isFinite(maxLng) ||
            !Number.isFinite(minLat) ||
            !Number.isFinite(maxLat)
        ) {
            minLng = -180;
            maxLng = 180;
            minLat = -90;
            maxLat = 90;
        }

        const bounds = { maxLng, minLng, maxLat, minLat };
        addToCache(cacheKey, { bounds });
        return bounds;
    }

    _setupState() {
        const grid = this._resolveGrid();
        const { minLng, minLat, maxLng, maxLat } = grid
            ? this._getBoundsFromGrid(grid.points, grid.gridKey)
            : { minLng: -180, minLat: -90, maxLng: 180, maxLat: 90 };

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
            props.dataMag !== oldProps.dataMag ||
            props.lonlatGrid !== oldProps.lonlatGrid ||
            props.shape !== oldProps.shape;

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
        const { dataDir, dataMag } = this.props;
        const grid = this._resolveGrid();
        if (!grid) {
            return;
        }

        const { points, gridKey } = grid;

        const { minLng, minLat, maxLng, maxLat } = this._getBoundsFromGrid(points, gridKey);
        let calculatedBounds = [minLng, minLat, maxLng, maxLat];
        if (isNaN(minLng) || isNaN(maxLng) || isNaN(minLat) || isNaN(maxLat)) {
            calculatedBounds = [-180, -90, 180, 90];
        }
        const globalData = isGlobalData(calculatedBounds);

        // Clear the cached texture so _createWindTexture builds a fresh one with new data
        const dataFingerprint = this._getDataFingerprint(dataDir, dataMag);
        const textureKey = `${gridKey}-${dataFingerprint}-texture`;
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

        const { numParticles, color, maxAge, trailLength = 22 } = this.props;

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

        const { viewport } = this.context as any;
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
        currentSpeedFactor = (speedFactor * speedVariation) / (700 + Math.pow(1.9, viewport.zoom +6));
        

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
            const commandBuffer = encoder.finish();
            this.context.device.submit(commandBuffer);
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
            const commandBuffer2 = encoder2.finish();
            this.context.device.submit(commandBuffer2);
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
