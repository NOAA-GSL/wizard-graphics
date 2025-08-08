import { CompositeLayer, GeoJsonLayer } from 'deck.gl';

// Define the color mapping function
const getFillColor = (f) => {
    const colorMapping = {
        2: [192, 232, 192],
        3: [127, 197, 127],
        4: [246, 246, 127],
        5: [230, 194, 127],
        6: [230, 127, 127],
        8: [255, 127, 255],
    };
    return colorMapping[f.properties.dn] || [255, 255, 255];
};

function parseAndFormatDay(input) {
    if (input === 'Not available' || !input) {
        return 'Day Not Available'; // Return a more meaningful message
    }
    const dayPart = input.split('_')[0]; // Get the first part
    const dayNumber = dayPart.replace(/\D/g, ''); // Extract numeric part
    return `Day ${dayNumber || 'Not Available'}`; // Handle empty numeric part
}

function formatDateTime(input) {
    if (!input || input === 'Not available') return 'Not available'; // Handle empty or "Not available" input

    // Ensure the input length is correct for date parsing
    if (input.length !== 12) return 'Not available'; // Return if the format is not as expected

    const year = input.slice(0, 4);
    const month = input.slice(4, 6);
    const day = input.slice(6, 8);
    const time = `${input.slice(8, 10)}:${input.slice(10, 12)}`;

    const date = new Date(`${year}-${month}-${day}T${time}:00Z`);

    if (Number.isNaN(date.getTime())) return 'Not available'; // Check for invalid date

    const options = { weekday: 'short' };
    const dayOfWeek = new Intl.DateTimeFormat('en-US', options).format(date);
    return `${time}Z ${dayOfWeek} ${month}/${day}`;
}

const defaultProps = {
    getFillColor,
    getLineColor: [0, 0, 0],
    parameters: { depthTest:false, depthCompare: 'always', cullMode: 'back' },
    pickingFunction: (d) => {
        if (d.object) {
            const dnMapping = {
                2: 'General Thunderstorm',
                3: 'Marginal',
                4: 'Slight',
                5: 'Enhanced',
                6: 'Moderate',
                8: 'High',
            };
            const dnValue = d.object.properties.dn;
            const category = dnMapping[dnValue] || 'Not available';
            const idpSource = d.object.properties.idp_source || 'Not available';
            const valid = d.object.properties.valid || 'Not available';
            const expire = d.object.properties.expire || 'Not available';

            const readout = (
                <>
                    <strong>{parseAndFormatDay(idpSource)} Categorical Outlook</strong>
                    <br />
                    <strong>Valid:</strong> {formatDateTime(valid)} - {formatDateTime(expire)}
                    <br />
                    <strong>Category:</strong> {category}
                    <br />
                </>
            );
            return { readout };
        }
        return { readout: null };
    },
};
class SPCLayer extends CompositeLayer {
    renderLayers() {
        return new GeoJsonLayer(this.props, {
            id: `${this.props.id}-geojson`,
        });
    }
}
SPCLayer.defaultProps = defaultProps;
SPCLayer.layerName = 'SPCLayer';
export default SPCLayer;
