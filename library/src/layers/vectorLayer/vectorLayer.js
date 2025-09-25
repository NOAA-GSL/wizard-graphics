/* eslint-disable max-len */
import { CompositeLayer } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';
import barbsPNG from './barbs-new.png?url';
import gUtilities from '../../utilities/graphicsUtilities';
import deckUtilities from '../../utilities/deckUtilities';

//
// Constants for Korri's wind barbs
const clampNum = (x) => `barb${Math.floor(x / 5) * 5}`;
const ICON_MAPPING = {};
const IconRow = (x) => 4 - 1 - Math.floor((x + 2.5) / 50);
const IconCol = (x) => Math.floor(((x + 2.5) % 50.0) / 5.0);

for (let barbidx = 0; barbidx <= 175; barbidx += 5) {
    ICON_MAPPING[`barb${barbidx}`] = {
        x: IconCol(barbidx) * 100,
        y: IconRow(barbidx) * 100,
        width: 100,
        anchorY: 11,
        anchorX: 67,
        height: 100,
        mask: true,
    };
}

const defaultProps = {
    sizeScale: 25,
    elevation: 0,
    angleOffset: 0,
    billboard: false,
    getColor: (x) => x.color || [0, 0, 0, 255],
    getLabel: (x) => x.label,
    getWeight: (x) => x.weight || 1,
    getPosition: (x) => x.position,
    parameters: { depthCompare: 'always', cullMode: 'front' },
};

export default class VectorLayer extends CompositeLayer {
    initializeState() {
        this.state = {
            // Cached tags per zoom level
            zoom: 9999,
        };
    }

    // eslint-disable-next-line class-methods-use-this
    shouldUpdateState({ changeFlags }) {
        return changeFlags.somethingChanged;
    }

    updateState({ props, oldProps, changeFlags }) {
        super.updateState({ props, oldProps, changeFlags });
        const { viewport } = this.context;
        const { zoom } = viewport;

        // Only update the layer if propsOrDataChanged or
        // if zoom has changed by 0.5 or more
        if (!changeFlags.propsOrDataChanged) {
            if (!zoom || Math.abs(zoom - this.state.zoom) < 0.5) return;
        }

        const { projection, dataDir, dataMag } = props;
        const { lonlatGrid } = projection;
        const { latPerPixel, lonPerPixel } = deckUtilities.getLatLonPerPixel(viewport);

        // Number barbs per lat
        const jlen = lonlatGrid.length;
        const ilen = lonlatGrid[0].length;
        const barbsPerLat = jlen / Math.abs(lonlatGrid[0][0][1] - lonlatGrid[jlen - 1][0][1]);
        const barbsPerLon = ilen / Math.abs(lonlatGrid[0][0][0] - lonlatGrid[0][ilen - 1][0]);

        const sizeScale = props.sizeScale * zoom ** 0.25;
        // Ideal spacing between barbs is 1.25 the length of a barb
        const idealSpacingPixelPerBarb = props.sizeScale * 1.25;
        const xpixelPerBarb = 1 / (barbsPerLat * latPerPixel);
        const ypixelPerBarb = 1 / (barbsPerLon * lonPerPixel);
        const xInterval = Math.max(Math.round(idealSpacingPixelPerBarb / xpixelPerBarb), 1);
        const yInterval = Math.max(Math.round(idealSpacingPixelPerBarb / ypixelPerBarb), 1);

        const numy = Math.ceil(jlen / yInterval);
        const numx = Math.ceil(ilen / xInterval);
        const data = new Array(numx * numy);

        let count = 0;
        for (let j = 0; j < jlen; j += yInterval) {
            for (let i = 0; i < ilen; i += xInterval) {
                const lon = lonlatGrid[j][i][0];
                const lat = lonlatGrid[j][i][1];
                const idx = gUtilities.ijToIdx(i, j, ilen, jlen);
                let scale = dataMag[idx] / 30;
                if (scale > 0.6) {
                    scale = 0.6;
                }
                if (scale < 0.3) {
                    scale = 0.3;
                }
                data[count] = {
                    position: [lon, lat, props.elevation],
                    speed: dataMag[idx],
                    angle: -dataDir[idx] + 180 + props.angleOffset,
                    // scale: size*scale
                };
                count += 1;
            }
        }

        this.setState({ zoom, data, sizeScale });
    }

    renderLayers() {
        const { data } = this.state;

        if (!data.length) return;
        const vectorLayer = new IconLayer(this.props, {
            id: `${this.props.id}-icon`,
            data,
            // sizeScale: this.state.sizeScale,
            getIcon: (d) => clampNum(d.speed),
            getAngle: (d) => d.angle,
            getPosition: (d) => d.position,
            // false switches wind direction in globe view
            // true makes the wind barbs follow you, making them change directions
            iconAtlas: barbsPNG,
            iconMapping: ICON_MAPPING,
        });

        // eslint-disable-next-line consistent-return
        return vectorLayer;
    }
}

VectorLayer.layerName = 'VectorLayer';
VectorLayer.defaultProps = defaultProps;

export { VectorLayer };
