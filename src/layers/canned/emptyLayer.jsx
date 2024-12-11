import { CompositeLayer, GeoJsonLayer } from 'deck.gl';

const defaultProps = {};
class SpotLayer extends CompositeLayer {
    renderLayers() {
        return new GeoJsonLayer(this.props, {
            id: `${this.props.id}-geojson`,
        });
    }
}
SpotLayer.defaultProps = defaultProps;
SpotLayer.layerName = 'SpotLayer';
export default SpotLayer;
