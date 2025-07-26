const shader = `\
#version 300 es
#define SHADER_NAME particle_layer_update_transform_vertex_shader

precision highp float;

in vec3 sourcePosition;
out vec3 targetPosition;

// your sampler
uniform sampler2D bitmapTexture;

const vec2 DROP_POSITION    = vec2(0.0);
const vec2 RAND_SEED_A      = vec2(12.9898, 78.233);
const float RAND_MULTIPLIER = 43758.5453;
const float PI              = 3.14159265359;
const float PI_180          = 0.017453292519943295;
const float R_EARTH         = 6371000.0; // Earth radius in meters

float fastRand(vec2 seed) {
  return fract(sin(dot(seed, RAND_SEED_A)) * RAND_MULTIPLIER);
}

float wrapLng(float lng) {
  return lng - 360.0 * floor((lng + 180.0) / 360.0);
}

float unwrapLng(float lng, float ref) {
  return lng - 360.0 * floor((lng - ref + 180.0) / 360.0);
}

bool isInBounds(vec2 pos, vec4 bounds) {
  float lng = pos.x;
  bool inLat = bounds.y <= pos.y && pos.y <= bounds.w;
  if (!inLat) {
    return false;
  }

  float minLng = wrapLng(bounds.x);
  float maxLng = wrapLng(bounds.z);
  
  if (minLng <= maxLng) {
    return minLng <= lng && lng <= maxLng;
  } else {
    return minLng <= lng || lng <= maxLng;
  }
}

vec2 getUV(vec2 pos, vec4 bounds) {
  float unwrappedLng = unwrapLng(pos.x, bounds.x);
  
  float boundsMinX = bounds.x;
  float boundsMaxX = bounds.z;

  if (boundsMinX > boundsMaxX) {
    boundsMaxX += 360.0;
  }
  
  return vec2(
    (unwrappedLng - boundsMinX) / (boundsMaxX - boundsMinX),
    (pos.y - bounds.w) / (bounds.y - bounds.w)
  );
}

void main() {
  float particleIndex = mod(float(gl_VertexID), bitmap.numParticles);
  float particleAge = floor(float(gl_VertexID) / bitmap.numParticles);

  if(particleAge > 0.0) {
    return;
  }

  bool isNewParticle = (sourcePosition.xy == DROP_POSITION);
  float zOffset = (bitmap.isGlobe == 1) ? 1000.0 : 0.0;
  
  if(isNewParticle) {
    vec2 seed = vec2(particleIndex * bitmap.seed / bitmap.numParticles);
    vec2 rand = vec2(fastRand(seed), fastRand(seed + vec2(1.3, 2.1)));
    rand.y = smoothstep(0.0, 1.0, rand.y);

    vec2 vMin = bitmap.viewportBounds.xy;
    vec2 vMax = bitmap.viewportBounds.zw;
    if (vMin.x > vMax.x) vMax.x += 360.0;

    vec2 position;
    // --- GLOBE LOGIC FOR NEW PARTICLES ---
    if (bitmap.isGlobe == 1) {
      float lonSpan = vMax.x - vMin.x;
      position.x = vMin.x + rand.x * lonSpan;
      // Distribute particles evenly across the curved surface
      float phiMin = vMin.y * PI_180;
      float phiMax = vMax.y * PI_180;
      position.y = asin(mix(sin(phiMin), sin(phiMax), rand.y)) / PI_180;
    } else {
    // --- FLAT MAP LOGIC FOR NEW PARTICLES ---
      position = mix(vMin, vMax, rand);
    }
    

    targetPosition = vec3(wrapLng(position.x), position.y, zOffset);
    return;
  }

  bool shouldDrop = (bitmap.viewportZoomChangeFactor > 1.0 && 
                     mod(particleIndex, bitmap.viewportZoomChangeFactor) >= 1.0) ||
                    (abs(mod(particleIndex, bitmap.maxAge + 2.0) - 
                         mod(bitmap.time, bitmap.maxAge + 2.0)) < 1.0);
  
  if(shouldDrop || !isInBounds(sourcePosition.xy, bitmap.viewportBounds) || !isInBounds(sourcePosition.xy, bitmap.bounds)) {
    targetPosition.xy = DROP_POSITION;
    return;
  }

  vec2 uv = getUV(sourcePosition.xy, bitmap.bounds);
  vec4 bitmapColour = texture(bitmapTexture, uv);

  if (bitmapColour.a < 0.5) {
    targetPosition.xy = DROP_POSITION;
    return;
  }

  vec2 speed = bitmapColour.xy * bitmap.speedFactor;
  vec2 newPos;

  // --- GLOBE LOGIC FOR PARTICLE MOVEMENT ---
  if (bitmap.isGlobe == 1) {
    float lat = sourcePosition.y * PI_180;
    float cosLat = cos(lat);
    // Convert speed (m/s) to degrees for both lat and lon
    float dLat = (speed.y) / (R_EARTH * PI_180);
    float dLon = (speed.x) / (R_EARTH * cosLat * PI_180);
    newPos = sourcePosition.xy + vec2(dLon, dLat);
    newPos.y = clamp(newPos.y, -90.0, 90.0);
  } else {
  // --- FLAT MAP LOGIC FOR PARTICLE MOVEMENT ---
    // Apply Mercator distortion correction
    float cosLat = cos(sourcePosition.y * PI_180);
    newPos = sourcePosition.xy + vec2(speed.x, speed.y * cosLat);
  }

  targetPosition = vec3(wrapLng(newPos.x), newPos.y, zOffset);
  //targetPosition.xy = newPos;
  //targetPosition.x = wrapLng(targetPosition.x);
}
`;

export default shader;