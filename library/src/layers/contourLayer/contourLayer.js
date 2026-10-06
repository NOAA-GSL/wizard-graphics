import { CompositeLayer } from '@deck.gl/core';
import gUtilities from '../../utilities/graphicsUtilities';
import { ContourLabels } from './contourLabels';
import { getColors } from '../../maps/legend/legendHelperFunctions';
import PathLayer from '../pathLayer/WizardPathLayer';
import triangleContours from './triangleContours';
import { isolines } from './raster-marching-squares';

const defaultProps = {
    algorithm: 'marchingTriangles',
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

function normalizeContourColors(colors) {
    if (Array.isArray(colors) && colors.length === 1) {
        return colors[0];
    }
    return colors;
}

function sameValues(left, right) {
    return (
        left === right ||
        (Array.isArray(left) &&
            Array.isArray(right) &&
            left.length === right.length &&
            left.every((value, index) => Object.is(value, right[index])))
    );
}

function flattenLonLatGrid(lonlatGrid) {
    if (
        Array.isArray(lonlatGrid) &&
        lonlatGrid.length > 0 &&
        Array.isArray(lonlatGrid[0]) &&
        Array.isArray(lonlatGrid[0][0])
    ) {
        const points = [];
        for (let r = 0; r < lonlatGrid.length; r += 1) {
            for (let c = 0; c < lonlatGrid[r].length; c += 1) {
                points.push(lonlatGrid[r][c]);
            }
        }
        return points;
    }
    return lonlatGrid || [];
}

function contourLines(lonlatGrid, values, levels, algorithm, shape) {
    const points = flattenLonLatGrid(lonlatGrid);
    const contourLevels = (levels || []).filter((level) => Number.isFinite(level));
    if (points.length < 3 || contourLevels.length === 0) {
        return { type: 'FeatureCollection', features: [] };
    }

    if (algorithm === 'marchingSquares') {
        console.debug('ContourLayer method: marchingSquares');
        return isolines(values, lonlatGrid, undefined, contourLevels, shape);
    }

    console.debug('ContourLayer method: marchingTriangles (delaunay)');
    return triangleContours(lonlatGrid, values, contourLevels, shape);
}

export default class ContourLayer extends CompositeLayer {
    initializeState() {
        this.state = {};
    }

    shouldUpdateState({ changeFlags }) {
        return changeFlags.propsOrDataChanged;
    }

    updateState({ props, changeFlags }) {
        const contourLevels = props.contourLevels || props.colorLevels;
        const lonlatGrid = props.lonlatGrid || props.projection?.lonlatGrid;
        const colors = normalizeContourColors(props.colors);
        const { contourInputs, colorInputs } = this.state;
        const geometryChanged =
            !this.state.lines ||
            props.lines !== contourInputs?.lines ||
            (!props.lines &&
                (changeFlags?.dataChanged ||
                    props.data !== contourInputs?.data ||
                    lonlatGrid !== contourInputs?.lonlatGrid ||
                    props.algorithm !== contourInputs?.algorithm ||
                    !sameValues(props.shape, contourInputs?.shape) ||
                    !sameValues(contourLevels, contourInputs?.levels)));
        const colorsChanged =
            !colorInputs ||
            !sameValues(colors, colorInputs.colors) ||
            !sameValues(props.colorLevels, colorInputs.colorLevels) ||
            !sameValues(contourLevels, colorInputs.contourLevels) ||
            props.colorType !== colorInputs.colorType ||
            props.elevation !== colorInputs.elevation;
        if (!geometryChanged && !colorsChanged) {
            return;
        }

        const t0 = performance.now();
        const lines = geometryChanged
            ? props.lines ||
              contourLines(lonlatGrid, props.data, contourLevels, props.algorithm, props.shape)
            : this.state.lines;
        const isoLines = [];
        const colorscale = getColors(props.colorLevels, colors, props.colorType);

        // Color isolines
        lines.features.forEach((d, i) => {
            const polygons = d.geometry.coordinates;
            if (polygons.length === 0) {
                return;
            } // there is nothing to plot, continue to next band
            const contourValue = d?.properties?.[0]?.value;
            const colorValue = Number.isFinite(contourValue) ? contourValue : contourLevels[i];
            const color = gUtilities.string_to_rgb(colorscale(colorValue));

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

        console.debug('contour layer: isolines calculated in ', performance.now() - t0, 'ms');

        this.setState({
            lines,
            isoLines,
            contourInputs: {
                lines: props.lines,
                data: props.data,
                lonlatGrid,
                algorithm: props.algorithm,
                shape: props.shape?.slice(),
                levels: contourLevels?.slice(),
            },
            colorInputs: {
                colors: Array.isArray(colors) ? colors.slice() : colors,
                colorLevels: props.colorLevels?.slice(),
                contourLevels: contourLevels?.slice(),
                colorType: props.colorType,
                elevation: props.elevation,
            },
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
