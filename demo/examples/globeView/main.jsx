import React, { StrictMode, useMemo, useRef, useCallback, useReducer, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import Stats from 'stats.js';
import {
    mapStyles,
    Maps,
    DeckGLOverlay,
    Readout,
    readoutFunction,
    Legend,
    Projection,
    ContourLayer,
    ShadedLayer,
    VectorLayer,
    ParticleLayer,
    configFields,
    GeoJsonLayer,
} from 'wizard-graphics';
import { DeckGL } from '@deck.gl/react';
import { TextLayer } from '@deck.gl/layers';

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

import unstructuredTemperatures from 'demo-data/Unstructured/temp';
import unstructuredWdir from 'demo-data/Unstructured/wdir';
import unstructuredWmag from 'demo-data/Unstructured/wmag';
import unstructuredLonLat from 'demo-data/Unstructured/lonlat';
import radarReflectivity from 'demo-data/radar/temp';
import radarLonLat from 'demo-data/radar/lonlat';
import radarMeta from 'demo-data/radar/meta';

import { _GlobeView, MapView, TerrainLayer } from 'deck.gl';
import { _TerrainExtension as TerrainExtension } from '@deck.gl/extensions';
import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'wizard-graphics/wizard-graphics.css';
import coastLines from './ne_10m_coastline.json';

const checkboxConfig = [
    { key: 'shadedCheckbox', label: 'Shaded Layer' },
    { key: 'valueTextCheckbox', label: 'Value Text Layer' },
    { key: 'contourCheckbox', label: 'Contour Layer' },
    { key: 'contourLabels', label: 'Contour Labels', parent: 'contourCheckbox' },
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
        valueTextCheckbox: false,
        vectorCheckbox: false,
        particleCheckbox: false,
        terrainCheckbox: false,
        isGlobeView: true,
        geojsonLayer: true,
        colorScaleType: 'scaleThreshold',
        triangulationMode: 'quadkey',
        contourAlgorithm: 'marchingSquares',
        showStats: false, // Enable stats by default
        vectorMode: 'quadkey',
    });
    const radioOptions = ['HREF', 'RRFS', 'EAGLE', 'Unstructured', 'Radar'];
    const [currentDataset, setCurrentDataset] = React.useState(radioOptions[1]);

    const controllerOptions = ['MapLibre-GL', 'DeckGL'];
    const [currentController, setCurrentController] = React.useState(controllerOptions[0]);
    const triangulationModeOptions = [
        'unstructured',
        'quadkey',
        'quadkey-cells',
        'spherical',
        'spherical-cells',
    ];
    // Vector sampling modes (used by VectorLayer)
    const vectorModeOptions = ['unstructured', 'quadkey'];
    const contourAlgorithmOptions = ['marchingTriangles', 'marchingSquares'];
    const colorScaleOptions = ['scaleThreshold', 'scaleLinear'];

    const toggle = useCallback((key) => (e) => dispatch({ key, value: e.target.checked }), []);

    const overlayRef = useRef();
    const mapContainer = useRef();
    const mapRef = useRef();
    const statsRef = useRef();
    const deckRef = useRef();

    let variable;
    let temperatures;
    let wdir;
    let wmag;
    let projDict;
    let projection = null;
    let resLevel;
    let lonlatGrid;
    let shape = null;
    let rawDataTransform = 'kelvin-to-f';
    let dataUnits;
    let dataLabel;
    let nx;
    let ny;
    switch (currentDataset) {
        case 'HREF':
            temperatures = hrefTemperatures;
            wdir = hrefWdir;
            wmag = hrefWmag;
            projDict = hrefProjDict;
            resLevel = 4; // sample data is every 4th point
            variable = 't2';
            dataUnits = '°F';
            dataLabel = 'Temperature';
            break;
        case 'RRFS':
            temperatures = rrfsTemperatures;
            wdir = rrfsWdir;
            wmag = rrfsWmag;
            projDict = rrfsProjDict;
            resLevel = 8; // sample data is every 8th point
            variable = 't2';
            dataUnits = '°F';
            dataLabel = 'Temperature';
            break;
        case 'EAGLE':
            temperatures = eagleTemperatures;
            wdir = eagleWdir;
            wmag = eagleWmag;
            projDict = eagleProjDict;
            resLevel = 8; // sample data is every 8th point
            variable = 't2';
            dataUnits = '°F';
            dataLabel = 'Temperature';
            break;
        case 'Unstructured':
            temperatures = unstructuredTemperatures;
            wdir = unstructuredWdir;
            wmag = unstructuredWmag;
            projDict = null;
            lonlatGrid = unstructuredLonLat;
            nx = unstructuredLonLat.length;
            ny = 1;
            resLevel = null;
            variable = 't2';
            dataUnits = '°F';
            dataLabel = 'Temperature';
            break;
        case 'Radar':
            temperatures = radarReflectivity;
            wdir = new Array(radarReflectivity.length).fill(0);
            wmag = new Array(radarReflectivity.length).fill(10);
            projDict = null;
            nx = radarMeta.cols;
            ny = radarMeta.rows;
            lonlatGrid = radarLonLat;
            resLevel = null;
            rawDataTransform = 'identity';
            variable = 'refc';
            dataUnits = 'dBZ';
            dataLabel = 'Reflectivity';
            break;
        default:
            console.error('ERROR', `Unknown dataset: ${currentDataset}`);
    }
    wdir = useMemo(() => wdir.flat(), [wdir]);
    wmag = useMemo(() => wmag.flat().map((v) => v * 2.23694), [wmag]);
    const data = useMemo(() => {
        const values = temperatures.flat();
        if (rawDataTransform === 'identity') {
            return new Float32Array(values.map((v) => (v == null ? NaN : v)));
        }
        return new Float32Array(values.map((v) => (v == null ? NaN : ((v - 273.15) * 9) / 5 + 32)));
    }, [temperatures, rawDataTransform]);

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

    if (projDict) {
        projection = new Projection(projDict, resLevel);
        projection.makeLonLatGrid();
        lonlatGrid = projection.lonlatGrid;
        lonlatGrid = lonlatGrid.flat();
        nx = projection.nx;
        ny = projection.ny;
    }
    if (Number.isFinite(nx) && Number.isFinite(ny) && nx > 0 && ny > 0) {
        shape = [ny, nx];
    }

    const readoutType = projDict ? 'gridded' : currentDataset === 'Radar' ? 'spherical' : 'unstructured';
    const shouldInterpolateReadout =
        state.triangulationMode !== 'quadkey-cells' &&
        state.triangulationMode !== 'spherical-cells';
    const baseReadoutOptions = {
        projection,
        lonlatGrid,
        shape,
        readoutType,
        dataType: 'scalar',
        interpolate: shouldInterpolateReadout,
        triangulationMode: state.triangulationMode,
        units: dataUnits,
        prependText: dataLabel,
        decimals: 0,
    };
    console.log('Base readout options:', baseReadoutOptions);

    const { colors, colorLevels, contourLevels, colorType } =
        configFields[variable].colorBars.default;
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
                //onTileLoad: (tile) => console.log('Terrain tile loaded:', tile),
                //onTileError: (err) => console.error('Terrain tile error:', err),
            }),
        [state.terrainCheckbox],
    );


    const valueTextData = useMemo(() => {
        if (!lonlatGrid || !data) return [];

        const points = [];
        const appendPoint = (lon, lat, idx) => {
            const value = data[idx];
            if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(value)) return;
            points.push({
                position: [lon, lat],
                text: `${Math.round(value)}`,
            });
        };
        for (let i = 0; i < lonlatGrid.length; i += 1) {
            const p = lonlatGrid[i];
            appendPoint(p?.[0], p?.[1], i);
        }
        return points;
    }, [lonlatGrid, data, dataUnits]);

    const layers = [];
    if (state.terrainCheckbox) layers.push(terrainLayer);
    if (state.shadedCheckbox)
        layers.push(
            new ShadedLayer({
                id: `shadedLayer-${state.isGlobeView ? 'globe' : 'mercator'}-${state.triangulationMode}`,
                beforeId: mapStyles[style].beforeId,
                data,
                colors,
                colorLevels,
                colorType: state.colorScaleType,
                lonlatGrid,
                shape,
                triangulationMode: state.triangulationMode,
                elevation: 0,
                readout: [
                    {
                        data,
                        readoutFunction,
                        readoutOptions: baseReadoutOptions,
                    },
                ],
                legend: {
                    type: 'staticBar',
                    title: dataLabel,
                    units: dataUnits,
                },
            }),
        );
    if (state.contourCheckbox)
        layers.push(
            new ContourLayer({
                id: `contourLayer-${state.isGlobeView ? 'globe' : 'mercator'}-${state.triangulationMode}-${state.contourAlgorithm}`,
                beforeId: mapStyles[style].beforeId,
                data,
                colors,
                colorLevels,
                colorType,
                contourLevels,
                lonlatGrid,
                shape,
                algorithm: state.contourAlgorithm,
                elevation: 0,
                //extensions: [new TerrainExtension()],
                //terrainDrawMode: 'drape',
                labels: { enabled: state.contourLabels, getSize: 14 },
                readout: [
                    {
                        data,
                        readoutFunction,
                        readoutOptions: baseReadoutOptions,
                    },
                ],
                legend: { type: 'staticBar', title: dataLabel, units: dataUnits },
            }),
        );
    if (state.geojsonLayer) {
        layers.push(
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
        layers.push(
            new VectorLayer({
                id: `vectorLayer-${state.isGlobeView ? 'globe' : 'mercator'}`,
                beforeId: mapStyles[style].beforeId,
                dataDir: wdir,
                dataMag: wmag,
                lonlatGrid,
                // Sampling mode: 'unstructured' | 'quadkey' | 'spherical'
                triangulationMode: state.vectorMode,
                // optional grid shape [rows, cols] for fast sampling
                shape,
                angleOffset: state.isGlobeView ? 180 : 0,
                // padding in screen pixels (base, scaled internally)
                readout: [
                    {
                        data: wmag,
                        readoutFunction,
                        readoutOptions: { 
                            ...baseReadoutOptions,
                            prependText: 'Wind Speed',
                            units: 'mph', 
                        },
                    },
                    {
                        data: wdir,
                        readoutFunction,
                        readoutOptions: { 
                            ...baseReadoutOptions,
                            prependText: 'Wind Direction',
                            units: '°', 
                        },
                    },
                ],
            }),
        );
    if (state.valueTextCheckbox)
        layers.push(
            new TextLayer({
                id: `valueTextLayer-${state.isGlobeView ? 'globe' : 'mercator'}`,
                data: valueTextData,
                getColor: (x) => x.color || [245, 245, 245],
                getBackgroundColor: [255, 255, 255, 150],
                getSize: 12,
                getAngle: 0,
                billboard: true,
                background: false,
                backgroundPadding: [4, 1],
                getTextAnchor: 'middle',
                fontFamily: 'Helvetica',
                getAlignmentBaseline: 'center',
                parameters: {
                    depthCompare: 'always',
                    cullMode: 'none',
                },
                fontSettings: {
                    sdf: true,
                    radius: 12,
                    cutoff: 0.25,
                    buffer: 10,
                    smoothing: 0.2, // only applies if sdf is true
                },
                outlineWidth: 4,
                fontWeight: '700',
                outlineColor: [0, 0, 0, 255],
            }),
        );

    if (state.particleCheckbox)
        layers.push( new ParticleLayer({
            id: `particleLayer-${state.isGlobeView ? 'globe' : 'mercator'}-${currentDataset}-${currentController}`,
            dataDir: wdir,
            dataMag: wmag,
            color: [0, 0, 0, 255],
            width: 1.5,
            widthMinPixels: 1.5,
            numParticles: 10000,
            lonlatGrid,
            shape,
            readout: [
                {
                    data: wmag,
                    readoutFunction,
                    readoutOptions: { 
                        ...baseReadoutOptions,
                        prependText: 'Wind Speed',
                        units: 'mph', 
                    },
                },
                {
                    data: wdir,
                    readoutFunction,
                    readoutOptions: { 
                        ...baseReadoutOptions,
                        prependText: 'Wind Direction',
                        units: '°', 
                    },
                },
            ],
        }))



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

            <div style={{ margin: '1em 0' }}>
                Shaded Options:
                <br />
                {colorScaleOptions.map((option) => (
                    <label
                        key={option}
                        htmlFor={`colorscale-${option}`}
                        style={{ marginLeft: option === colorScaleOptions[0] ? 0 : '1em' }}
                    >
                        <input
                            id={`colorscale-${option}`}
                            type="radio"
                            name="color-scale"
                            value={option}
                            checked={state.colorScaleType === option}
                            onChange={() => dispatch({ key: 'colorScaleType', value: option })}
                        />
                        {option}
                    </label>
                ))}
                <br />
                {triangulationModeOptions.map((option) => (
                    <label
                        key={option}
                        htmlFor={`triangulation-${option}`}
                        style={{ marginLeft: option === triangulationModeOptions[0] ? 0 : '1em' }}
                    >
                        <input
                            id={`triangulation-${option}`}
                            type="radio"
                            name="triangulation-mode"
                            value={option}
                            checked={state.triangulationMode === option}
                            onChange={() => dispatch({ key: 'triangulationMode', value: option })}
                        />
                        {option}
                    </label>
                ))}
                <br />
                Vector Sampling:
                <br />
                {vectorModeOptions.map((option) => (
                    <label
                        key={option}
                        htmlFor={`vector-${option}`}
                        style={{ marginLeft: option === vectorModeOptions[0] ? 0 : '1em' }}
                    >
                        <input
                            id={`vector-${option}`}
                            type="radio"
                            name="vector-mode"
                            value={option}
                            checked={state.vectorMode === option}
                            onChange={() => dispatch({ key: 'vectorMode', value: option })}
                        />
                        {option}
                    </label>
                ))}
                <br />
                Contour Algorithm:
                <br />
                {contourAlgorithmOptions.map((option) => (
                    <label
                        key={option}
                        htmlFor={`contour-algorithm-${option}`}
                        style={{ marginLeft: option === contourAlgorithmOptions[0] ? 0 : '1em' }}
                    >
                        <input
                            id={`contour-algorithm-${option}`}
                            type="radio"
                            name="contour-algorithm"
                            value={option}
                            checked={state.contourAlgorithm === option}
                            onChange={() => dispatch({ key: 'contourAlgorithm', value: option })}
                        />
                        {option}
                    </label>
                ))}
            </div>
            <div ref={mapContainer} id="mapContainer" style={{ position: 'relative' }}>
                {currentController === 'MapLibre-GL' && (
                    <Map
                        initialViewState={{ longitude: -100.4, latitude: 37.8, zoom: 4 }}
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
