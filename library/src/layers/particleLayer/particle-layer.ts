import { Color, DefaultProps, LayerContext, UpdateParameters, COORDINATE_SYSTEM, GlobeViewport } from "@deck.gl/core";
import { LineLayer, LineLayerProps } from "@deck.gl/layers";
import { Buffer, Texture } from "@luma.gl/core";
import { Model, BufferTransform } from "@luma.gl/engine";
import { ShaderModule } from "@luma.gl/shadertools";
import gUtilities from "../../utilities/graphicsUtilities";
import updatedShader from "./particle-layer-update-transform.vs.glsl.js"; 

// Shader Module
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
    isGlobe: "i32",
  },
} as const satisfies ShaderModule<UniformProps>;

// Simple cache for bounds calculations
const positionsCache = new Map();
const MAX_CACHE_SIZE = 50;

function addToCache(key: string, value: any) {
  if (positionsCache.size >= MAX_CACHE_SIZE) {
    const firstKey = positionsCache.keys().next().value;
    positionsCache.delete(firstKey);
  }
  positionsCache.set(key, value);
}

// Particle Layer
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

  particleJitter: { type: "number", min: 0, max: 1, value: 0.7 }, // Amount of random jitter
  speedVariation: { type: "number", min: 0, max: 1, value: 0.1 }, // Speed variation between particles
  turbulenceStrength: { type: "number", min: 0, max: 1, value: 0.1 },
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
    colors: Buffer;
    widths: Float32Array;
    transform: BufferTransform;
    previousViewportZoom: number;
    previousTime: number;
    texture: Texture;
    stepRequested: boolean;
    bounds: number[];
    trailLines: any[];
  };

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
          
          // Hash function for per-particle variation
          float hash(float n) {
            return fract(sin(n) * 43758.5453123);
          }
        `,
        "vs:#main-start": `
          drop = float(instanceSourcePositions.xy == DROP_POSITION || instanceTargetPositions.xy == DROP_POSITION);
          float particleIndex = mod(float(gl_VertexID), ${this.props.numParticles}.0);
          float ageIndex = floor(float(gl_VertexID) / ${this.props.numParticles}.0);
          trailAge = ageIndex / ${this.props.maxAge}.0;
          
          // Add per-particle variation for visual diversity
          particleVariation = hash(particleIndex);
        `,
        "fs:#decl": `
          in float drop;
          in float trailAge;
          in float particleVariation;
        `,
        "fs:#main-start": `
          if (drop > 0.5) discard;
          ${this.props.fadeTrails ? `
          // Variable trail fade based on particle
          float fadeVariation = 0.8 + particleVariation * 0.4;
          float trailFade = 1.0 - smoothstep(0.0, fadeVariation, trailAge);
          fragColor.a *= trailFade * trailFade;
          
          // Add subtle color variation per particle
          fragColor.rgb *= 0.9 + particleVariation * 0.2;
          ` : ''}
        `,
      },
    };
  }

  shouldResetParticles(viewport, previousViewport) {
    if (!previousViewport) return false;
    
    const zoomDiff = Math.abs(viewport.zoom - previousViewport.zoom);
    const isGlobe = viewport.projection?.mode === 'globe';
    
    // Reset particles on major zoom changes for flat maps only
    return !isGlobe && zoomDiff > 3;
  }

  initializeState() {
    super.initializeState();

    const attributeManager = this.getAttributeManager();
    attributeManager!.remove([
      "instanceSourcePositions",
      "instanceTargetPositions",
      "instanceColors",
      "instanceWidths",
    ]);
    
    attributeManager!.addInstanced({
      instanceSourcePositions: { size: 3, type: "float32", noAlloc: true },
      instanceTargetPositions: { size: 3, type: "float32", noAlloc: true },
      instanceColors: {
        size: 4,
        type: "float32",
        noAlloc: true,
        defaultValue: [...this.props.color.map(c => c / 255)],
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
          sourcePosition: [0, 0, 0], // Will be updated from transform feedback
          targetPosition: [0, 0, 0], // Will be updated from transform feedback
          sourceIndex,
          targetIndex,
          age: age,
          particleId: particleId,
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
        return cachedTexture.texture;
    }
    
    const { minLng, minLat, maxLng, maxLat } = this._getBoundsFromGrid(lonlatGrid);
    const width = lonlatGrid[0].length;
    const height = lonlatGrid.length;
    const dlon = (maxLng - minLng) / width;
    const dlat = (maxLat - minLat) / height;
    
    const uvData = new Float32Array(width * height * 4);
    let index = 0;

    const textureNoise = (x: number, y: number) => {
      return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
    };

    for (let j = 0; j < height; j += 1) {
        for (let i = 0; i < width; i += 1) {
            const lat = maxLat - j * dlat;
            const lon = minLng + i * dlon;
            const interpolate = false; 
            const wdirection = gUtilities.getreadoutvalue(lat, lon, projection, dataDir, '°', interpolate, dataMag);
            const wmagnitude = gUtilities.getreadoutvalue(lat, lon, projection, dataMag, 'mph', interpolate, dataDir); 

            let uv = gUtilities.DirectionToUV(wdirection, wmagnitude);
            if (isNaN(wmagnitude)) uv = [0, 0];
            
            // Add subtle noise to prevent identical flow paths
            const noiseScale = 0.02; // Very subtle noise
            uv[0] += (textureNoise(i * 0.1, j * 0.1) - 0.5) * noiseScale;
            uv[1] += (textureNoise(i * 0.1 + 100, j * 0.1 + 100) - 0.5) * noiseScale;
            
            const startIndex = index * 4;
            
            // Store the raw U and V vector components as floats
            uvData[startIndex] = uv[0];     // U component in Red channel
            uvData[startIndex + 1] = uv[1]; // V component in Green channel
            uvData[startIndex + 2] = 0;     // Blue channel is unused
            // Use Alpha to flag if data exists at this point
            uvData[startIndex + 3] = wmagnitude >= 0 && !isNaN(wmagnitude) ? 1 : 0; 
            
            index += 1;
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
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
        },
    });
    
    addToCache(textureKey, { texture });
    return texture;
  }
  
  _getBoundsFromGrid(lonlatGrid) {
      const key = `${lonlatGrid[0][0]}-${lonlatGrid[0][1]}-${lonlatGrid[1][0]}-${lonlatGrid[1][1]}`;
      const cached = positionsCache.get(key);
      if (cached?.bounds) {
          return cached.bounds;
      }
      
      let maxLng = -Infinity, minLng = Infinity, maxLat = -Infinity, minLat = Infinity;
      for (const outerArr of lonlatGrid) {
          for (const innerArr of outerArr) {
              const [longitude, latitude] = innerArr;
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
      const calculatedBounds = [minLng, minLat, maxLng, maxLat];

      this.setState({
          bounds: calculatedBounds,
          trailLines: this._createTrailLines(),
      });

      this._setupTransformFeedback();
  }
  
  updateState({ props, oldProps, changeFlags, context }: UpdateParameters<this>) {
    super.updateState({ props, oldProps, changeFlags, context } as UpdateParameters<this>);
    
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

  _getEffectiveBounds(): number[] {
    const cacheKey = this.props.bounds?.join('-') || 'state';
    
    if (this.boundsCache?.key === cacheKey) {
      return this.boundsCache.bounds;
    }

    let bounds;
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
    if (!this.state.initialized) {
      return;
    }

    if (this.props.animate && this.state.initialized) {
      this.step();
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
      instanceColors: colors,
    });
    model.setConstantAttributes({
      instanceSourcePositions64Low: sourcePositions64Low,
      instanceTargetPositions64Low: targetPositions64Low,
      instanceWidths: widths,
    });

    super.draw({ uniforms });
  }

  _setupTransformFeedback() {
    if (this.state.initialized) {
      this._deleteTransformFeedback();
    }
    
    const { numParticles, color, maxAge, width, trailLength, fadeTrails } = this.props;

    const texture = this.props.image || this._createWindTexture();
    if (!texture || typeof texture === "string") {
      return;
    }

    const numInstances = numParticles * maxAge;
    const numAgedInstances = numParticles * (maxAge - 1);
    const sourcePositions = this.context.device.createBuffer(new Float32Array(numInstances * 3));
    const targetPositions = this.context.device.createBuffer(new Float32Array(numInstances * 3));

    const colors = new Float32Array(numInstances * 4);

    for (let i = 0; i < numInstances; i++) {
      const particleIndex = i % numParticles;
      const age = Math.floor(i / numParticles);
      const effectiveTrailLength = Math.min(trailLength, maxAge);

      let alpha = color[3] ?? 255;

      if (fadeTrails && age < effectiveTrailLength) {
        const trailPosition = age / effectiveTrailLength;
        const trailFade = Math.pow(1 - trailPosition, 2);
        alpha *= trailFade;
      } else if (age >= effectiveTrailLength) {
        alpha = 0;
      }

      const o = i * 4;
      colors[o    ] = color[0] / 255; // R
      colors[o + 1] = color[1] / 255; // G
      colors[o + 2] = color[2] / 255; // B
      colors[o + 3] = alpha    / 255;    // A
    }

    const colorBuffer = this.context.device.createBuffer({data: colors});

    const sourcePositions64Low = new Float32Array([0, 0, 0]);
    const targetPositions64Low = new Float32Array([0, 0, 0]);
    const widths = new Float32Array([width]);

    const transform = new BufferTransform(this.context.device, {
      attributes: { sourcePosition: sourcePositions },
      bufferLayout: [{ name: "sourcePosition", format: "float32x3" }],
      feedbackBuffers: { targetPosition: targetPositions },
      vs: updatedShader,
      varyings: ["targetPosition"],
      modules: [bitmapUniforms],
      vertexCount: numParticles,
    });

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
    });
  }

  _runTransformFeedback() {
    if (!this.state.initialized) {
      return;
    }

    const { viewport, timeline } = this.context;
    const { numParticles, speedFactor, maxAge } = this.props;
    const {
      previousTime,
      previousViewportZoom,
      transform,
      sourcePositions,
      targetPositions,
      numAgedInstances,
      texture,
    } = this.state;

    const time = timeline.getTime();
    if (time === previousTime) {
      return;
    }
    
    const isGlobe = viewport.projection?.mode === 'globe' ? 1 : 0;
    const bounds = this._getEffectiveBounds();
    
    let viewportBounds;
    let viewportZoomChangeFactor;
    
    if (isGlobe > 0) {
      viewportBounds = bounds;
      viewportZoomChangeFactor = 1.0;
    } else {
      viewportBounds = getViewportBounds(viewport);
      // Reduce zoom change sensitivity to prevent excessive particle drops
      viewportZoomChangeFactor = Math.max(1.0, 2 ** ((previousViewportZoom - viewport.zoom) * 1.5)); 
    }
    
    // Add variation to speed factor based on time
    let currentSpeedFactor;
    const speedVariation = 0.95 + 0.1 * Math.sin(time * 0.001); // Subtle global speed variation
    
    if (isGlobe > 0) {
      currentSpeedFactor = (speedFactor * speedVariation) / 100000; 
    } else {
      currentSpeedFactor = (speedFactor * speedVariation) / (2 ** (viewport.zoom + 7));
    }

    // Use a more varied seed that changes more dramatically over time
    const seed = Math.sin(time * 0.0001) * 999 + Math.cos(time * 0.00013) * 777;

    const moduleUniforms = {
      bitmapTexture: texture,
      viewportBounds: viewportBounds || [0, 0, 0, 0],
      viewportZoomChangeFactor: viewportZoomChangeFactor || 0,
      bounds,
      numParticles,
      maxAge,
      speedFactor: currentSpeedFactor,
      time,
      seed: Math.abs(seed),
      isGlobe
    };
    
    transform.model.shaderInputs.setProps({ bitmap: moduleUniforms });
    
    transform.run({
      clearColor: false,
      clearDepth: false,
      clearStencil: false,
      depthReadOnly: true,
      stencilReadOnly: true,
    });

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

    this.state.sourcePositions = targetPositions;
    this.state.targetPositions = sourcePositions;
    transform.model.setAttributes({ sourcePosition: targetPositions });
    transform.transformFeedback.setBuffers({ targetPosition: sourcePositions });

    this.state.previousViewportZoom = viewport.zoom;
    this.state.previousTime = time;
  }

  _resetTransformFeedback() {
    if (this.state.initialized) {
      const { sourcePositions, targetPositions, numInstances } = this.state;
      sourcePositions.write(new Float32Array(numInstances * 3));
      targetPositions.write(new Float32Array(numInstances * 3));
    }
  }

  _deleteTransformFeedback() {
    if (this.state.initialized) {
        const { sourcePositions, targetPositions, colors, transform, texture } = this.state;
        sourcePositions?.destroy();
        targetPositions?.destroy();
        colors?.destroy();
        transform?.destroy();

        // If the texture exists and was generated by this layer (not passed in via props)
        if (texture && texture !== this.props.image) {
            // Find the texture in the cache and remove it
            for (const [key, value] of positionsCache.entries()) {
                if (value.texture === texture) {
                    positionsCache.delete(key);
                    break; // Exit after finding and deleting
                }
            }
            // Destroy the texture to free up GPU memory
            texture.destroy();
        }
        
        this.setState({ initialized: false });
    }
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

ParticleLayer.layerName = "ParticleLayer";
ParticleLayer.defaultProps = defaultProps;

// Viewport Functions
export function getViewportBounds(viewport) {
  // For both globe and flat maps, return expanded bounds to prevent edge clipping
  // This allows particles to flow naturally across viewport boundaries
  
  if (viewport.projection?.mode === 'globe') {
    // For globe, return world bounds
    return [-180, -90, 180, 90];
  }
  
  // For flat maps, expand the viewport bounds to allow particle flow
  const bounds = viewport.getBounds();
  const [west, south, east, north] = bounds;
  
  // Expand bounds by a margin to prevent edge clipping
  const lonMargin = (east - west) * 0.2; // 20% margin
  const latMargin = (north - south) * 0.2; // 20% margin
  
  const expandedBounds = [
    Math.max(west - lonMargin, -180),
    Math.max(south - latMargin, -90),
    Math.min(east + lonMargin, 180),
    Math.min(north + latMargin, 90)
  ];
  
  return wrapBounds(expandedBounds);
}

function modulo(x: number, y: number): number {
  return ((x % y) + y) % y;
}

export function wrapLongitude(lng: number): number {
  return modulo(lng + 180, 360) - 180;
}

export function wrapBounds(bounds: [number, number, number, number]): [number, number, number, number] {
  const [west, south, east, north] = bounds;
  // If the viewport is wider than the world, return the full world
  if (east - west >= 360) {
    return [-180, Math.max(south, -90), 180, Math.min(north, 90)];
  }
  const minLng = wrapLongitude(west);
  const maxLng = wrapLongitude(east);
  const minLat = Math.max(south, -90);
  const maxLat = Math.min(north, 90);
  
  return [minLng, minLat, maxLng, maxLat];
}