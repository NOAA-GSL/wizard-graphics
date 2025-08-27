// my-point-cloud-layer.js
// Example to add per-point size to point cloud layer
import { GeoJsonLayer } from 'deck.gl';
import { LINE_LAYER, forwardProps } from './sub-layer-map';
import { Layer } from '@deck.gl/core';

export default class DESIGeoJsonLayer extends GeoJsonLayer {
    initializeState() {
        super.initializeState();
    }
    protected _renderLineLayers(): (Layer | false)[] | null {
        const { extruded, stroked } = this.props;
        const { layerProps } = this.state;
        const polygonStrokeLayerId = 'polygons-stroke';
        const lineStringsLayerId = 'linestrings';

        const PolygonStrokeLayer =
            !extruded &&
            stroked &&
            this.shouldRenderSubLayer(polygonStrokeLayerId, layerProps.polygonsOutline?.data) &&
            this.getSubLayerClass(polygonStrokeLayerId, LINE_LAYER.type);
        const LineStringsLayer =
            this.shouldRenderSubLayer(lineStringsLayerId, layerProps.lines?.data) &&
            this.getSubLayerClass(lineStringsLayerId, LINE_LAYER.type);

        if (PolygonStrokeLayer || LineStringsLayer) {
            const forwardedProps = forwardProps(this, LINE_LAYER.props);
            return [
                PolygonStrokeLayer &&
                    new PolygonStrokeLayer(
                        forwardedProps,
                        this.getSubLayerProps({
                            id: polygonStrokeLayerId,
                            updateTriggers: forwardedProps.updateTriggers,
                        }),
                        layerProps.polygonsOutline,
                    ),

                LineStringsLayer &&
                    new LineStringsLayer(
                        forwardedProps,
                        this.getSubLayerProps({
                            id: lineStringsLayerId,
                            updateTriggers: forwardedProps.updateTriggers,
                        }),
                        layerProps.lines,
                    ),
            ];
        }
        return null;
    }
}

DESIGeoJsonLayer.layerName = 'DESIGeoJsonLayer';
