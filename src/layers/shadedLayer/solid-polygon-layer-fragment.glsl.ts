// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

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

uniform bool hasTexture;
uniform bool interpolateData;
uniform sampler2D sampler;
uniform float opacity;

out vec4 fragColor;

void main(void) {
  //fragColor = vColor;

  if ( hasTexture && interpolateData ) {
    fragColor = ( pdata >= 0.0 && pdata <= 1.0 ) ? texture(sampler, vec2(pdata, 0.5)) : vec4(0,0,0,0);

    // If we have normals, add lighting effects
    // old code for lighting effects, used when normals are provided (i.e. hrrr smoke/marching cubes)
    //if ( normalsIncluded ){
    //  vec3 lightColor = lighting_getLightColor(fragColor.rgb, cameraPosition, position_commonspace.xyz, normalsProvided);
    //  fragColor = vec4(lightColor,1);  
    //}


    if (odata >= 0.0 && odata <= 1.0) {
      fragColor = vec4(fragColor.rgb, fragColor.a * opacity * odata );
    }
    else {
      fragColor = vec4(fragColor.rgb, fragColor.a * opacity );
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
    fragColor = vec4(fragColor.rgb, fragColor.a * opacity );

  }


  // Fails to compile on some Android devices if geometry is never assigned (#8411)
  geometry.uv = vec2(0.);

  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;
