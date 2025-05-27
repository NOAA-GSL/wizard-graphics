/* eslint-disable max-len */
import { CompositeLayer } from '@deck.gl/core';
import RBush from 'rbush';
import { TextLayer } from '@deck.gl/layers';
import deckUtilities from '../../utilities/deckUtilities';

const defaultProps = {
    getColor: (x) => x.color || [245, 245, 245],
    getBackgroundColor: [255, 255, 255, 150],
    getSize: 12,
    getAngle: 0,
    billboard: false,
    background: false,
    backgroundPadding: [4, 1],
    getTextAnchor: 'middle',
    fontFamily: 'Helvetica',
    getAlignmentBaseline: 'center',
    fontSettings: {
        sdf: true,
        radius: 12,
        cutoff: 0.25,
        buffer: 10,
        smoothing: 0.2, // only applies if sdf is true
    },
    outlineWidth: 4,
    fontWeight: '700',
    outlineColor: [0, 0, 0, 255],
    getLabel: (x) => x.label,
    getWeight: (x) => x.weight || 1,
    getPosition: (x) => x.position,
};

function fillTree(tree, points, text, padding) {
    for (const point of points) {
        const { lat, lon } = point;
        const obj = {
            text,
            lat,
            lon,
            minX: lon - padding,
            minY: lat - padding,
            maxX: lon + padding,
            maxY: lat + padding,
        };
        if (!tree.collides(obj)) {
            tree.insert(obj);
        }
    }
    return tree;
}

export default class ContourLabels extends CompositeLayer {
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

        // Font size of the labels
        const FontsizeInPixels = 14;
        // Tuning variable for spacing between labels on same line
        const spacingOnLine = 50;
        // Tuning variable for spacing between labels on different lines but same value lines (50F contour and another 50F contour)
        const spacingBetweenLinesSameValue = 25;
        // Tuning variable for spacing between labels between lines
        const spacingBetweenLines = 1;

        const { latPerPixel } = deckUtilities.getLatLonPerPixel(viewport);
        const dy = FontsizeInPixels * latPerPixel;

        const { lines } = props;
        // Sort arrays be lengths, so the longest polygon is first
        for (const d of lines.features) {
            if (d.geometry.coordinates !== 0) {
                d.geometry.coordinates.sort((a, b) => b.length - a.length);
            }
        }

        //
        // There are two trees here, one for all the lines (tree)
        // and another just for the line being processed (treeLocal)
        //  - These trees have different paddings
        const tree = new RBush();
        const padding = (dy * spacingBetweenLines) / 2;
        const paddingRegional = (dy * spacingBetweenLinesSameValue) / 2;
        const paddingLocal = (dy * spacingOnLine) / 2;
        for (const feature of lines.features) {
            const text = feature.properties[0].value.toString();
            const treeRegional = new RBush();
            for (const polygon of feature.geometry?.coordinates || []) {
                const treeLocal = new RBush();
                //
                // Loop over all points in the contour and get the slope
                // - we average the slope over numPoints.  This allows us
                //   to capture big/ridges troughs and not just local areas
                //   where the slope is zero
                const points = [];
                // average over 10% of the line length to detect areas where
                // the slope is nearest zero
                const numPoints = Math.round(polygon.length * 0.1);
                for (let i = numPoints; i < polygon.length - 1 - numPoints; i += 1) {
                    const lon = polygon[i][0];
                    const lat = polygon[i][1];
                    // grab slope
                    const x1 = polygon[i - numPoints][0];
                    const y1 = polygon[i - numPoints][1];
                    const x2 = polygon[i + numPoints][0];
                    const y2 = polygon[i + numPoints][1];
                    let slope = (y2 - y1) / (x2 - x1) || 0;
                    slope = Math.abs(slope);
                    points.push({ lat, lon, slope });
                    // Never put a label on a slope greater than 30 degrees
                    // if ( slope < 0.3 ){
                    //    points.push({lat,lon,slope})
                    // }
                }

                // Sort the points by slope and try to add to treeLocal
                points.sort((a, b) => a.slope - b.slope);

                // - This adds the labels that have slopes closest to 0 first
                fillTree(treeLocal, points, text, paddingLocal);
                fillTree(treeRegional, treeLocal.all(), text, paddingRegional);
            }

            fillTree(tree, treeRegional.all(), text, padding);
        }

        const labels = tree.all();
        this.setState({ zoom, labels });
    }

    renderLayers() {
        const { labels } = this.state;
        const textlayer = new TextLayer(this.props, {
            id: `${this.props.id}-text`,
            data: labels,
            getPosition: (d) => [Number(d.lon), Number(d.lat), this.props.elevation],
            getText: (d) => d.text,
        });

        return textlayer;
    }
}

ContourLabels.layerName = 'ContourLabels';
ContourLabels.defaultProps = defaultProps;

export { ContourLabels };
