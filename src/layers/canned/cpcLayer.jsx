import { GeoJsonLayer } from '@deck.gl/layers';
import { CompositeLayer } from 'deck.gl';

// Helper function to get color based on category and probability
const getFillColor = (idpSource, category, probability) => {
    const colorMaps = {
        precipitation: {
            Above: [
                [40, 85, 23, 255],
                [40, 85, 61, 255],
                [0, 142, 64, 255],
                [58, 123, 95, 255],
                [72, 174, 56, 255],
                [148, 205, 126, 255],
                [179, 217, 171, 255],
                [255, 255, 255, 0],
            ],
            Below: [
                [79, 47, 47, 255],
                [128, 64, 0, 255],
                [147, 70, 57, 255],
                [155, 80, 49, 255],
                [187, 109, 51, 255],
                [216, 167, 80, 255],
                [240, 212, 147, 255],
                [255, 255, 255, 0],
            ],
        },
        temperature: {
            Above: [
                [98, 34, 40, 255],
                [138, 47, 56, 255],
                [204, 48, 71, 255],
                [199, 46, 40, 255],
                [220, 86, 47, 255],
                [227, 139, 74, 255],
                [231, 177, 104, 255],
                [255, 255, 255, 0],
            ],
            Below: [
                [28, 19, 66, 255],
                [34, 24, 82, 255],
                [47, 64, 111, 255],
                [0, 92, 161, 255],
                [56, 159, 219, 255],
                [119, 181, 226, 255],
                [160, 192, 223, 255],
                [255, 255, 255, 0],
            ],
        },
    };
    let colorTemplate;
    if (idpSource.includes('temp')) colorTemplate = 'temperature';
    if (idpSource.includes('prcp')) colorTemplate = 'precipitation';
    if (!colorTemplate) console.log('Unknown color template:', idpSource);

    const colorMap = colorMaps[colorTemplate] || {};

    const thresholds = [90, 80, 70, 60, 50, 40, 33];

    if (category === 'Above' || category === 'Below') {
        const colors = colorMap[category] || [];
        for (let i = 0; i < thresholds.length; i += 1) {
            if (probability >= thresholds[i]) {
                return colors[i] || [255, 255, 255, 0]; // Default color if not found
            }
        }
        return colors[colors.length - 1] || [255, 255, 255, 0]; // Default color for the lowest probability
    }

    return [0, 0, 0, 0];
};

const defaultProps = {
    getFillColor: (f) =>
        getFillColor(f.properties.idp_source, f.properties.cat, f.properties.prob, f),
    getLineColor: [0, 0, 0],
    pickingFunction: (d) => {
        const threshold = 1704070800 * 1000; // Convert to milliseconds
        if (d.object) {
            const { properties } = d.object;
            const start = new Date(properties.start_date);
            const end = new Date(properties.end_date);

            // Format date function to include day of the week in UTC
            const formatDateUTC = (date) => {
                if (date instanceof Date && !Number.isNaN(date)) {
                    const options = {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC', // Use UTC
                    };
                    return date.toLocaleString('en-US', options);
                }
                return 'Not available';
            };

            // Check if start and end dates are greater than the threshold
            const startInfo = start.getTime() > threshold ? formatDateUTC(start) : 'Not available';
            const endInfo = end.getTime() > threshold ? formatDateUTC(end) : 'Not available';

            const readout = (
                <>
                    <strong>Category:</strong> {properties.cat || 'Not available'}
                    <br />
                    <strong>Probability:</strong> {`${properties.prob}%` || 'Not available'}
                    <br />
                    <strong>Valid:</strong> {startInfo} - {endInfo}
                </>
            );
            return { readout };
        }
        return { readout: null };
    },
};
class CPCLayer extends CompositeLayer {
    renderLayers() {
        return new GeoJsonLayer(this.props, {
            id: `${this.props.id}-geojson`,
        });
    }
}
CPCLayer.defaultProps = defaultProps;
CPCLayer.layerName = 'CPCLayer';
export default CPCLayer;
