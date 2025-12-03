import React, { StrictMode, useMemo, useRef, useCallback, useReducer, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import Stats from 'stats.js';
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
    GeoJsonLayer,
    LegendStaticBarNew,
} from 'desi-graphics';
import { DeckGL } from '@deck.gl/react';

import hrefTemperatures from 'demo-data/HREF/temp';
import hrefWdir from 'demo-data/HREF/wdir';
import hrefWmag from 'demo-data/HREF/wmag';
import hrefProjDict from 'demo-data/HREF/projection';

import rrfsTemperatures from 'demo-data/RRFS/temp';
import rrfsWdir from 'demo-data/RRFS/wdir';
import rrfsWmag from 'demo-data/RRFS/wmag';
import rrfsProjDict from 'demo-data/RRFS/projection';

import eagleTemperatures from 'demo-data/EAGLE/temp';
import eagleWdir from 'demo-data/EAGLE/wdir';
import eagleWmag from 'demo-data/EAGLE/wmag';
import eagleProjDict from 'demo-data/EAGLE/projection';

import { _GlobeView, MapView, TerrainLayer } from 'deck.gl';
import { _TerrainExtension as TerrainExtension } from '@deck.gl/extensions';
import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'desi-graphics/desi-graphics.css';
import coastLines from './ne_10m_coastline.json';
import LegendStaticBar from '../../../library/src/maps/legend/LegendStaticBar';

const checkboxConfig = [
    { key: 'contourCheckbox', label: 'Contour Layer' },
    { key: 'contourLabels', label: 'Contour Labels', parent: 'contourCheckbox' },
    { key: 'shadedCheckbox', label: 'Shaded Layer' },
    { key: 'shadedInterpolateCheckbox', label: 'Interpolate Data', parent: 'shadedCheckbox' },
    { key: 'vectorCheckbox', label: 'Vector Layer' },
    { key: 'particleCheckbox', label: 'Particle Layer' },
    { key: 'terrainCheckbox', label: 'Terrain Layer' },
    { key: 'isGlobeView', label: 'Globe View' },
    { key: 'geojsonLayer', label: 'GeoJSON Layer' },
    { key: 'showStats', label: 'Show Performance Stats' },
];

function MapContainer() {
    const { mapToken } = process.env;
    const style = useMemo(() => Object.keys(mapStyles)[0], []);
    const mapStyle = useMemo(() => Maps.loadMapStyle(style, mapToken), [style, mapToken]);

    const [state, dispatch] = useReducer((s, { key, value }) => ({ ...s, [key]: value }), {
        contourCheckbox: false,
        contourLabels: true,
        shadedCheckbox: true,
        shadedInterpolateCheckbox: true,
        vectorCheckbox: false,
        particleCheckbox: true,
        terrainCheckbox: false,
        isGlobeView: true,
        geojsonLayer: true,
        showStats: false, // Enable stats by default
    });
    const radioOptions = ['HREF', 'RRFS', 'EAGLE'];
    const [currentDataset, setCurrentDataset] = React.useState(radioOptions[0]);

    const controllerOptions = ['MapLibre-GL', 'DeckGL'];
    const [currentController, setCurrentController] = React.useState(controllerOptions[0]);

    const toggle = useCallback((key) => (e) => dispatch({ key, value: e.target.checked }), []);

    const overlayRef = useRef();
    const mapContainer = useRef();
    const mapRef = useRef();
    const statsRef = useRef();
    const deckRef = useRef();

    let temperatures;
    let wdir;
    let wmag;
    let projDict;
    let resLevel;
    switch (currentDataset) {
        case 'HREF':
            temperatures = hrefTemperatures;
            wdir = hrefWdir;
            wmag = hrefWmag;
            projDict = hrefProjDict;
            resLevel = 4; // sample data is every 4th point
            break;
        case 'RRFS':
            temperatures = rrfsTemperatures;
            wdir = rrfsWdir;
            wmag = rrfsWmag;
            projDict = rrfsProjDict;
            resLevel = 8; // sample data is every 8th point
            break;
        case 'EAGLE':
            temperatures = eagleTemperatures;
            wdir = eagleWdir;
            wmag = eagleWmag;
            projDict = eagleProjDict;
            resLevel = 8; // sample data is every 8th point
            break;
        default:
            console.error('ERROR', `Unknown dataset: ${currentDataset}`);
    }
    wdir = useMemo(() => wdir.flat(), [wdir]);
    wmag = useMemo(() => wmag.flat().map((v) => v * 2.23694), [wmag]);
    const data = useMemo(
        () =>
            new Float32Array(
                temperatures.flat().map((v) => (v == null ? NaN : ((v - 273.15) * 9) / 5 + 32)),
            ),
        [temperatures],
    );

    // Initialize Stats.js
    useEffect(() => {
        if (state.showStats && !statsRef.current) {
            const stats = new Stats();
            stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom

            // Style the stats panel
            stats.dom.style.position = 'absolute';
            stats.dom.style.top = '10px';
            stats.dom.style.left = '10px';
            stats.dom.style.zIndex = '10000';

            // Add to the map container instead of body for better positioning
            if (mapContainer.current) {
                mapContainer.current.appendChild(stats.dom);
                statsRef.current = stats;
            }
        } else if (!state.showStats && statsRef.current) {
            // Remove stats when disabled
            if (statsRef.current.dom.parentNode) {
                statsRef.current.dom.parentNode.removeChild(statsRef.current.dom);
            }
            statsRef.current = null;
        }
    }, [state.showStats]);

    // Cleanup stats on unmount
    useEffect(() => {
        return () => {
            if (statsRef.current && statsRef.current.dom.parentNode) {
                statsRef.current.dom.parentNode.removeChild(statsRef.current.dom);
            }
        };
    }, []);

    // Animation loop for stats
    useEffect(() => {
        let animationId;

        function animate() {
            if (statsRef.current) {
                statsRef.current.begin();

                // The actual rendering is handled by deck.gl/mapbox
                // We just need to call end() after each frame
                requestAnimationFrame(() => {
                    if (statsRef.current) {
                        statsRef.current.end();
                    }
                });
            }

            animationId = requestAnimationFrame(animate);
        }

        if (state.showStats && statsRef.current) {
            animate();
        }

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [state.showStats]);

    const projection = useMemo(() => {
        const p = new Projection(projDict, resLevel);
        p.makeLonLatGrid();
        p.isGlobe = state.isGlobeView;
        return p;
    }, [state.isGlobeView, currentDataset]);

    const field = 't2';
    const { colors, colorLevels, contourLevels, colorType } = configFields[field].colorBars.default;

    const terrainLayer = useMemo(
        () =>
            new TerrainLayer({
                id: `terrain-layer-${state.isGlobeView ? 'globe' : 'mercator'}`,
                //texture: 'https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png',
                elevationData:
                    'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
                elevationDecoder: { rScaler: 256, gScaler: 1, bScaler: 0.00390625, offset: -32768 },
                visible: state.terrainCheckbox,
                //wireframe: true,
                strategy: 'no-overlap',
                color: [255, 255, 255, 170],
                operation: 'terrain+draw',
                parameters: { depthTest: true },
                //onTileLoad: (tile) => console.log('Terrain tile loaded:', tile),
                //onTileError: (err) => console.error('Terrain tile error:', err),
            }),
        [state.terrainCheckbox],
    );

    const particleLayer = useMemo(() => {
        if (!state.particleCheckbox) return null;
        return new ParticleLayer({
            id: `particleLayer-${state.isGlobeView ? 'globe' : 'mercator'}`,
            dataDir: wdir,
            dataMag: wmag,
            color: [0, 0, 0, 255],
            width: 1.5,
            numParticles: 10000,
            projection,
            readout: [
                {
                    data: wmag,
                    prependText: 'Wind Speed',
                    units: 'mph',
                    interpolate: true,
                    decimals: 0,
                },
                {
                    data: wdir,
                    prependText: 'Wind Direction',
                    units: '°',
                    interpolate: true,
                    decimals: 0,
                },
            ],
        });
    }, [
        state.particleCheckbox,
        state.isGlobeView,
        projection,
        wdir,
        wmag,
        style,
        currentController,
    ]);

    const layers = useMemo(() => {
        const result = [];
        if (state.terrainCheckbox) result.push(terrainLayer);
        if (state.shadedCheckbox)
            result.push(
                new ShadedLayer({
                    id: `shadedLayer-${state.isGlobeView ? 'globe' : 'mercator'}-${state.shadedInterpolateCheckbox ? 'interp' : 'nointerp'}`,
                    beforeId: mapStyles[style].beforeId,
                    data,
                    colors,
                    colorLevels,
                    colorType,
                    projection,
                    elevation: 0,
                    //extensions: [new TerrainExtension()],
                    //terrainDrawMode:'drape',
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
                        type: 'staticBar',
                        title: 'Temperature',
                        units: '°F',
                    },
                }),
            );
        if (state.contourCheckbox)
            result.push(
                new ContourLayer({
                    id: `contourLayer-${state.isGlobeView ? 'globe' : 'mercator'}`,
                    beforeId: mapStyles[style].beforeId,
                    data,
                    colors,
                    colorLevels,
                    colorType,
                    contourLevels,
                    projection,
                    elevation: 0,
                    //extensions: [new TerrainExtension()],
                    //terrainDrawMode: 'drape',
                    labels: { enabled: state.contourLabels, getSize: 14 },
                    readout: [
                        {
                            data,
                            prependText: 'Mean Temperature',
                            decimals: 0,
                            units: '°F',
                            interpolate: true,
                        },
                    ],
                    legend: { type: 'staticBar', title: 'Temperature', units: '°F' },
                }),
            );
        if (state.geojsonLayer) {
            result.push(
                new GeoJsonLayer({
                    id: 'GeoJsonLayer',
                    data: coastLines,

                    stroked: true,
                    filled: true,
                    lineWidthUnits: 'pixels',
                    lineWidthMinPixels: 2,
                    getLineWidth: 2,
                    getFillColor: [255, 160, 180, 200],
                    getLineColor: [255, 0, 0],
                    getPointRadius: 4,
                    getTextSize: 12,
                }),
            );
        }
        if (state.vectorCheckbox)
            result.push(
                new VectorLayer({
                    id: `vectorLayer-${state.isGlobeView ? 'globe' : 'mercator'}`,
                    beforeId: mapStyles[style].beforeId,
                    dataDir: wdir,
                    dataMag: wmag,
                    projection,
                    angleOffset: state.isGlobeView ? 180 : 0,
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
                }),
            );
        if (state.particleCheckbox) result.push(particleLayer);

        return result;
    }, [
        state.terrainCheckbox,
        state.shadedCheckbox,
        state.shadedInterpolateCheckbox,
        state.contourCheckbox,
        state.contourLabels,
        state.vectorCheckbox,
        state.particleCheckbox,
        state.geojsonLayer,
        state.isGlobeView,
        currentController,
        terrainLayer,
        particleLayer,
        data,
        colors,
        colorLevels,
        contourLevels,
        colorType,
        projection,
        style,
    ]);

    return (
        <>
            {checkboxConfig.map(({ key, label, parent }) =>
                !parent || state[parent] ? (
                    <label key={key} htmlFor={key} className="checkbox-label">
                        <input
                            id={key}
                            type="checkbox"
                            checked={state[key]}
                            onChange={toggle(key)}
                        />
                        {label}
                    </label>
                ) : null,
            )}
            <div style={{ margin: '1em 0' }}>
                {radioOptions.map((option) => (
                    <label
                        key={option}
                        htmlFor={`radio-${option}`}
                        style={{ marginLeft: option === radioOptions[0] ? 0 : '1em' }}
                    >
                        <input
                            id={`radio-${option}`}
                            type="radio"
                            name="threeway"
                            value={option}
                            checked={currentDataset === option}
                            onChange={() => setCurrentDataset(option)}
                        />
                        {option}
                    </label>
                ))}
            </div>
            <div>
                {controllerOptions.map((option) => (
                    <label
                        key={option}
                        htmlFor={`controller-${option}`}
                        style={{ marginLeft: option === controllerOptions[0] ? 0 : '1em' }}
                    >
                        <input
                            id={`controller-${option}`}
                            type="radio"
                            name="controller"
                            value={option}
                            checked={currentController === option}
                            onChange={() => setCurrentController(option)}
                        />
                        {option}
                    </label>
                ))}
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '40px',
                    margin: '40px',
                }}
            >
                <LegendStaticBarNew
                    options={{
                        colors: ['#34a3aa', '#eaaaba', '#af3013'],
                        colorLevels: [1, 2, 3],
                        colorType: 'scaleLinear',
                        title: 'HORIZONTAL Temperature',
                        units: '°F',
                        orient: 'horizontal',
                        barLength: 600,
                        thickness: 140,
                        ticks: 'linear',
                        tickAngle: -45,
                        tickLength: -40,
                        tickFontSize: 16,
                        tickPadding: 5,
                        isLeftCap: false,
                        isRightCap: false,
                        hideOuterTicks: true,
                        titleFontFamily: 'Times New Roman',
                        titleFontSize: 24,
                        titleFontColor: '#aefd2a',
                        titleJustify: 'right',
                        containerSx: {
                            border: '2px solid skyblue',
                            padding: '40px',
                            borderRadius: '10px',
                        },
                    }}
                />
                <LegendStaticBarNew
                    options={{
                        colors: ['#34a3aa', '#eaaaba', '#af3013'],
                        colorLevels: [1, 2, 3],
                        colorType: 'scaleLinear',
                        title: 'VERTICAL Temperature',
                        units: '°F',
                        orient: 'vertical',
                        barLength: 600,
                        thickness: 40,
                        ticks: 'linear',
                        tickAngle: 0,
                        tickLength: 10,
                        tickPadding: 10,
                        isLeftCap: false,
                        isRightCap: false,
                        titleFontFamily: 'Verdana',
                        titleFontSize: 24,
                        titleFontWeight: 700,
                        titleFontColor: '#fefefe',
                        titleJustify: 'center',
                        containerSx: { background: '#9651e4ff', padding: '20px' },
                    }}
                />
                <LegendStaticBarNew
                    options={{
                        colors: ['#34a3aa', '#eaaaba', '#af3013'],
                        colorLevels: [1, 2],
                        colorType: 'scaleThreshold',
                        title: 'Tick Values',
                        units: '°F',
                        orient: 'horizontal',
                        barLength: 400,
                        thickness: 90,
                        ticks: 'byColorLevels',
                        tickAngle: 45,
                        tickValues: ['hello', 'world'],
                        isLeftCap: true,
                        isRightCap: true,
                        titleFontFamily: 'Arial',
                        titleFontSize: 30,
                        titleFontColor: '#3ae4e4ff',
                        tickFontColor: '#f38a72ff',
                        tickLength: 20,
                        tickFontSize: 24,
                        // containerSx: { marginTop: '20px', marginBottom: '20px' },
                    }}
                />
            </div>
            <div ref={mapContainer} id="mapContainer" style={{ position: 'relative' }}>
                {currentController === 'MapLibre-GL' && (
                    <Map
                        initialViewState={{ longitude: -100.4, latitude: 37.8, zoom: 3 }}
                        maxPitch={0}
                        ref={mapRef}
                        antialias
                        mapStyle={mapStyle}
                        projection={state.isGlobeView ? 'globe' : 'mercator'}
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
                {currentController === 'DeckGL' && (
                    <DeckGL
                        ref={deckRef}
                        initialViewState={{
                            longitude: -100.4,
                            latitude: 37.8,
                            zoom: 3,
                            maxPitch: 0,
                        }}
                        layers={layers}
                        controller
                        views={
                            state.isGlobeView
                                ? new _GlobeView({ id: 'globe', controller: true })
                                : new MapView()
                        }
                    >
                        <Readout
                            mapContainer={mapContainer}
                            overlayRef={deckRef}
                            title="Wed 06:00 am PST, Oct 21"
                        />
                    </DeckGL>
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
