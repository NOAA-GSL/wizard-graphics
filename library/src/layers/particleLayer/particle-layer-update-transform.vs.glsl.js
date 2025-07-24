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

// Wraps a longitude to the [-180, 180] range
float wrapLng(float lng) {
  return lng - 360.0 * floor((lng + 180.0) / 360.0);
}

// Unwraps a longitude 'lng' to be in the same 360-degree cycle as 'ref'.
// This is crucial for mapping a wrapped particle position back to the original data's coordinate system.
float unwrapLng(float lng, float ref) {
  return lng - 360.0 * floor((lng - ref + 180.0) / 360.0);
}

// This function correctly compares a wrapped position with potentially unwrapped bounds.
bool isInBounds(vec2 pos, vec4 bounds) {
  // pos.x is assumed to be a wrapped longitude in [-180, 180]
  float lng = pos.x;
  bool inLat = bounds.y <= pos.y && pos.y <= bounds.w;
  if (!inLat) {
    return false;
  }

  // Wrap the data bounds to perform comparison in a consistent [-180, 180] space.
  float minLng = wrapLng(bounds.x);
  float maxLng = wrapLng(bounds.z);
  
  if (minLng <= maxLng) {
    // Standard case (e.g., bounds from -120 to -80)
    return minLng <= lng && lng <= maxLng;
  } else {
    // Dateline crossing case (e.g., bounds from 170 to -170)
    return minLng <= lng || lng <= maxLng;
  }
}

// This function correctly maps a wrapped world position to a UV on the texture,
// even if the texture's bounds are outside the [-180, 180] range (e.g. starting at -220).
vec2 getUV(vec2 pos, vec4 bounds) {
  // Unwrap the particle's longitude to match the coordinate system of the data bounds.
  float unwrappedLng = unwrapLng(pos.x, bounds.x);
  
  float boundsMinX = bounds.x;
  float boundsMaxX = bounds.z;

  // If the data bounds themselves wrap the dateline (e.g. from 170 to -170)
  // we need to unwrap the max bound to get the correct texture width.
  if (boundsMinX > boundsMaxX) {
    boundsMaxX += 360.0;
  }
  
  return vec2(
    (unwrappedLng - boundsMinX) / (boundsMaxX - boundsMinX),
    (pos.y - bounds.w) / (bounds.y - bounds.w)
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
    vec2 seed = vec2(particleIndex * bitmap.seed / bitmap.numParticles);
    vec2 rand = vec2(fastRand(seed), fastRand(seed + vec2(1.3, 2.1)));
    rand.y = smoothstep(0.0, 1.0, rand.y);

    vec2 boundsMin = bitmap.viewportBounds.xy;
    vec2 boundsMax = bitmap.viewportBounds.zw;

    // If viewport wraps the dateline, unwrap the max longitude for correct interpolation
    if (boundsMin.x > boundsMax.x) {
        boundsMax.x += 360.0;
    }

    // Create new particle position in the (potentially unwrapped) bounds
    vec2 position = mix(boundsMin, boundsMax, rand);
    
    // Wrap the final longitude back to the [-180, 180] range for storage
    targetPosition = vec3(wrapLng(position.x), position.y, 0.0);
    
    return;
  }

  // Combined zoom and time-based dropping checks
  bool shouldDrop = (bitmap.viewportZoomChangeFactor > 1.0 && 
                     mod(particleIndex, bitmap.viewportZoomChangeFactor) >= 1.0) ||
                    (abs(mod(particleIndex, bitmap.maxAge + 2.0) - 
                         mod(bitmap.time, bitmap.maxAge + 2.0)) < 1.0);

  // bool shouldDrop = (abs(mod(particleIndex, bitmap.maxAge + 2.0) - 
  //                      mod(bitmap.time, bitmap.maxAge + 2.0)) < 1.0);
  
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

  // Check for valid data using the alpha channel.
  if (bitmapColour.a < 0.5) {
    targetPosition.xy = DROP_POSITION;
    return;
  }

  // Directly use the U/V vector from the Red/Green channels.
  vec2 speed = bitmapColour.xy * bitmap.speedFactor;

  // Final position update
  targetPosition.xy = updatePos(sourcePosition.xy, speed);
  targetPosition.x = wrapLng(targetPosition.x);
}
`;

export default shader;