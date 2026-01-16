export default `#version 300 es
#define SHADER_NAME particle_layer_update_transform_vertex_shader

precision highp float;

in vec3 sourcePosition;
out vec3 targetPosition;

uniform sampler2D bitmapTexture;
uniform sampler2D noiseTexture;

const vec2  DROP_POSITION = vec2(0.0);
const float PI            = 3.141592653589793;
const float DEG2RAD       = 0.017453292519943295;
const float RAD2DEG       = 57.29577951308232;
const float R_EARTH       = 6370972.0;
const float NOISE_TEX_SIZE = 256.0;
const float PARTICLE_ELEVATION = 100.0; // meters 

// Optimized hash functions using pre-computed noise texture
// Much faster than computing sin() per particle
float hash1D(float n) { 
  vec2 uv = vec2(fract(n * 0.00390625), fract(n * 0.015625));
  return texture(noiseTexture, uv).r;
}

float hash(vec2 p) {
  vec2 uv = fract(p * 0.00390625);
  return texture(noiseTexture, uv).g;
}

vec2 noise2D(vec2 p) { 
  vec2 uv = fract(p * 0.00390625);
  vec4 n = texture(noiseTexture, uv);
  return n.rg * 2.0 - 1.0;
}

float rad(float d) { return d * DEG2RAD; }
float deg(float r) { return r * RAD2DEG; }

vec3 llToNormal(vec2 llDeg) {
  float lon = rad(llDeg.x);
  float lat = rad(llDeg.y);
  float cl = cos(lat);
  return vec3(cl * cos(lon), cl * sin(lon), sin(lat));
}

float greatCircleDistance(vec2 pos1, vec2 pos2) {
  float lat1 = rad(pos1.y), lon1 = rad(pos1.x);
  float lat2 = rad(pos2.y), lon2 = rad(pos2.x);
  float dLat = lat2 - lat1;
  float dLon = lon2 - lon1;
  if (abs(dLon) > PI) dLon = dLon > 0.0 ? dLon - 2.0 * PI : dLon + 2.0 * PI;
  float a = sin(dLat * 0.5); a *= a;
  float b = sin(dLon * 0.5); b *= b;
  float c = 2.0 * atan(sqrt(a + cos(lat1) * cos(lat2) * b), sqrt(1.0 - a - cos(lat1) * cos(lat2) * b));
  return deg(c);
}

float hemisphereVisibility(vec2 llDeg, vec2 centerLLDeg) {
  float d = dot(llToNormal(llDeg), llToNormal(centerLLDeg));
  // Smooth fade from ~110° back side
  return smoothstep(-0.342, 0.0, d); // -0.342 ≈ cos(110°)
}

bool isGlobalData(vec4 b) {
  float lonSpan = b.z - b.x;
  float latSpan = b.w - b.y;
  return lonSpan >= 350.0 && latSpan >= 170.0;
}

float wrapLongitude(float lng) {
  return mod(lng + 180.0, 360.0) - 180.0;
}

// Adapts longitude to the bounds domain (handles 0-360 vs -180/180)
float adjustLon(float lon, vec4 b) {
  if (b.z > 180.0 && lon < 0.0) {
    return lon + 360.0;
  }
  return lon;
}

bool isInDataBounds(vec2 pos, vec4 b) {
  if (pos.y < b.y || pos.y > b.w) return false;
  if (isGlobalData(b)) return true;
  
  float px = adjustLon(pos.x, b);
  return px >= b.x && px <= b.z;
}

bool isInViewportBounds(vec2 pos, vec4 vb) {
  if (pos.y < vb.y || pos.y > vb.w) return false;

  float lng = mod(pos.x + 180.0, 360.0) - 180.0;
  float minLng = mod(vb.x + 180.0, 360.0) - 180.0;
  float maxLng = mod(vb.z + 180.0, 360.0) - 180.0;

  // If viewport crosses dateline
  return (minLng <= maxLng) ? (lng >= minLng && lng <= maxLng) : (lng >= minLng || lng <= maxLng);
}

vec2 getUV(vec2 pos, vec4 b) {
  float v = clamp((pos.y - b.w) / (b.y - b.w), 0.0, 1.0);
  float u;
  if (isGlobalData(b)) {
    float minLon = b.x;
    float offsetLon = pos.x - minLon;
    float lon360 = mod(offsetLon, 360.0);
    if (lon360 < 0.0) lon360 += 360.0;
    u = clamp(lon360 / 360.0, 0.0, 1.0);
  } else {
    float px = adjustLon(pos.x, b);
    float lonSpan = max(1e-6, b.z - b.x);
    u = clamp((px - b.x) / lonSpan, 0.0, 1.0);
  }
  return vec2(u, v);
}

vec2 destinationPoint(vec2 fromLL, float distMeters, float bearingDegrees) {
  float d = distMeters / R_EARTH;
  float r = rad(bearingDegrees);
  float y1 = rad(fromLL.y);
  float x1 = rad(fromLL.x);

  float siny2 = sin(y1) * cos(d) + cos(y1) * sin(d) * cos(r);
  float y2 = asin(siny2);
  float y = sin(r) * sin(d) * cos(y1);
  float x = cos(d) - sin(y1) * siny2;
  float x2 = x1 + atan(y, x);

  return vec2(deg(x2), deg(y2));
}

vec2 spawnOnGlobeRadius(float particleIndex) {
  float phase = sin(bitmap.time * 0.15 + particleIndex * 0.0073) * 0.5 + 0.5;

  vec2 rnd = vec2(
    hash1D(particleIndex * 0.013 + phase * 2.1),
    hash1D(particleIndex * 0.017 + phase * 3.7)
  );

  float rMeters = sqrt(max(1e-6, rnd.x)) * max(0.0, bitmap.viewportGlobeRadius);
  float bearing = rnd.y * 360.0;

  vec2 pos = destinationPoint(bitmap.viewportCenter, rMeters, bearing);

  pos += noise2D(vec2(particleIndex * 0.031, bitmap.time * 0.001)) * 0.25;
  pos.y = clamp(pos.y, bitmap.bounds.y, bitmap.bounds.w);
  pos.x = isGlobalData(bitmap.bounds) ? wrapLongitude(pos.x) : clamp(pos.x, bitmap.bounds.x, bitmap.bounds.z);

  return pos;
}

bool onFrontHemisphere(vec2 llDeg, vec2 centerLLDeg, float threshold) {
  return dot(llToNormal(llDeg), llToNormal(centerLLDeg)) >= threshold;
}

vec2 advectOnGlobe(vec2 currentPos, vec2 speed, float particleIndex, float dt) {
  float latRad = rad(clamp(currentPos.y, -89.9, 89.9));
  float cosLat = max(1e-6, cos(latRad));

  float sig = hash1D(particleIndex * 0.0239);
  float speedVar = 0.7 + 0.6 * hash1D(particleIndex * 0.019 + 4.5);
  float temporalVar = 0.9 + 0.2 * sin(bitmap.time * 0.05 * (1.0 + sig * 0.5) + sig * 6.28318);

  float dLat = speed.y * bitmap.speedFactor * dt * speedVar * temporalVar;
  float dLon = speed.x * bitmap.speedFactor * dt * speedVar * temporalVar / cosLat;

  vec2 turb = noise2D(vec2(currentPos.x * 0.1 + bitmap.time * 0.01, currentPos.y * 0.1 + particleIndex * 0.001)) * 0.02;
  float speedMag = length(speed);
  if (speedMag > 0.001) {
    turb *= min(1.0, speedMag * 10.0);
    turb *= cosLat;
  }
  dLat += turb.y * bitmap.speedFactor * dt;
  dLon += turb.x * bitmap.speedFactor * dt / cosLat;

  vec2 randomWalk = noise2D(vec2(particleIndex * 0.027, bitmap.time * 0.003)) * 0.001;
  dLat += randomWalk.y;
  dLon += randomWalk.x;

  vec2 newPos = vec2(currentPos.x + dLon, currentPos.y + dLat);

  if (newPos.y > 90.0) { newPos.y = 180.0 - newPos.y; newPos.x += 180.0; }
  else if (newPos.y < -90.0) { newPos.y = -180.0 - newPos.y; newPos.x += 180.0; }

  newPos.x = wrapLongitude(newPos.x);
  return newPos;
}

bool shouldDropParticle(float particleIndex, float particleAge, vec2 currentPos, vec2 centerLL) {
  float lifeVar = hash1D(particleIndex * 0.01 + 0.5) * 0.4 + 0.8;
  float adjustedMaxAge = bitmap.maxAge * lifeVar;

  float cycleLength = adjustedMaxAge + 3.0 + hash1D(particleIndex * 0.017 + 1.3) * 5.0;
  float timeOffset = hash1D(particleIndex * 0.023 + 2.7) * cycleLength;
  bool ageCycle = abs(mod(particleIndex + timeOffset, cycleLength) - mod(bitmap.time * 0.5, cycleLength)) < 0.5;

  bool drop = ageCycle;

  if (bitmap.isGlobe == 1) {
    if (bitmap.cullBackside == 1) {
      float cullProbability = 1.0 - hemisphereVisibility(currentPos, centerLL);
      if (hash1D(particleIndex * 0.013 + bitmap.time * 0.002) < cullProbability) drop = true;
    }
    if (!isInDataBounds(currentPos, bitmap.bounds)) drop = true;
    if (greatCircleDistance(currentPos, centerLL) > 90.0) drop = true;
  } else {
    bool zoomCull = bitmap.viewportZoomChangeFactor > 1.5 &&
                    mod(particleIndex + hash1D(particleIndex * 0.013 + 3.2) * 10.0,
                        bitmap.viewportZoomChangeFactor * 0.5) >= 0.5;
    bool boundsCull = !isInViewportBounds(currentPos, bitmap.viewportBounds) ||
                      !isInDataBounds(currentPos, bitmap.bounds);
    if (zoomCull || boundsCull) drop = true;
  }
  return drop;
}

void main() {
  float particleIndex = mod(float(gl_VertexID), bitmap.numParticles);
  float particleAge   = floor(float(gl_VertexID) / bitmap.numParticles);

  if (particleAge > 0.0) { return; }

  bool isNewParticle = (sourcePosition.xy == DROP_POSITION);

  if (isNewParticle) {
    vec2 position;
    if (bitmap.isGlobe == 1) {
      position = spawnOnGlobeRadius(particleIndex);
      if (bitmap.cullBackside == 1 && !onFrontHemisphere(position, bitmap.viewportCenter, -0.1)) {
        targetPosition.xy = DROP_POSITION;
        targetPosition.z = 0.0;
        return;
      }
    } else {
      vec2 rnd = vec2(
        hash1D(particleIndex * 0.041 + 0.73 + bitmap.time * 0.001),
        hash1D(particleIndex * 0.053 + 1.91 + bitmap.time * 0.001)
      );
      position = mix(bitmap.viewportBounds.xy, bitmap.viewportBounds.zw, rnd);
    }
    targetPosition = vec3(position, PARTICLE_ELEVATION);
    return;
  }

  if (shouldDropParticle(particleIndex, particleAge, sourcePosition.xy, bitmap.viewportCenter)) {
    targetPosition = vec3(DROP_POSITION, 0.0); // Keep dropped particles at z=0 for detection
    return;
  }

  vec2 currentPos = sourcePosition.xy;

  vec2 uvPos = currentPos;
  if (isGlobalData(bitmap.bounds)) {
    float lon360 = mod(uvPos.x, 360.0);
    if (lon360 < 0.0) lon360 += 360.0;
    uvPos.x = lon360;
  }

  vec2 uv = getUV(uvPos, bitmap.bounds);
  vec4 wind = texture(bitmapTexture, uv);

  // Drop particles with no data
  float windSpeed = length(wind.xy);
  if (wind.a < 0.1) {
    targetPosition = vec3(DROP_POSITION, 0.0);
    return;
  }

  vec2 newPos;
  if (bitmap.isGlobe == 1) {
    newPos = advectOnGlobe(currentPos, wind.xy, particleIndex, 1.0);
    if (bitmap.cullBackside == 1 && hemisphereVisibility(newPos, bitmap.viewportCenter) < 0.1) {
      targetPosition = vec3(DROP_POSITION, 0.0);
      return;
    }
  } else {
    float lat = clamp(currentPos.y, -85.0, 85.0);
    float cosLat = cos(rad(lat));

    float sig = hash1D(particleIndex * 0.0239);
    float speedVar = 0.7 + 0.6 * hash1D(particleIndex * 0.019 + 4.5);
    float temporalVar = 0.9 + 0.2 * sin(bitmap.time * 0.05 * (1.0 + sig * 0.5) + sig * 6.28318);
    vec2 speed = wind.xy * (speedVar * temporalVar);

    vec2 turb = noise2D(vec2(currentPos.x * 0.1 + bitmap.time * 0.01, currentPos.y * 0.1 + particleIndex * 0.001)) * 0.02;
    float sMag = length(speed);
    if (sMag > 0.001) turb *= min(1.0, sMag * 10.0);
    speed += turb;

    vec2 randomWalk = noise2D(vec2(particleIndex * 0.027, bitmap.time * 0.003)) * 0.0001;

    newPos = currentPos + vec2(
      (speed.x + randomWalk.x) * bitmap.speedFactor / cosLat,
      (speed.y + randomWalk.y) * bitmap.speedFactor
    );
  }

  if (isGlobalData(bitmap.bounds)) {
    newPos.x = wrapLongitude(newPos.x);
  } else {
    if (newPos.x < bitmap.bounds.x) newPos.x = bitmap.bounds.z - (bitmap.bounds.x - newPos.x);
    else if (newPos.x > bitmap.bounds.z) newPos.x = bitmap.bounds.x + (newPos.x - bitmap.bounds.z);
  }

  targetPosition = vec3(newPos, PARTICLE_ELEVATION);
}
`;