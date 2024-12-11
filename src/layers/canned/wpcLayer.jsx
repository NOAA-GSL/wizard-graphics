import { CompositeLayer, GeoJsonLayer } from 'deck.gl';

const defaultProps = {
    getFillColor: (f) => {
        const colorMap = {
            1: [0, 205, 0],
            2: [238, 238, 0],
            3: [255, 0, 0],
            4: [255, 0, 255],
        };
        return colorMap[f.properties.dn] || [255, 255, 255];
    },
    getLineColor: [0, 0, 0],
    pickingFunction: (d) => {
        if (d.object) {
            const dnMapping = {
                1: 'Marginal (At Least 5%)',
                2: 'Slight (At Least 15%)',
                3: 'Moderate (At Least 40%)',
                4: 'High (At Least 70%)',
            };
            const dnValue = d.object.properties.dn;
            const category = dnMapping[dnValue] || 'Not available';
            const readout = (
                <>
                    <strong>Outlook:</strong> {d.object.properties.product || 'Not available'}
                    <br />
                    <strong>Category:</strong> {category || 'Not available'}
                    <br />
                    <strong>Valid Time:</strong> {d.object.properties.valid_time || 'Not available'}
                </>
            );
            return { readout };
        }
        return { readout: null };
    },
};
class WPCLayer extends CompositeLayer {
    renderLayers() {
        return new GeoJsonLayer(this.props, {
            id: `${this.props.id}-geojson`,
        });
    }
}
WPCLayer.defaultProps = defaultProps;
WPCLayer.layerName = 'WPCLayer';
export default WPCLayer;
