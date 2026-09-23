import { useControl } from 'react-map-gl/maplibre';
import { MapLibreOverlay } from '@deck.gl/maplibre';

export default function DeckGLOverlay(props) {
    const { overlayRef } = props;
    // deck.gl 9.4's attach path omits `_reuseDevices`, so React StrictMode's
    // add/remove/add of controls throws "WebGL context already attached to device"
    // (https://github.com/visgl/deck.gl/issues/10681). Force device reuse to avoid it.
    const overlay = useControl(
        () => new MapLibreOverlay({ ...props, deviceProps: { _reuseDevices: true, ...props.deviceProps } }),
    );
    if (overlayRef) {
        overlayRef.current = overlay;
        overlayRef.current.setProps(props);
    } else {
        overlay.setProps(props);
    }
    return null;
}
