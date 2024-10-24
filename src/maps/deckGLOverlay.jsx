import { useControl } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';

export default function DeckGLOverlay(props) {
    const { overlayRef } = props;
    const overlay = useControl(() => new MapboxOverlay(props));
    if (overlayRef) {
        overlayRef.current = overlay;
        overlayRef.current.setProps(props);
    } else {
        overlay.setProps(props);
    }
    return null;
}
