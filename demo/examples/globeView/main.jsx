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

import { TerrainLayer } from 'deck.gl';
import { _TerrainExtension as TerrainExtension } from '@deck.gl/extensions';

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
        terrainCheckbox: false,
        isGlobeView: true,
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

    // make the terrain layer
    function add3dTerrain() {
        const terrainDataUrl =
            // 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/terrain.png';
            'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
        const SURFACE_IMAGE =
            'https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png';

        // Mapzen
        const ELEVATION_DECODER = {
            rScaler: 256,
            gScaler: 1,
            bScaler: 0.00390625,
            offset: -32768,
        };

        const texture = SURFACE_IMAGE;
        const wireframe = false;
        const terrainLayer = new TerrainLayer({
            id: 'terrain-layer',
            // loadOptions: {
            //     terrain: {
            //         workerUrl: terrainWorkerURL,
            //     },
            // },
            parameters: {
                // Depth test should always be true for 3D terrain (don't want to see through)
                depthTest: true,
            },
            minZoom: 0,
            maxZoom: 23,
            strategy: 'no-overlap',
            elevationDecoder: ELEVATION_DECODER,
            elevationData: terrainDataUrl,
            // texture,
            // wireframe,
            // color: [255, 255, 255],
            // bounds: [-180, -85.0511, 180, 85.0511], // Full world bounds
            visible: true,
            texture: null, // No texture, just mesh
            wireframe: true, // Show wireframe mesh
            color: [0, 255, 0], // Bright green mesh for visibility
            operation: 'terrain+draw',
            onTileLoad: (tile) => console.log('Terrain tile loaded:', tile),
            onTileError: (err) => console.error('Terrain tile error:', err),
        });

        return terrainLayer;
    }

    const layers = [];

    if (state.terrainCheckbox) {
        // const terrainLayer = new TerrainLayer({
        //     id: 'terrain-source',
        //     // Data source: https://www.mapzen.com/blog/terrain-tile-service/
        //     elevationData:
        //         'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
        //     elevationDecoder: {
        //         rScaler: 256,
        //         gScaler: 1,
        //         bScaler: 1 / 256,
        //         offset: -32768,
        //     },
        //     texture: null,
        //     minZoom: 0,
        //     maxZoom: 23,
        //     material: {
        //         diffuse: 1,
        //     },
        //     operation: 'terrain+draw',
        //     onTileLoad: (tile) => console.log('Terrain tile loaded:', tile),
        //     onTileError: (err) => console.error('Terrain tile error:', err),
        // });
        const terrainLayer = add3dTerrain();
        layers.push(terrainLayer);

        console.log('TerrainLayer props:', terrainLayer.props);
    }

    if (state.shadedCheckbox) {
        const shadedLayer = new ShadedLayer({
            id: 'shadedLayer',
            beforeId: mapStyles[style].beforeId,
            data,
            colors,
            colorLevels,
            colorType,
            projection,
            elevation: 0,
            parameters: { depthCompare: 'always', cullMode: 'back' },
            // elevation: 4000,
            // extensions: state.isGlobeView ? [new TerrainExtension()] : [],
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
            elevation: 0,
            parameters: { depthCompare: 'always', cullMode: 'back' },
            // extensions: state.isGlobeView ? [new TerrainExtension()] : [],
            labels: {
                enabled: state.contourLabels,
                getSize: 14,
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
            id: `vectorLayer-${state.isGlobeView ? 'globe' : 'mercator'}`,
            beforeId: mapStyles[style].beforeId,
            dataDir: wdir,
            dataMag: wmag,
            projection,
            elevation: 0,
            parameters: { depthCompare: 'always', cullMode: 'back' },
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
    if (state.particleCheckbox) {
        const particleLayer = new ParticleLayer({
            id: 'particleLayer',
            beforeId: mapStyles[style].beforeId,
            dataDir: wdir,
            dataMag: wmag,
            color: [0, 0, 0, 255],
            width: 1,
            numParticles: 10000,
            maxAge: 100,
            speedFactor: 2,
            //animate: true,
            projection,
            elevation: 0,
            parameters: { depthCompare: 'always', cullMode: 'back' },
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
        layers.push(particleLayer);
    }
    console.log('layers', layers);

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
            <br />
            <label htmlFor="terainCheckbox">
                <input
                    id="terainCheckbox"
                    type="checkbox"
                    checked={state.terrainCheckbox}
                    onChange={(e) => {
                        setState({ ...state, terrainCheckbox: e.target.checked });
                    }}
                />
                Terrain Layer
            </label>
            <label htmlFor="globeView">
                <input
                    id="globeView"
                    type="checkbox"
                    checked={state.isGlobeView}
                    onChange={(e) => {
                        setState({ ...state, isGlobeView: e.target.checked });
                    }}
                />
                Globe View
            </label>

            <div ref={mapContainer} id="mapContainer">
                {state.isGlobeView ? (
                    <Map
                        initialViewState={{
                            longitude: -100.4,
                            latitude: 37.8,
                            zoom: 3,
                        }}
                        ref={mapRef}
                        antialias
                        reuseMaps={false}
                        mapStyle={mapStyle}
                        projection="globe"
                    >
                        <DeckGLOverlay overlayRef={overlayRef} layers={layers} interleaved />
                        <Readout
                            mapContainer={mapContainer}
                            overlayRef={overlayRef}
                            title="Wed 06:00 am PST, Oct 21"
                        />
                        <Legend overlayRef={overlayRef} />
                    </Map>
                ) : (
                    <Map
                        initialViewState={{
                            longitude: -100.4,
                            latitude: 37.8,
                            zoom: 3,
                        }}
                        ref={mapRef}
                        antialias
                        reuseMaps={false}
                        mapStyle={mapStyle}
                        projection="mercator"
                    >
                        <DeckGLOverlay overlayRef={overlayRef} layers={layers} interleaved />
                        <Readout
                            mapContainer={mapContainer}
                            overlayRef={overlayRef}
                            title="Wed 06:00 am PST, Oct 21"
                        />
                        <Legend overlayRef={overlayRef} />
                    </Map>
                )}
            </div>
        </>
    );
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <MapContainer />
    </StrictMode>,
);
