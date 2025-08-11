
import {
  Color,
  DefaultProps,
  LayerContext,
  UpdateParameters,
  COORDINATE_SYSTEM
} from "@deck.gl/core";
import { LineLayer, LineLayerProps } from "@deck.gl/layers";
import { Buffer, Texture } from "@luma.gl/core";
import { Model, BufferTransform } from "@luma.gl/engine";
import { ShaderModule } from "@luma.gl/shadertools";
import gUtilities from "../../utilities/graphicsUtilities";
import shader from "./particle-layer-update-transform.vs.glsl.js";

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
  isGlobe: number;
  viewportCenter: number[];
  cullBackside: number;
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
  float cullBackside;
  int isGlobe;
} bitmap;
`;

export const bitmapUniforms = {
  name: "bitmap",
  vs: uniformBlock,
  uniformTypes: {
    numParticles: "f32",
    maxAge: "f32",
    speedFactor: "f32",
    time: "f32",
    seed: "f32",
    viewportBounds: "vec4<f32>",
    viewportZoomChangeFactor: "f32",
    bounds: "vec4<f32>",
    viewportCenter: "vec2<f32>",
    cullBackside: "f32",
    isGlobe: "i32"
  }
} as const satisfies ShaderModule<UniformProps>;

const positionsCache = new Map<string, any>();
const MAX_CACHE_SIZE = 50;

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

function isPacificCentered(bounds: number[]): boolean {
  if (!bounds || bounds.length !== 4) return false;
  const [west, , east] = bounds;
  return west >= 180 && east > 360;
}

function normalizeDataBounds(bounds: number[]): number[] {
  const [west, south, east, north] = bounds;

  if (isPacificCentered(bounds)) {
    return [west, Math.max(south, -90), east, Math.min(north, 90)];
  }

  return [
    ((west % 360) + 360) % 360 - 180,
    Math.max(south, -90),
    ((east % 360) + 360) % 360 - 180,
    Math.min(north, 90)
  ];
}

function getViewportBounds(viewport: any): number[] {
  if (viewport?.projection?.mode === "globe") {
    return [-180, -90, 180, 90];
  }
  const [west, south, east, north] = viewport.getBounds();
  const lonMargin = (east - west) * 0.2;
  const latMargin = (north - south) * 0.2;
  return [
    west - lonMargin,
    Math.max(south - latMargin, -90),
    east + lonMargin,
    Math.min(north + latMargin, 90)
  ];
}

// ===== Types / props =====
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

  image: { type: "image", value: null, async: true },

  numParticles: { type: "number", min: 1, max: 1000000, value: 10000 },
  maxAge: { type: "number", min: 1, max: 255, value: 82 },
  speedFactor: { type: "number", min: 0, max: 255, value: 3 },

  color: { type: "color", value: DEFAULT_COLOR },
  width: { type: "number", value: 1.2 },
  animate: { type: "boolean", value: true },

  bounds: { type: "array", value: null, compare: true, optional: true },
  coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
  fp64: false,
  wrapLongitude: true,

  trailLength: { type: "number", min: 2, max: 100, value: 30 },
  fadeTrails: { type: "boolean", value: true },

  particleJitter: { type: "number", min: 0, max: 1, value: 0.7 },
  speedVariation: { type: "number", min: 0, max: 1, value: 0.1 },
  turbulenceStrength: { type: "number", min: 0, max: 1, value: 0.1 }
};

export default class ParticleLayer<
  D = any,
  ExtraPropsT = ParticleLayerProps<D>
> extends LineLayer<D, ExtraPropsT & ParticleLayerProps<D>> {
  private boundsCache: { key: string; bounds: number[] } | null = null;

  state!: {
    model?: Model;

    initialized: boolean;
    numInstances: number;
    numAgedInstances: number;

    sourcePositions: Buffer;
    targetPositions: Buffer;

    sourcePositions64Low: Float32Array;
    targetPositions64Low: Float32Array;
    widths: Float32Array;

    colors: Buffer;

    transform: BufferTransform;
    texture: Texture;

    previousViewportZoom: number;
    previousTime: number;

    stepRequested: boolean;
    bounds: number[];
    trailLines: any[];
    isPacificCentered: boolean;
    isGlobalData: boolean;

    // Perf additions
    needsAttributeBind: boolean;
    uniformHolder: { bitmap?: any } | null;
    zeroPositions?: Float32Array;
  };

  // ====== Shader injection (unchanged visuals) ======
  getShaders() {
    const oldShaders = super.getShaders();
    return {
      ...oldShaders,
      inject: {
        "vs:#decl": `
          out float drop;
          out float trailAge;
          out float particleVariation;
          const vec2 DROP_POSITION = vec2(0);

          float hash(float n) {
            return fract(sin(n) * 43758.5453123);
          }
        `,
        "vs:#main-start": `
          drop = float(instanceSourcePositions.xy == DROP_POSITION || instanceTargetPositions.xy == DROP_POSITION);
          float particleIndex = mod(float(gl_VertexID), ${this.props.numParticles}.0);
          float ageIndex = floor(float(gl_VertexID) / ${this.props.numParticles}.0);
          trailAge = ageIndex / ${this.props.maxAge}.0;

          particleVariation = hash(particleIndex);
        `,
        "fs:#decl": `
          in float drop;
          in float trailAge;
          in float particleVariation;
        `,
        "fs:#main-start": `
          if (drop > 0.5) discard;
          ${this.props.fadeTrails
            ? `
          float fadeVariation = 0.8 + particleVariation * 0.4;
          float trailFade = 1.0 - smoothstep(0.0, fadeVariation, trailAge);
          fragColor.a *= trailFade * trailFade;

          fragColor.rgb *= 0.9 + particleVariation * 0.2;
          `
            : ""}
        `
      }
    };
  }

  shouldResetParticles(viewport, previousViewport) {
    if (!previousViewport) return false;
    const zoomDiff = Math.abs(viewport.zoom - previousViewport.zoom);
    const isGlobe = viewport.projection?.mode === "globe";
    return !isGlobe && zoomDiff > 3;
  }

  // ====== Lifecycle ======
  initializeState() {
    super.initializeState();

    const attributeManager = this.getAttributeManager();
    attributeManager!.remove([
      "instanceSourcePositions",
      "instanceTargetPositions",
      "instanceColors",
      "instanceWidths"
    ]);

    attributeManager!.addInstanced({
      instanceSourcePositions: { size: 3, type: "float32", noAlloc: true },
      instanceTargetPositions: { size: 3, type: "float32", noAlloc: true },
      instanceColors: {
        size: 4,
        type: "float32",
        noAlloc: true,
        defaultValue: [...this.props.color.map((c) => c / 255)]
      }
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
          particleId
        });
      }
    }

    return trailLines;
  }

  _createWindTexture() {
    const { projection, dataDir, dataMag } = this.props;
    const { lonlatGrid } = projection;

    const key = `${lonlatGrid[0][0]}-${lonlatGrid[0][1]}-${lonlatGrid[1][0]}-${lonlatGrid[1][1]}`;
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

    // Reuse a scratch buffer for this grid size if available
    const scratchKey = `scratch-${width}x${height}`;
    let uvData: Float32Array =
      positionsCache.get(scratchKey)?.uvData ||
      new Float32Array(width * height * 4);
    if (!positionsCache.has(scratchKey)) {
      addToCache(scratchKey, { uvData });
    }

    let ptr = 0;
    const interpolate = false;
    const noiseScale = 0.02;

    const pacificCentered = isPacificCentered([minLng, minLat, maxLng, maxLat]);
    const globalData = isGlobalData([minLng, minLat, maxLng, maxLat]);

    const texNoise = (x: number, y: number) =>
      (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;

    for (let j = 0; j < height; j++) {
      const lat = maxLat - j * dlat;
      for (let i = 0; i < width; i++) {
        const lon = minLng + i * dlon;

        // For Pacific-centered data, preserve the coordinate system
        let lookupLon = lon;
        if (pacificCentered && lon > 360) {
          lookupLon = lon - 360;
        }

        const wdirection = gUtilities.getreadoutvalue(
          lat,
          lookupLon,
          projection,
          dataDir,
          "°",
          interpolate,
          dataMag
        );
        const wmagnitude = gUtilities.getreadoutvalue(
          lat,
          lookupLon,
          projection,
          dataMag,
          "mph",
          interpolate,
          dataDir
        );

        let uv = gUtilities.DirectionToUV(wdirection, wmagnitude);
        if (isNaN(wmagnitude)) uv = [0, 0];

        // Subtle noise to decorrelate identical paths
        uv[0] += (texNoise(i * 0.1, j * 0.1) - 0.5) * noiseScale;
        uv[1] += (texNoise(i * 0.1 + 100, j * 0.1 + 100) - 0.5) * noiseScale;

        uvData[ptr++] = uv[0];
        uvData[ptr++] = uv[1];
        uvData[ptr++] = 0;
        uvData[ptr++] = wmagnitude >= 0 && !isNaN(wmagnitude) ? 1 : 0;
      }
    }

    const addressModeU = globalData ? "repeat" : "clamp-to-edge";
    const texture = this.context.device.createTexture({
      width,
      height,
      data: uvData,
      format: "rgba32float",
      mipmaps: false,
      sampler: {
        minFilter: "linear",
        magFilter: "linear",
        addressModeU,
        addressModeV: "clamp-to-edge"
      }
    });

    addToCache(textureKey, { texture });
    return texture;
  }

  _getBoundsFromGrid(lonlatGrid: any) {
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
    const { minLng, minLat, maxLng, maxLat } = this._getBoundsFromGrid(
      projection.lonlatGrid
    );

    let calculatedBounds = [minLng, minLat, maxLng, maxLat];

    if (
      isNaN(minLng) ||
      isNaN(maxLng) ||
      isNaN(minLat) ||
      isNaN(maxLat)
    ) {
      calculatedBounds = [-180, -90, 180, 90];
    }

    const _ = normalizeDataBounds(calculatedBounds);
    const pacificCentered = isPacificCentered(calculatedBounds);
    const globalData = isGlobalData(calculatedBounds);

    this.setState({
      bounds: calculatedBounds,
      trailLines: this._createTrailLines(),
      isPacificCentered: pacificCentered,
      isGlobalData: globalData
    });

    this._setupTransformFeedback();
  }

  updateState(params: UpdateParameters<this>) {
    super.updateState(params);
    const { props, oldProps } = params;

    const shouldUpdate =
      props.image !== oldProps.image ||
      props.numParticles !== oldProps.numParticles ||
      props.maxAge !== oldProps.maxAge ||
      props.width !== oldProps.width ||
      props.dataDir !== oldProps.dataDir ||
      props.dataMag !== oldProps.dataMag ||
      props.trailLength !== oldProps.trailLength;

    if (shouldUpdate) {
      this._setupState();
    }
  }

  finalizeState(context: LayerContext) {
    this._deleteTransformFeedback();
    super.finalizeState(context);
  }

  _getEffectiveBounds() {
    const cacheKey = this.props.bounds?.join("-") || "state";
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

  draw({ uniforms }: { uniforms: any }) {
    if (!this.state.initialized) return;

    if (this.props.animate) {
      this.step();
    }

    const {
      model,
      sourcePositions,
      targetPositions,
      sourcePositions64Low,
      targetPositions64Low,
      colors,
      widths,
      needsAttributeBind
    } = this.state;

    if (model && needsAttributeBind) {
      model.setAttributes?.({
        instanceSourcePositions: sourcePositions,
        instanceTargetPositions: targetPositions,
        instanceColors: colors
      });
      model.setConstantAttributes?.({
        instanceWidths: widths
      });
      this.state.needsAttributeBind = false;
    }

    super.draw({ uniforms });
  }

  _setupTransformFeedback() {
    if (this.state.initialized) {
      this._deleteTransformFeedback();
    }

    const { numParticles, color, maxAge, width, trailLength, fadeTrails } =
      this.props;

    const texture = this.props.image || this._createWindTexture();
    if (!texture || typeof texture === "string") {
      return;
    }

    const numInstances = numParticles * maxAge;
    const numAgedInstances = numParticles * (maxAge - 1);

    const sourcePositions = this.context.device.createBuffer(
      new Float32Array(numInstances * 3)
    );
    const targetPositions = this.context.device.createBuffer(
      new Float32Array(numInstances * 3)
    );

    // Precompute alphas by age (no pow in the big loop)
    const effectiveTrailLength = Math.min(trailLength, maxAge);
    const alphasByAge = new Float32Array(maxAge);
    const baseAlpha = ((color[3] ?? 255) as number) / 255;
    for (let age = 0; age < maxAge; age++) {
      let a = 0;
      if (fadeTrails && age < effectiveTrailLength) {
        const t = age / effectiveTrailLength;
        const fade = (1 - t) * (1 - t);
        a = baseAlpha * fade;
      }
      alphasByAge[age] = a;
    }

    // Build color buffer
    const colorsArr = new Float32Array(numInstances * 4);
    const r = (color[0] as number) / 255;
    const g = (color[1] as number) / 255;
    const b = (color[2] as number) / 255;
    for (let i = 0; i < numInstances; i++) {
      const age = (i / numParticles) | 0;
      const o = i * 4;
      colorsArr[o] = r;
      colorsArr[o + 1] = g;
      colorsArr[o + 2] = b;
      colorsArr[o + 3] = alphasByAge[age];
    }
    const colorBuffer = this.context.device.createBuffer({ data: colorsArr });

    const sourcePositions64Low = new Float32Array([0, 0, 0]);
    const targetPositions64Low = new Float32Array([0, 0, 0]);
    const widths = new Float32Array([width]);

    const transform = new BufferTransform(this.context.device, {
      attributes: { sourcePosition: sourcePositions },
      bufferLayout: [{ name: "sourcePosition", format: "float32x3" }],
      feedbackBuffers: { targetPosition: targetPositions },
      vs: shader,
      varyings: ["targetPosition"],
      modules: [bitmapUniforms],
      vertexCount: numParticles
    });

    // Reuse a zeroed array for resets
    const zeroPositions = new Float32Array(numInstances * 3);

    this.setState({
      initialized: true,
      numInstances,
      numAgedInstances,
      sourcePositions,
      targetPositions,
      sourcePositions64Low,
      targetPositions64Low,
      colors: colorBuffer,
      widths,
      transform,
      texture,
      previousViewportZoom: 0,
      previousTime: 0,
      needsAttributeBind: true,
      uniformHolder: { bitmap: {} },
      zeroPositions
    });
  }

  _runTransformFeedback() {
    if (!this.state.initialized) return;

    const { viewport, timeline } = this.context as any;
    const { numParticles, speedFactor, maxAge } = this.props;
    const {
      previousTime,
      previousViewportZoom,
      transform,
      sourcePositions,
      targetPositions,
      numAgedInstances,
      texture
    } = this.state;

    const time = timeline.getTime();
    if (time === previousTime) return;

    const isGlobe = viewport?.projection?.mode === "globe" ? 1 : 0;
    const bounds = this._getEffectiveBounds();

    let viewportBounds: number[];
    let viewportCenter: [number, number];
    let viewportZoomChangeFactor: number;
    let cullBackside = 0;

    if (isGlobe > 0) {
      viewportBounds = this.state.isGlobalData
        ? [-180, -90, 180, 90]
        : bounds;
      viewportZoomChangeFactor = 1.0;
      cullBackside = this.state.isGlobalData ? 1 : 0;
      // Use deck.gl globe props for center
      const lng = viewport?.longitude ?? 0;
      const lat = viewport?.latitude ?? 0;
      viewportCenter = [lng, lat];
    } else {
      viewportBounds = getViewportBounds(viewport);
      const [w, s, e, n] = viewportBounds;
      viewportCenter = [(w + e) / 2, (s + n) / 2];
      viewportZoomChangeFactor = Math.max(
        1.0,
        Math.pow(2, (previousViewportZoom - viewport.zoom) * 1.5)
      );
    }

    // Mild temporal variation; keep same behavior
    const speedVariation = 0.95 + 0.1 * Math.sin(time * 0.001);

    let currentSpeedFactor: number;
    if (isGlobe > 0) {
      currentSpeedFactor = (speedFactor * speedVariation) / 100000;
    } else {
      currentSpeedFactor =
        (speedFactor * speedVariation) / Math.pow(2, viewport.zoom + 7);
    }

    const seed =
      Math.sin(time * 0.0001) * 999 + Math.cos(time * 0.00013) * 777;

    // Reuse uniforms object (avoid per-frame allocations)
    const u = (this.state.uniformHolder!.bitmap ||= {});
    u.bitmapTexture = texture;
    u.viewportBounds = viewportBounds;
    u.viewportZoomChangeFactor = viewportZoomChangeFactor;
    u.bounds = bounds;
    u.viewportCenter = viewportCenter;
    u.cullBackside = cullBackside;
    u.numParticles = numParticles;
    u.maxAge = maxAge;
    u.speedFactor = currentSpeedFactor;
    u.time = time;
    u.seed = Math.abs(seed);
    u.isGlobe = isGlobe;

    if (!transform?.model) return; // simple early-out

    transform.model.shaderInputs?.setProps?.({ bitmap: u }); 

    transform.run({
      clearColor: false,
      clearDepth: false,
      clearStencil: false,
      depthReadOnly: true,
      stencilReadOnly: true
    });

    // Shift aged positions down by one "age row"
    const encoder = this.context.device.createCommandEncoder();
    encoder.copyBufferToBuffer({
      sourceBuffer: sourcePositions,
      sourceOffset: 0,
      destinationBuffer: targetPositions,
      destinationOffset: numParticles * 4 * 3,
      size: numAgedInstances * 4 * 3
    });
    encoder.finish();
    encoder.destroy();

    // Swap
    this.state.sourcePositions = targetPositions;
    this.state.targetPositions = sourcePositions;
    transform.model.setAttributes({ sourcePosition: targetPositions });
    transform.transformFeedback.setBuffers({ targetPosition: sourcePositions });

    // Mark bindings dirty for draw()
    this.state.needsAttributeBind = true;

    this.state.previousViewportZoom = viewport.zoom;
    this.state.previousTime = time;
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

    const { sourcePositions, targetPositions, colors, transform, texture } =
      this.state;
    sourcePositions?.destroy();
    targetPositions?.destroy();
    colors?.destroy();
    transform?.destroy();

    if (texture && texture !== this.props.image) {
      for (const [key, value] of positionsCache.entries()) {
        if (value.texture === texture) {
          positionsCache.delete(key);
          break;
        }
      }
      texture.destroy();
    }

    this.setState({ initialized: false });
  }

  // ===== Public API =====
  step() {
    this._runTransformFeedback();
    this.setNeedsRedraw();
  }

  clear() {
    this._resetTransformFeedback();
    this.setNeedsRedraw();
  }
}

ParticleLayer.layerName = "ParticleLayer";
ParticleLayer.defaultProps = defaultProps;
