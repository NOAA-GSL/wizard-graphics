// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {ShaderModule} from '@luma.gl/shadertools';

// Order matters here, keep everything in order for all variables
// - If not in same order, variables will not work correctly
// - THW lost 3 hours of his life to this
const uniformBlock = `\
uniform solidPolygonUniforms {
  bool extruded;
  bool isWireframe;
  float elevationScale;
  bool hasTexture;
  bool interpolateData;
} solidPolygon;
`;

export type SolidPolygonProps = {
  extruded: boolean;
  isWireframe: boolean;
  elevationScale: number;
  hasTexture: boolean;
  interpolateData: boolean;
};

export const solidPolygonUniforms = {
  name: 'solidPolygon',
  vs: uniformBlock,
  fs: uniformBlock,
  uniformTypes: {
    extruded: 'f32',
    isWireframe: 'f32',
    elevationScale: 'f32',
    hasTexture: 'f32',
    interpolateData: 'f32'
  }
} as const satisfies ShaderModule<SolidPolygonProps>;
