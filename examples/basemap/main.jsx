import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import { Maps, mapStyles } from 'desi-graphics/maps';
import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';

function MapContainer() {
    const [state, setState] = useState(Object.keys(mapStyles)[0]);

    // memoizing so that it doesn't re-run when moving the map or other re-renders
    const { mapToken } = process.env;
    const mapStyle = useMemo(() => Maps.loadMapStyle(state, mapToken), [state, mapToken]);

    return (
        <div id="mapContainer">
            <div>Map Styles:</div>
            <select
                value={state}
                onChange={(e) => {
                    setState(e.target.value);
                }}
            >
                {Object.keys(mapStyles).map((style, index) => (
                    <option key={index} value={style}>
                        {style}
                    </option>
                ))}
            </select>
            <Map
                initialViewState={{
                    longitude: -118.4,
                    latitude: 37.8,
                    zoom: 5,
                }}
                antialias
                reuseMaps
                mapStyle={mapStyle}
            />
        </div>
    );
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <MapContainer />
    </StrictMode>,
);
