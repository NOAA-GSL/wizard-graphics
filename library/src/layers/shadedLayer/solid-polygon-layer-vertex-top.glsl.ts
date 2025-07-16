// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import main from './solid-polygon-layer-vertex-main.glsl';

export default `\
#version 300 es
#define SHADER_NAME solid-polygon-layer-vertex-shader

in vec3 vertexPositions;
in vec3 vertexPositions64Low;
in float elevations;
in float vertex1;
in float vertex2;
in float vertex3;
in float polygondata;
in float opacitydata;

${main}

void main(void) {
  PolygonProps props;

  props.positions = vertexPositions;
  props.positions64Low = vertexPositions64Low;
  props.elevations = elevations;
  props.vertex1    = vertex1;
  props.vertex2    = vertex2;
  props.vertex3    = vertex3;
  props.polygondata = polygondata;
  props.opacitydata = opacitydata;
  props.normal = vec3(0.0, 0.0, 1.0);

  calculatePosition(props);
}
`;
