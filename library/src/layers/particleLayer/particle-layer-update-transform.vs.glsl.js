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
const vec2 RAND_SEED_B      = vec2(17.2341, 91.442);
const float RAND_MULTIPLIER = 43758.5453;
const float PI              = 3.14159265359;
const float PI_180          = 0.017453292519943295;
const float R_EARTH         = 6371000.0; // Earth radius in meters

float fastRand(vec2 seed) {
  return fract(sin(dot(seed, RAND_SEED_A)) * RAND_MULTIPLIER);
}

// Additional hash function for better randomization
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.x + p3.y) * p3.z);
}

// Improved noise function for particle perturbation
vec2 noise2D(vec2 p) {
  return vec2(
    hash(p),
    hash(p + vec2(5.123, 7.456))
  ) * 2.0 - 1.0;
}

// Standard longitude wrapping for display purposes only
float wrapLngForDisplay(float lng) {
  return lng - 360.0 * floor((lng + 180.0) / 360.0);
}

// FIXED: Work with unwrapped data coordinates - don't wrap unless necessary
bool isInDataBounds(vec2 pos, vec4 bounds) {
  // Work directly with unwrapped coordinates for data bounds
  return pos.x >= bounds.x && pos.x <= bounds.z && 
         pos.y >= bounds.y && pos.y <= bounds.w;
}

// FIXED: Handle viewport bounds (which may be wrapped) vs data bounds (unwrapped)
bool isInViewportBounds(vec2 pos, vec4 viewportBounds) {
  // For viewport bounds, we need to handle potential wrapping
  float lng = pos.x;
  bool inLat = viewportBounds.y <= pos.y && pos.y <= viewportBounds.w;
  if (!inLat) return false;

  float minLng = viewportBounds.x;
  float maxLng = viewportBounds.z;
  
  // Check if viewport bounds cross the dateline
  if (minLng > maxLng) {
    // Viewport crosses dateline, need to check both wrapped and unwrapped space
    float wrappedLng = wrapLngForDisplay(lng);
    return (wrappedLng >= minLng || wrappedLng <= maxLng) || 
           (lng >= minLng || lng <= maxLng);
  } else {
    // Normal case - check both wrapped and unwrapped
    float wrappedLng = wrapLngForDisplay(lng);
    return (lng >= minLng && lng <= maxLng) || 
           (wrappedLng >= minLng && wrappedLng <= maxLng);
  }
}

vec2 getUV(vec2 pos, vec4 bounds) {
  // Work directly with unwrapped coordinates
  float u = (pos.x - bounds.x) / (bounds.z - bounds.x);
  float v = (pos.y - bounds.w) / (bounds.y - bounds.w);
  
  // Clamp UV coordinates to prevent sampling outside texture
  return vec2(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0));
}

float convertToDataSpace(float wrappedLng, vec4 dataBounds) {
  float dataMin = dataBounds.x;
  float dataMax = dataBounds.z;
  
  // If wrapped longitude is in standard range but data is unwrapped
  if (wrappedLng >= -180.0 && wrappedLng <= 180.0) {
    // Try direct mapping first
    if (wrappedLng >= dataMin && wrappedLng <= dataMax) {
      return wrappedLng;
    }
    
    // If data spans across dateline in unwrapped space (e.g., -220 to -50)
    // Convert wrapped longitude to equivalent unwrapped space
    if (dataMin < -180.0) {
      // Data extends westward past -180
      if (wrappedLng > 0.0) {
        // Positive longitude corresponds to the western extension
        return wrappedLng - 360.0;
      }
    } else if (dataMax > 180.0) {
      // Data extends eastward past 180
      if (wrappedLng < 0.0) {
        // Negative longitude corresponds to the eastern extension
        return wrappedLng + 360.0;
      }
    }
  }
  
  return wrappedLng;
}

// Enhanced trail-aware particle lifecycle with better randomization
bool shouldDropParticle(float particleIndex, float particleAge) {
  // Add per-particle lifetime variation
  float particleLifeVariation = hash(vec2(particleIndex * 0.01, 0.5)) * 0.4 + 0.8;
  float adjustedMaxAge = bitmap.maxAge * particleLifeVariation;
  
  // More varied particle recycling with staggered timing
  float cycleLength = adjustedMaxAge + 3.0 + hash(vec2(particleIndex * 0.017, 1.3)) * 5.0;
  float timeOffset = hash(vec2(particleIndex * 0.023, 2.7)) * cycleLength;
  bool ageCycle = abs(mod(particleIndex + timeOffset, cycleLength) - mod(bitmap.time * 0.5, cycleLength)) < 0.5;
  
  if (bitmap.isGlobe == 1) {
    // For globe view, prioritize smooth trails over viewport culling
    return ageCycle || !isInDataBounds(sourcePosition.xy, bitmap.bounds);
  } else {
    // For flat maps, include zoom-based culling but with reduced sensitivity
    bool zoomCull = bitmap.viewportZoomChangeFactor > 1.5 && 
                    mod(particleIndex + hash(vec2(particleIndex * 0.013, 3.2)) * 10.0, bitmap.viewportZoomChangeFactor * 0.5) >= 0.5;
    bool boundsCull = !isInViewportBounds(sourcePosition.xy, bitmap.viewportBounds) || 
                      !isInDataBounds(sourcePosition.xy, bitmap.bounds);
    
    return ageCycle || zoomCull || boundsCull;
  }
}

void main() {
  float particleIndex = mod(float(gl_VertexID), bitmap.numParticles);
  float particleAge = floor(float(gl_VertexID) / bitmap.numParticles);

  // Only update the newest particles (age 0)
  if(particleAge > 0.0) {
    return;
  }

  bool isNewParticle = (sourcePosition.xy == DROP_POSITION);
  float zOffset = 0.0;
  
  // Create unique particle signature for consistent per-particle randomization
  float particleSignature = hash(vec2(particleIndex * 0.0173, particleIndex * 0.0239));
  
  if(isNewParticle) {
    // Enhanced particle spawning with better distribution and anti-convergence
    vec2 seed = vec2(particleIndex * bitmap.seed / bitmap.numParticles, bitmap.time * 0.01);
    
    // Multi-layer randomization for better distribution
    vec2 rand = vec2(
      hash(seed + vec2(particleSignature, 0.0)),
      hash(seed + vec2(1.3, particleSignature + 2.1))
    );
    
    // Add temporal variation with different frequencies per particle
    float temporalPhase = particleSignature * 6.28318;
    rand.x = fract(rand.x + sin(bitmap.time * 0.1 * (0.5 + particleSignature) + temporalPhase) * 0.15);
    
    // Use stratified sampling for better spatial distribution
    float gridSize = sqrt(bitmap.numParticles);
    float gridX = mod(particleIndex, gridSize) / gridSize;
    float gridY = floor(particleIndex / gridSize) / gridSize;
    
    // Combine grid position with randomness for stratified random sampling
    rand.x = mix(rand.x, gridX + rand.x / gridSize, 0.7);
    rand.y = mix(rand.y, gridY + rand.y / gridSize, 0.7);
    
    // Apply smoothstep for better latitude distribution
    rand.y = smoothstep(0.0, 1.0, rand.y);

    vec2 vMin, vMax;
    
    // FIXED: Use data bounds for spawning, which may be unwrapped
    if (bitmap.isGlobe == 1) {
      vMin = bitmap.bounds.xy;
      vMax = bitmap.bounds.zw;
    } else {
      // For flat maps, try to use viewport bounds, but fall back to data bounds
      vMin = bitmap.viewportBounds.xy;
      vMax = bitmap.viewportBounds.zw;
      
      // If viewport bounds are wrapped but data is unwrapped, adjust
      if (vMin.x > vMax.x) {
        // Viewport crosses dateline, use data bounds instead for consistency
        vMin = bitmap.bounds.xy;
        vMax = bitmap.bounds.zw;
      }
    }
    
    vec2 position;

    if (bitmap.isGlobe == 1) {
      // Globe logic - spawn directly in data space
      position.x = mix(vMin.x, vMax.x, rand.x);
      
      // Distribute particles evenly across the curved surface
      float phiMin = vMin.y * PI_180;
      float phiMax = vMax.y * PI_180;
      position.y = asin(mix(sin(phiMin), sin(phiMax), rand.y)) / PI_180;
    } else {
      // Flat map logic - spawn directly in data space
      position = mix(vMin, vMax, rand);
    }
    
    // Add small random offset to prevent exact overlaps
    vec2 jitter = noise2D(vec2(particleIndex * 0.031, bitmap.time * 0.001)) * 0.5;
    position += jitter;
    
    targetPosition = vec3(position.x, clamp(position.y, -90.0, 90.0), zOffset);
    return;
  }

  // Enhanced drop logic for better trail continuity with variation
  if(shouldDropParticle(particleIndex, particleAge)) {
    targetPosition.xy = DROP_POSITION;
    return;
  }

  vec2 currentPos = sourcePosition.xy;
  vec2 uv = getUV(currentPos, bitmap.bounds);
  vec4 bitmapColour = texture(bitmapTexture, uv);

  // Enhanced data validation for smoother trails
  if (bitmapColour.a < 0.1) {
    targetPosition.xy = DROP_POSITION;
    return;
  }

  // Enhanced speed calculation with per-particle variation
  vec2 speed = bitmapColour.xy * bitmap.speedFactor;
  
  // Add per-particle speed variation to prevent synchronization
  float speedVariation = 0.7 + 0.6 * hash(vec2(particleIndex * 0.019, 4.5));
  speed *= speedVariation;
  
  // Add temporal variation unique to each particle
  float temporalVariation = 0.9 + 0.2 * sin(bitmap.time * 0.05 * (1.0 + particleSignature * 0.5) + particleSignature * 6.28318);
  speed *= temporalVariation;
  
  // Add small turbulence to prevent particles from following identical paths
  vec2 turbulence = noise2D(vec2(
    currentPos.x * 0.1 + bitmap.time * 0.01,
    currentPos.y * 0.1 + particleIndex * 0.001
  )) * 0.02;
  
  // Scale turbulence based on speed magnitude to maintain natural flow
  float speedMag = length(speed);
  if (speedMag > 0.001) {
    turbulence *= min(1.0, speedMag * 10.0);
  }
  
  speed += turbulence * bitmap.speedFactor;
  
  vec2 newPos;

  if (bitmap.isGlobe == 1) {
    float lat = currentPos.y * PI_180;
    float cosLat = cos(lat);
    // Convert speed (m/s) to degrees for both lat and lon
    float dLat = (speed.y) / (R_EARTH * PI_180);
    float dLon = (speed.x) / (R_EARTH * cosLat * PI_180);
    
    // Add slight random walk to prevent convergence
    vec2 randomWalk = noise2D(vec2(particleIndex * 0.027, bitmap.time * 0.003)) * 0.001;
    dLat += randomWalk.y;
    dLon += randomWalk.x;
    
    newPos = currentPos + vec2(dLon, dLat);
    newPos.y = clamp(newPos.y, -89.0, 89.0);
  } else {
    // Apply Mercator distortion correction
    float lat = clamp(currentPos.y, -85.0, 85.0); // Prevent extreme latitudes
    float cosLat = cos(lat * PI_180);
    
    // Add slight random walk to prevent convergence
    vec2 randomWalk = noise2D(vec2(particleIndex * 0.027, bitmap.time * 0.003)) * 0.0001;
    
    newPos = currentPos + vec2(speed.x + randomWalk.x, (speed.y + randomWalk.y) * cosLat);
  }

  // Only apply wrapping if the particle moves outside the data bounds
  if (newPos.x < bitmap.bounds.x) {
    // Particle moved past western edge - wrap to eastern edge
    newPos.x = bitmap.bounds.z - (bitmap.bounds.x - newPos.x);
  } else if (newPos.x > bitmap.bounds.z) {
    // Particle moved past eastern edge - wrap to western edge  
    newPos.x = bitmap.bounds.x + (newPos.x - bitmap.bounds.z);
  }

  targetPosition = vec3(newPos.x, clamp(newPos.y, -90.0, 90.0), zOffset);
}
`;

export default shader;