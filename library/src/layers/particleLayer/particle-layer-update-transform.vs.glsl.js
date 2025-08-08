const shader = `\
#version 300 es
#define SHADER_NAME particle_layer_update_transform_vertex_shader

precision highp float;

in vec3 sourcePosition;
out vec3 targetPosition;

uniform sampler2D bitmapTexture;

const vec2 DROP_POSITION    = vec2(0.0);
const vec2 RAND_SEED_A      = vec2(12.9898, 78.233);
const vec2 RAND_SEED_B      = vec2(17.2341, 91.442);
const float RAND_MULTIPLIER = 43758.5453;
const float PI              = 3.14159265359;
const float PI_180          = 0.017453292519943295;
const float R_EARTH         = 6371000.0;

float fastRand(vec2 seed) {
  return fract(sin(dot(seed, RAND_SEED_A)) * RAND_MULTIPLIER);
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 noise2D(vec2 p) {
  return vec2(
    hash(p),
    hash(p + vec2(5.123, 7.456))
  ) * 2.0 - 1.0;
}

bool isGlobalData(vec4 bounds) {
  float lonSpan = bounds.z - bounds.x;
  float latSpan = bounds.w - bounds.y;
  return lonSpan >= 350.0 && latSpan >= 170.0;
}

bool isPacificCentered(vec4 bounds) {
  return bounds.x >= 180.0 && bounds.z > 360.0;
}

bool isInDataBounds(vec2 pos, vec4 bounds) {
  bool inLat = pos.y >= bounds.y && pos.y <= bounds.w;
  if (!inLat) return false;
  
  if (isGlobalData(bounds)) {
    return true;
  }
  
  return pos.x >= bounds.x && pos.x <= bounds.z;
}

bool isInViewportBounds(vec2 pos, vec4 viewportBounds) {

  bool inLat = viewportBounds.y <= pos.y && pos.y <= viewportBounds.w;
  if (!inLat) return false;

  float lng = pos.x;
  float minLng = viewportBounds.x;
  float maxLng = viewportBounds.z;
  
  float standardLng = lng;
  if (lng > 180.0) {
    standardLng = lng - 360.0; 
  }
  
  // Check if longitude is in viewport bounds
  if (minLng <= maxLng) {

    return (lng >= minLng && lng <= maxLng) || 
           (standardLng >= minLng && standardLng <= maxLng);
  } else {

    return (lng >= minLng || lng <= maxLng) || 
           (standardLng >= minLng || standardLng <= maxLng);
  }
}

vec2 getUV(vec2 pos, vec4 bounds) {
  float lonSpan = bounds.z - bounds.x;
  float latSpan = bounds.w - bounds.y;
  
  float u;
  if (isGlobalData(bounds)) {

    float normalizedLon = pos.x;
    
    if (isPacificCentered(bounds)) {
      u = (normalizedLon - bounds.x) / lonSpan;
    } else {
      if (normalizedLon < 0.0) {
        normalizedLon += 360.0;
      }
      u = normalizedLon / 360.0;
    }
    
    u = fract(u);
  } else {
    u = (pos.x - bounds.x) / lonSpan;
    u = clamp(u, 0.0, 1.0);
  }
  
  float v = (pos.y - bounds.w) / (bounds.y - bounds.w);
  v = clamp(v, 0.0, 1.0);
  
  return vec2(u, v);
}

bool shouldDropParticle(float particleIndex, float particleAge) {
  float particleLifeVariation = hash(vec2(particleIndex * 0.01, 0.5)) * 0.4 + 0.8;
  float adjustedMaxAge = bitmap.maxAge * particleLifeVariation;
  
  float cycleLength = adjustedMaxAge + 3.0 + hash(vec2(particleIndex * 0.017, 1.3)) * 5.0;
  float timeOffset = hash(vec2(particleIndex * 0.023, 2.7)) * cycleLength;
  bool ageCycle = abs(mod(particleIndex + timeOffset, cycleLength) - mod(bitmap.time * 0.5, cycleLength)) < 0.5;
  
  if (bitmap.isGlobe == 1) {
    return ageCycle || !isInDataBounds(sourcePosition.xy, bitmap.bounds);
  } else {
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

  if(particleAge > 0.0) {
    return;
  }

  bool isNewParticle = (sourcePosition.xy == DROP_POSITION);
  float zOffset = 0.0;
  
  float particleSignature = hash(vec2(particleIndex * 0.0173, particleIndex * 0.0239));
  
  if(isNewParticle) {
    vec2 seed = vec2(particleIndex * bitmap.seed / bitmap.numParticles, bitmap.time * 0.01);
    
    vec2 rand = vec2(
      hash(seed + vec2(particleSignature, 0.0)),
      hash(seed + vec2(1.3, particleSignature + 2.1))
    );
    
    float temporalPhase = particleSignature * 6.28318;
    rand.x = fract(rand.x + sin(bitmap.time * 0.1 * (0.5 + particleSignature) + temporalPhase) * 0.15);
    
    float gridSize = sqrt(bitmap.numParticles);
    float gridX = mod(particleIndex, gridSize) / gridSize;
    float gridY = floor(particleIndex / gridSize) / gridSize;
    
    rand.x = mix(rand.x, gridX + rand.x / gridSize, 0.7);
    rand.y = mix(rand.y, gridY + rand.y / gridSize, 0.7);
    
    rand.y = smoothstep(0.0, 1.0, rand.y);

    vec2 position;
    
    if (bitmap.isGlobe == 1 && bitmap.cullBackside > 0.5) {
      vec2 center = bitmap.viewportCenter;
      
      // Calculate visible hemisphere bounds
      float lonRadius = 90.0; // degrees
      float latRadius = 90.0; // degrees
      
      float minLon = center.x - lonRadius;
      float maxLon = center.x + lonRadius;
      float minLat = max(center.y - latRadius, bitmap.bounds.y);
      float maxLat = min(center.y + latRadius, bitmap.bounds.w);
      
      // Handle Pacific-centered coordinates properly
      if (isPacificCentered(bitmap.bounds)) {
        // Ensure center coordinates are in same system as bounds
        float centerLon = center.x;
        if (centerLon < 180.0) {
          centerLon += 360.0;  // Convert to Pacific-centered
        }
        
        minLon = centerLon - lonRadius;
        maxLon = centerLon + lonRadius;
        
        // Wrap within data bounds
        if (minLon < bitmap.bounds.x) minLon += 360.0;
        if (maxLon > bitmap.bounds.z) maxLon -= 360.0;
      }
      
      // Spawn particles in visible hemisphere
      if (maxLon < minLon) {
        // Wrapped case
        if (rand.x < 0.5) {
          position.x = mix(minLon, bitmap.bounds.z, rand.x * 2.0);
        } else {
          position.x = mix(bitmap.bounds.x, maxLon, (rand.x - 0.5) * 2.0);
        }
      } else {
        // Normal case
        position.x = mix(minLon, maxLon, rand.x);
      }
      
      // Latitude with spherical distribution bias
      float latCenter = (minLat + maxLat) * 0.5;
      float latSpan = (maxLat - minLat) * 0.5;
      position.y = latCenter + latSpan * (rand.y - 0.5) * 2.0;
      position.y = clamp(position.y, minLat, maxLat);
      
    } else {
      // Standard spawning (flat map or globe without culling)
      vec2 vMin = bitmap.bounds.xy;
      vec2 vMax = bitmap.bounds.zw;
      
      if (bitmap.isGlobe == 1) {
        // Globe without culling - spherical distribution
        position.x = mix(vMin.x, vMax.x, rand.x);
        
        // Distribute evenly across curved surface
        float phiMin = vMin.y * PI_180;
        float phiMax = vMax.y * PI_180;
        position.y = asin(mix(sin(phiMin), sin(phiMax), rand.y)) / PI_180;
      } else {
        // Flat map - rectangular distribution
        position = mix(vMin, vMax, rand);
      }
    }
    
    vec2 jitter = noise2D(vec2(particleIndex * 0.031, bitmap.time * 0.001)) * 0.5;
    position += jitter;
    
    position.y = clamp(position.y, -90.0, 90.0);
    
    targetPosition = vec3(position.x, position.y, zOffset);
    return;
  }

  if(shouldDropParticle(particleIndex, particleAge)) {
    targetPosition.xy = DROP_POSITION;
    return;
  }

  vec2 currentPos = sourcePosition.xy;
  vec2 uv = getUV(currentPos, bitmap.bounds);
  vec4 bitmapColour = texture(bitmapTexture, uv);

  if (bitmapColour.a < 0.1) {
    targetPosition.xy = DROP_POSITION;
    return;
  }

  vec2 speed = bitmapColour.xy * bitmap.speedFactor;
  
  float speedVariation = 0.7 + 0.6 * hash(vec2(particleIndex * 0.019, 4.5));
  speed *= speedVariation;
  
  float temporalVariation = 0.9 + 0.2 * sin(bitmap.time * 0.05 * (1.0 + particleSignature * 0.5) + particleSignature * 6.28318);
  speed *= temporalVariation;
  
  vec2 turbulence = noise2D(vec2(
    currentPos.x * 0.1 + bitmap.time * 0.01,
    currentPos.y * 0.1 + particleIndex * 0.001
  )) * 0.02;
  
  float speedMag = length(speed);
  if (speedMag > 0.001) {
    turbulence *= min(1.0, speedMag * 10.0);
  }
  
  speed += turbulence * bitmap.speedFactor;
  
  vec2 newPos;

  if (bitmap.isGlobe == 1) {
    // Globe projection: use spherical coordinates
    float lat = currentPos.y * PI_180;
    float cosLat = cos(lat);
    float dLat = (speed.y) / (R_EARTH * PI_180);
    float dLon = (speed.x) / (R_EARTH * cosLat * PI_180);
    
    // Add random walk component
    vec2 randomWalk = noise2D(vec2(particleIndex * 0.027, bitmap.time * 0.003)) * 0.001;
    dLat += randomWalk.y;
    dLon += randomWalk.x;
    
    newPos = currentPos + vec2(dLon, dLat);
    newPos.y = clamp(newPos.y, -89.0, 89.0);
    
  } else {
    // Flat map: adjust for latitude compression
    float lat = clamp(currentPos.y, -85.0, 85.0);
    float cosLat = cos(lat * PI_180);
    
    vec2 randomWalk = noise2D(vec2(particleIndex * 0.027, bitmap.time * 0.003)) * 0.0001;
    
    newPos = currentPos + vec2(speed.x + randomWalk.x, (speed.y + randomWalk.y) * cosLat);
  }

  float lonSpan = bitmap.bounds.z - bitmap.bounds.x;
  
  if (isGlobalData(bitmap.bounds)) {
    if (newPos.x > bitmap.bounds.z) {
      newPos.x = bitmap.bounds.x + (newPos.x - bitmap.bounds.z);
    } else if (newPos.x < bitmap.bounds.x) {
      newPos.x = bitmap.bounds.z + (newPos.x - bitmap.bounds.x);
    }
  } else {
    if (newPos.x < bitmap.bounds.x) {
      newPos.x = bitmap.bounds.z - (bitmap.bounds.x - newPos.x);
    } else if (newPos.x > bitmap.bounds.z) {
      newPos.x = bitmap.bounds.x + (newPos.x - bitmap.bounds.z);
    }
  }

  targetPosition = vec3(newPos.x, clamp(newPos.y, -90.0, 90.0), zOffset);
}
`;

export default shader;