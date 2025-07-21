import { StrictMode, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import {
    mapStyles,
    Maps,
    DeckGLOverlay,
    Readout,
    Legend,
    Projection,
    ContourLayer,
    ShadedLayer,
    VectorLayer,
    ParticleLayer,
    configFields,
} from 'desi-graphics';
import projDict from 'demo-data/projection';
import temperatures from 'demo-data/temp';
import wdir from 'demo-data/wdir';
import wmag from 'demo-data/wmag';

import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'desi-graphics/desi-graphics.css'; // Import the desi-graphics CSS

function MapContainer() {
    const { mapToken } = process.env;
    const style = Object.keys(mapStyles)[0];
    // memoizing so that it doesn't rerun on rerenders
    const mapStyle = useMemo(() => Maps.loadMapStyle(style, mapToken), [style, mapToken]);
    const [state, setState] = useState({
        contourCheckbox: true,
        contourLabels: true,
        shadedCheckbox: true,
        shadedInterpolateCheckbox: true,
        vectorCheckbox: false,
        particleCheckbox: false,
    });
    const overlayRef = useRef();
    const mapContainer = useRef();
    const mapRef = useRef();
    // Make the LonLatGrid of Data
    // This is HREF data sampled every 4 points (resLevel = 4)
    const resLevel = 4;
    const projection = new Projection(projDict, resLevel);
    projection.makeLonLatGrid();

    console.info('configFields', configFields);
    const field = 't2';
    const colorInfo = configFields[field].colorBars.default;
    // Define colors, colorLevels, and contour levels (optional)
    const { colors, colorLevels, contourLevels, colorType } = colorInfo;

    // Format data (nulls to NaN)
    const data = new Float32Array(
        Object.values(temperatures).map((value) => (value === null ? NaN : value)),
    );

    const layers = [];
    if (state.shadedCheckbox) {
        const shadedLayer = new ShadedLayer({
            id: 'shadedLayer',
            beforeId: mapStyles[style].beforeId,
            data,
            colors,
            colorLevels,
            colorType,
            projection,
            interpolateData: state.shadedInterpolateCheckbox,
            readout: [
                {
                    data,
                    prependText: 'Mean Temperature',
                    decimals: 0,
                    units: '°F',
                    interpolate: true,
                },
            ],
            legend: {
                type: 'staticBar', // 'staticBar', 'staticItems', 'dynamicItems'
                title: 'Temperature',
                units: '°F',
            },
        });
        layers.push(shadedLayer);
    }

    // CONTOUR LAYER
    if (state.contourCheckbox) {
        const contourLayer = new ContourLayer({
            id: 'contourLayer',
            beforeId: mapStyles[style].beforeId,
            data,
            colors,
            colorLevels,
            colorType,
            contourLevels,
            projection,
            labels: {
                enabled: state.contourLabels,
                getSize: 12,
            },
            readout: [
                {
                    data,
                    prependText: 'Mean Temperature',
                    decimals: 0,
                    units: '°F',
                    interpolate: true,
                },
            ],
            // same legend in two places (shaded/contour) will not produce duplicate legends
            legend: {
                type: 'staticBar', // 'staticBar', 'staticItems', 'dynamicItems'
                title: 'Temperature',
                units: '°F',
            },
        });
        layers.push(contourLayer);
    }

    if (state.vectorCheckbox) {
        const vectorLayer = new VectorLayer({
            id: 'vectorLayer',
            beforeId: mapStyles[style].beforeId,
            dataDir: wdir,
            dataMag: wmag,
            projection,
            readout: [
                {
                    data: wmag,
                    prependText: 'Wind Speed',
                    decimals: 0,
                    units: 'mph',
                    interpolate: true,
                },
                {
                    data: wdir,
                    prependText: 'Wind Direction',
                    decimals: 0,
                    units: '°',
                    interpolate: true,
                },
            ],
        });
        layers.push(vectorLayer);
    }
    if (state.particleCheckbox){
        const particleLayer = new ParticleLayer({
            id: 'particleLayer',
            beforeId: mapStyles[style].beforeId,
            dataDir: wdir,
            dataMag: wmag,
            color:[0,0,0,255],
            projection,
        });
        layers.push(particleLayer);
    }

    return (
        <>
            <label htmlFor="contourCheckbox">
                <input
                    id="contourCheckbox"
                    type="checkbox"
                    checked={state.contourCheckbox}
                    onChange={(e) => {
                        setState({ ...state, contourCheckbox: e.target.checked });
                    }}
                />
                Contour Layer
            </label>
            <label htmlFor="contourLabels">
                <input
                    id="contourLabels"
                    type="checkbox"
                    checked={state.contourLabels}
                    onChange={(e) => {
                        setState({ ...state, contourLabels: e.target.checked });
                    }}
                />
                Contour Labels
            </label>
            <br />
            <label htmlFor="shadedCheckbox">
                <input
                    id="shadedCheckbox"
                    type="checkbox"
                    checked={state.shadedCheckbox}
                    onChange={(e) => {
                        setState({ ...state, shadedCheckbox: e.target.checked });
                    }}
                />
                Shaded Layer
            </label>
            <label htmlFor="shadedInterpolateCheckbox">
                <input
                    id="shadedInterpolateCheckbox"
                    type="checkbox"
                    checked={state.shadedInterpolateCheckbox}
                    onChange={(e) => {
                        setState({ ...state, shadedInterpolateCheckbox: e.target.checked });
                    }}
                />
                Interpolate Data
            </label>
            <br />
            <label htmlFor="vectorCheckbox">
                <input
                    id="vectorCheckbox"
                    type="checkbox"
                    checked={state.vectorCheckbox}
                    onChange={(e) => {
                        setState({ ...state, vectorCheckbox: e.target.checked });
                    }}
                />
                Vector Layer
            </label>

            <label htmlFor="particleCheckbox">
                <input
                    id="particleCheckbox"
                    type="checkbox"
                    checked={state.particleCheckbox}
                    onChange={(e) => {
                        setState({ ...state, particleCheckbox: e.target.checked });
                    }}
                />
                Particle Layer
            </label>

            <div ref={mapContainer} id="mapContainer">
                <Map
                    initialViewState={{
                        longitude: -100.4,
                        latitude: 37.8,
                        zoom: 3,
                    }}
                    ref={mapRef}
                    antialias
                    reuseMaps
                    mapStyle={mapStyle}
                >
                    <DeckGLOverlay
                        overlayRef={overlayRef}
                        layers={layers}
                        interleaved
                    />
                    <Readout
                        mapContainer={mapContainer}
                        overlayRef={overlayRef}
                        title="Wed 06:00 am PST, Oct 21"
                    />
                    <Legend overlayRef={overlayRef} />
                </Map>
            </div>
        </>
    );
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <MapContainer />
    </StrictMode>,
);
