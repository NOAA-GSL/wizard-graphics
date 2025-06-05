import { CompositeLayer, GeoJsonLayer } from 'deck.gl';
import gUtilities from '../../utilities/graphicsUtilities';
// Map to track features by coordinates
const seenFeaturesMap = new Map();

function getFeatureKey(f) {
    const coords = JSON.stringify(f.geometry.coordinates);
    const type = f.properties.phenomenon;
    const sig = f.properties.significance;
    return {
        key: `${coords}-${type}-${sig}`, // Unique key combining coordinates, phenomenon, and significance
        coordinates: coords, // Stringified coordinates
        phenomenon: type, // Phenomenon property
        significance: sig, // Significance property
    };
}
function getColor(f) {
    return f.properties.color ? gUtilities.hexToRgb(f.properties.color) : [255, 0, 0];
}

function getFillColor(f) {
    const coordinatesStr = JSON.stringify(f.geometry.coordinates);
    const featureInfo = getFeatureKey(f);

    if (seenFeaturesMap.has(coordinatesStr)) {
        const existingFeature = seenFeaturesMap.get(coordinatesStr);

        // Check if the existing feature has the same phenomenon and significance
        if (
            existingFeature.phenomenon !== featureInfo.phenomenon ||
            existingFeature.significance !== featureInfo.significance
        ) {
            // Properties differ, return semi-transparent fill
            return [...getColor(f), 128]; // Semi-transparent fill
        }
        // Same properties, use original color
        return getColor(f);
    }

    // Store the new feature
    seenFeaturesMap.set(coordinatesStr, {
        phenomenon: featureInfo.phenomenon,
        significance: featureInfo.significance,
    });
    return getColor(f); // First time seeing this feature
}

const defaultProps = {
    filled: true,
    lineWidthMinPixels: 1,
    getFillColor,
    getLineColor: (f) =>
        f.properties.color ? gUtilities.hexToRgb(f.properties.color) : [255, 255, 255],
    getLineWidth: 2,
    stroked: true,
    opacity: 0.5,
    pickingFunction: (d) => {
        const threshold = 1704070800 * 1000; // Convert to milliseconds

        if (d.object) {
            const { properties } = d.object;
            const issued = new Date(properties.issuance * 1000);
            const end = new Date(properties.end * 1000);

            // Check if issued and end dates are greater than the threshold
            const issuedInfo =
                issued.getTime() > threshold ? issued.toLocaleString() : 'Not available';
            const endInfo = end.getTime() > threshold ? end.toLocaleString() : 'Not available';

            const readout = (
                <>
                    <strong>Type:</strong> {properties.phenomenon || 'Not available'}
                    <br />
                    <strong>Significance:</strong> {properties.significance || 'Not available'}
                    <br />
                    <strong>Issued:</strong> {issuedInfo}
                    <br />
                    <strong>Expiration:</strong> {endInfo}
                </>
            );
            const dynamicLegend = {
                color: gUtilities.rgb_to_string(getColor(d.object)),
                text: `${properties.phenomenon} ${properties.significance}`,
            };
            return { readout, dynamicLegend };
        }
        return { readout: null };
    },
};

class WWALayer extends CompositeLayer {
    renderLayers() {
        return new GeoJsonLayer(this.props, {
            id: `${this.props.id}-geojson`,
        });
    }
}
WWALayer.defaultProps = defaultProps;
WWALayer.layerName = 'WWALayer';
export default WWALayer;
