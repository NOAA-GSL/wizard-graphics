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
  fragColor = ( pdata >= 0.0 && pdata <= 1.0 ) ? texture(sampler, vec2(pdata, 0.5)) : vec4(0,0,0,0);

  if (odata >= 0.0 && odata <= 1.0) {
    fragColor = vec4(fragColor.rgb, fragColor.a * layer.opacity * odata );
  }
  else {
    fragColor = vec4(fragColor.rgb, fragColor.a * layer.opacity );
  }


  // Fails to compile on some Android devices if geometry is never assigned (#8411)
  geometry.uv = vec2(0.);

  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;
