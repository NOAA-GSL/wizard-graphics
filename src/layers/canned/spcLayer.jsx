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

const defaultProps = {
    getFillColor,
    getLineColor: [0, 0, 0],
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
            const readout = (
                <>
                    <strong>Outlook:</strong> {d.object.properties.idp_source || 'Not available'}
                    <br />
                    <strong>Category:</strong> {category || 'Not available'}
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
