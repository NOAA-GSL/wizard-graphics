const shader = `\
#version 300 es
#define SHADER_NAME particle-layer-update-transform-vertex-shader

precision highp float;

in vec3 sourcePosition;
out vec3 targetPosition;

uniform sampler2D bitmapTexture;

// Constants - computed once instead of repeatedly
const vec2 DROP_POSITION = vec2(0.0);
const vec2 RAND_SEED_A = vec2(12.9898, 78.233);
const float RAND_MULTIPLIER = 43758.5453;
const float PI_180 = 0.017453292519943295; // PI/180 for radians conversion

// Optimized random function - single call instead of multiple
float fastRand(vec2 seed) {
  return fract(sin(dot(seed, RAND_SEED_A)) * RAND_MULTIPLIER);
}

// Optimized longitude wrapping - inlined and simplified
float wrapLng(float lng) {
  return mod(lng + 180.0, 360.0) - 180.0;
}

// Combined bounds checking to reduce function calls
bool isInBounds(vec2 pos, vec4 bounds) {
  float lng = wrapLng(pos.x);
  return (bounds.x <= lng && lng <= bounds.z && bounds.y <= pos.y && pos.y <= bounds.w);
}

// Optimized UV calculation - direct vector math
vec2 getUV(vec2 pos, vec4 bounds) {
  return vec2(
    (pos.x - bounds.x) / (bounds.z - bounds.x),  // X: (pos.x - minLng) / (maxLng - minLng)
    (pos.y - bounds.w) / (bounds.y - bounds.w)   // Y: (pos.y - maxLat) / (minLat - maxLat) - preserves flip
  );
}

// Inlined position update with optimized distortion
vec2 updatePos(vec2 pos, vec2 speed) {
  float cosLat = cos(pos.y * PI_180);
  return pos + vec2(speed.x, speed.y * cosLat);
}

void main() {
  float particleIndex = mod(float(gl_VertexID), bitmap.numParticles);
  float particleAge = floor(float(gl_VertexID) / bitmap.numParticles);

  // Early exit for older particles
  if(particleAge > 0.0) {
    return;
  }

  // Check for new particle first (most common case)
  bool isNewParticle = (sourcePosition.xy == DROP_POSITION);
  
  if(isNewParticle) {
    // Optimized random point generation
    vec2 seed = vec2(particleIndex * bitmap.seed / bitmap.numParticles);
    vec2 rand = vec2(fastRand(seed), fastRand(seed + vec2(1.3, 2.1)));
    
    // Optimized position calculation
    rand.y = smoothstep(0.0, 1.0, rand.y);
    vec2 position = mix(bitmap.viewportBounds.xy, bitmap.viewportBounds.zw, rand);
    
    targetPosition = vec3(wrapLng(position.x), position.y, 0.0);
    return;
  }

  // Combined zoom and time-based dropping checks
  bool shouldDrop = (bitmap.viewportZoomChangeFactor > 1.0 && 
                     mod(particleIndex, bitmap.viewportZoomChangeFactor) >= 1.0) ||
                    (abs(mod(particleIndex, bitmap.maxAge + 2.0) - 
                         mod(bitmap.time, bitmap.maxAge + 2.0)) < 1.0);
  
  if(shouldDrop) {
    targetPosition.xy = DROP_POSITION;
    return;
  }

  // Combined bounds checking - single function call
  if(!isInBounds(sourcePosition.xy, bitmap.bounds)) {
    targetPosition.xy = sourcePosition.xy;
    return;
  }

  if(!isInBounds(sourcePosition.xy, bitmap.viewportBounds)) {
    targetPosition.xy = DROP_POSITION;
    return;
  }

  // Optimized UV calculation and texture sampling
  vec2 uv = getUV(sourcePosition.xy, bitmap.bounds);
  vec4 bitmapColour = texture(bitmapTexture, uv);

  // Optimized raster value checking
  bool hasValues = (bitmap.imageUnscale[0] < bitmap.imageUnscale[1]) ? 
                   (bitmapColour.a >= 1.0) : 
                   (bitmapColour.x == bitmapColour.x); // NaN check

  if(!hasValues) {
    targetPosition.xy = DROP_POSITION;
    return;
  }

  // Optimized speed calculation
  vec2 speed = ((bitmap.imageUnscale[0] < bitmap.imageUnscale[1]) ?
                mix(vec2(bitmap.imageUnscale[0]), vec2(bitmap.imageUnscale[1]), bitmapColour.xy) :
                bitmapColour.xy) * bitmap.speedFactor;

  // Final position update
  targetPosition.xy = updatePos(sourcePosition.xy, speed);
  targetPosition.x = wrapLng(targetPosition.x);
}
`;

export default shader;