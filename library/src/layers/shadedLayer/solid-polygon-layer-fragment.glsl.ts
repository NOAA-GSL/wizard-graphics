// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

export default `\
#version 300 es
#define SHADER_NAME solid-polygon-layer-fragment-shader

precision highp float;

in vec4 vColor;
in float pdata;
in float odata;
in float v1;
in float v2;
in float v3;

uniform sampler2D sampler;
out vec4 fragColor;

void main(void) {

  if ( solidPolygon.interpolateData ) {
    fragColor = ( pdata >= 0.0 && pdata <= 1.0 ) ? texture(sampler, vec2(pdata, 0.5)) : vec4(0,0,0,0);
    
    // If we have normals, add lighting effects
    // old code for lighting effects, used when normals are provided (i.e. hrrr smoke/marching cubes)
    //if ( normalsIncluded ){
    //  vec3 lightColor = lighting_getLightColor(fragColor.rgb, cameraPosition, position_commonspace.xyz, normalsProvided);
    //  fragColor = vec4(lightColor,1);  
    //}


    if (odata >= 0.0 && odata <= 1.0) {
      fragColor = vec4(fragColor.rgb, fragColor.a * layer.opacity * odata );
    }
    else {
      fragColor = vec4(fragColor.rgb, fragColor.a * layer.opacity );
    }

  }
  else {  

    vec4 c = vColor;
    if ( c.r > c.g && c.r > c.b ){
      fragColor = (v1 <= 1.0 && v1 >= 0.0) ? texture(sampler, vec2(v1, 0.5)) : vec4(0,0,0,0);
    }
    else if ( c.g > c.r && c.g > c.b ){
      fragColor = (v2 <= 1.0 && v2 >= 0.0) ? texture(sampler, vec2(v2, 0.5)) : vec4(0,0,0,0);
    }
    else if ( c.b > c.r && c.b > c.g ){
      fragColor = (v3 <= 1.0 && v3 >= 0.0) ? texture(sampler, vec2(v3, 0.5)) : vec4(0,0,0,0);
    }
    else {
      fragColor = vec4(0,0,0,1);
    }
    fragColor = vec4(fragColor.rgb, fragColor.a * layer.opacity );

  }


  // Fails to compile on some Android devices if geometry is never assigned (#8411)
  geometry.uv = vec2(0.);

  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;
