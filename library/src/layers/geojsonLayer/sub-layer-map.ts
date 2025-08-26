// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import { CompositeLayer } from '@deck.gl/core';
import PathLayer from '../pathLayer/DESIPathLayer.js';

export const LINE_LAYER = {
    type: PathLayer,
    props: {
        lineWidthUnits: 'widthUnits',
        lineWidthScale: 'widthScale',
        lineWidthMinPixels: 'widthMinPixels',
        lineWidthMaxPixels: 'widthMaxPixels',
        lineJointRounded: 'jointRounded',
        lineCapRounded: 'capRounded',
        lineMiterLimit: 'miterLimit',
        lineBillboard: 'billboard',

        getLineColor: 'getColor',
        getLineWidth: 'getWidth',
    },
};

export function forwardProps(
    layer: CompositeLayer,
    mapping: Record<string, string>,
): Record<string, any> {
    const { transitions, updateTriggers } = layer.props;
    const result: Record<string, any> = {
        updateTriggers: {},
        transitions: transitions && {
            getPosition: transitions.geometry,
        },
    };

    for (const sourceKey in mapping) {
        const targetKey = mapping[sourceKey];
        let value = layer.props[sourceKey];
        if (sourceKey.startsWith('get')) {
            // isAccessor
            value = (layer as any).getSubLayerAccessor(value);
            result.updateTriggers[targetKey] = updateTriggers[sourceKey];
            if (transitions) {
                result.transitions[targetKey] = transitions[sourceKey];
            }
        }
        result[targetKey] = value;
    }
    return result;
}
