/* eslint-disable max-len */
import { CompositeLayer } from '@deck.gl/core';
import gUtilities from '../../utilities/graphicsUtilities';
import { ContourLabels } from './contourLabels';
import { isolines } from './raster-marching-squares';
import { getColors } from '../../maps/legend/legendHelperFunctions';
import PathLayer from '../pathLayer/DESIPathLayer';

const defaultProps = {
    elevation: 0,
    pickable: false, // Major performance hit when pickable is true, keep pickable options in the base layer
    widthScale: 30,
    widthMinPixels: 2,
    getWidth: 10,
    // properties to make globe projection work without bleed
    parameters: {
        depthCompare: 'always',
        cullMode: 'back',
    },
};

export default class ContourLayer extends CompositeLayer {
    initializeState() {
        this.state = {};
    }

    // eslint-disable-next-line class-methods-use-this
    shouldUpdateState({ changeFlags }) {
        return changeFlags.propsOrDataChanged;
    }

    // { props, oldProps, changeFlags }
    updateState({ props }) {
        // Get colors, set contour Levels
        const isoLines = [];
        const colorscale = getColors(props.colorLevels, props.colors, props.colorType);
        const contourLevels = props.contourLevels || props.colorLevels;

        // Get isolines
        let { lines } = props;
        if (!lines) {
            lines = isolines(props.data, props.projection.lonlatGrid, undefined, contourLevels);
        }

        // Color isolines
        lines.features.forEach((d, i) => {
            const polygons = d.geometry.coordinates;
            if (polygons.length === 0) {
                return;
            } // there is nothing to plot, continue to next band
            const color = gUtilities.string_to_rgb(colorscale(contourLevels[i]));

            const p = new Array(polygons.length);
            for (let j = 0; j < polygons.length; j += 1) {
                p[j] = new Array(polygons[j].length);
                for (let k = 0; k < polygons[j].length; k += 1) {
                    p[j][k] = [polygons[j][k][0], polygons[j][k][1], props.elevation];
                }
            }
            for (const polygon of p) {
                isoLines.push({
                    polygon,
                    color,
                });
            }
        });

        this.setState({
            lines,
            isoLines,
        });
    }

    renderLayers() {
        const { isoLines, lines } = this.state;

        const contourLayer = new PathLayer(this.props, {
            positionFormat: 'XYZ',
            getPath: (d) => d.polygon,
            getColor: (d) => d.color,
            id: `${this.props.id}-path`,
            data: isoLines,
        });

        let contourLabels;
        if (this.props.labels?.enabled) {
            contourLabels = new ContourLabels({
                ...this.props.labels,
                id: `${this.props.id}-labels`,
                lines,
            });
        }

        return [contourLayer, contourLabels];
    }
}

ContourLayer.layerName = 'ContourLayer';
ContourLayer.defaultProps = defaultProps;

export { ContourLayer };
