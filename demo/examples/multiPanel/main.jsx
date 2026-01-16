import React, { StrictMode, useMemo, useRef, useCallback, useReducer, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
// eslint-disable-next-line import/no-unresolved
import { Map } from 'react-map-gl/maplibre';
import Stats from 'stats.js';
import {
    // mapStyles,
    // Maps,
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

import { MapView, _GlobeView as GlobeView } from 'deck.gl';
import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'desi-graphics/desi-graphics.css';
import coastLines from './ne_10m_coastline.json';
import displayLayout from './displayLayout';

const checkboxConfig = [
    { key: 'contourCheckbox', label: 'Contour Layer' },
    { key: 'contourLabels', label: 'Contour Labels', parent: 'contourCheckbox' },
    { key: 'shadedCheckbox', label: 'Shaded Layer' },
    { key: 'shadedInterpolateCheckbox', label: 'Interpolate Data', parent: 'shadedCheckbox' },
    { key: 'vectorCheckbox', label: 'Vector Layer' },
    { key: 'particleCheckbox', label: 'Particle Layer' },
    { key: 'isGlobeView', label: 'Globe View' },
    { key: 'geojsonLayer', label: 'GeoJSON Layer' },
    { key: 'showStats', label: 'Show Performance Stats' },
];

function MapContainer() {
    // const { mapToken } = process.env;
    // const style = useMemo(() => Object.keys(mapStyles)[0], []);
    // const mapStyle = useMemo(() => Maps.loadMapStyle(style, mapToken), [style, mapToken]);

    const [state, dispatch] = useReducer((s, { key, value }) => ({ ...s, [key]: value }), {
        contourCheckbox: true,
        contourLabels: true,
        shadedCheckbox: true,
        shadedInterpolateCheckbox: true,
        vectorCheckbox: true,
        particleCheckbox: true,
        isGlobeView: true,
        geojsonLayer: true,
        showStats: false, // Enable stats by default
        views: [],
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

    // multi-view stuff -----------------------------------//
    const displayNum = 4; // Change this to test different layouts

    function getViewOffset(num) {
        const { rows, cols } = displayLayout[displayNum];
        const lineWidth = displayNum > 1 ? 4 : 0; // border in pixels
        const dims = mapContainer?.current?.getBoundingClientRect();
        const xLineTotalPerc = (((cols - 1) * lineWidth) / dims.width) * 100 || 0; // width of all lines
        const xLinePer = cols - 1 ? xLineTotalPerc / (cols - 1) : 0; // width for an individual line
        const yLineTotalPerc = (((rows - 1) * lineWidth) / dims.height) * 100 || 0;
        const yLinePer = rows - 1 ? yLineTotalPerc / (rows - 1) : 0;
        const width = (100 - xLineTotalPerc) / cols; // width of a single view in percent
        const height = (100 - yLineTotalPerc) / rows;
        const xpos = (num % cols) * xLinePer + (num % cols) * width; // x position in percent
        const currentRow = Math.floor(num / cols);
        const ypos = currentRow * yLinePer + currentRow * height;

        return [xpos, ypos, width, height];
    }

    window.getViewOffset = getViewOffset;

    function makeView(num) {
        // num = current display number
        // numDisplay = total number of display

        const [xpos, ypos, width, height] = getViewOffset(num);
        // If 'mapbox' is not used, interleaved does not working
        const id =
            currentController !== 'MapLibre-GL'
                ? `${currentController}-${num}`
                : displayNum > 1
                  ? `mapbox-${num}`
                  : 'mapbox';
        const obj = {
            id,
            x: `${xpos}%`,
            y: `${ypos}%`,
            height: `${height}%`,
            width: `${width}%`,
            clear: false, // setting this to true disables the repeat
            controller: {
                keyboard: false, // prevent map from moving left/right with arrow
                scrollZoom: {
                    speed: 0.003,
                    // There is a weird bug in deck.gl where the zoom value
                    // can change over 0.5 in a single scroll.  To mitigate the bug
                    // I am using smooth false.
                    // speed: 0.05,
                    smooth: false,
                },
                inertia: 500,
            },
            minPitch: 0,
            maxPitch: 90,
        };

        let view;
        if (!state.isGlobeView) {
            obj.repeat = true;
            view = new MapView(obj);
        } else {
            view = new GlobeView(obj);
        }

        return view;
    }

    useEffect(() => {
        const views = [];
        for (let i = 0; i < displayNum; i += 1) {
            views.push(makeView(i));
        }
        dispatch({ key: 'views', value: views });
    }, [displayNum, state.isGlobeView, currentController]); // eslint-disable-line react-hooks/exhaustive-deps
    // ---------------------------------------------------//

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
    // wdir2: wdir but values capped at 180
    const wdir2 = useMemo(() => wdir.map((v) => Math.min(v, 180)), [wdir]);
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
    useEffect(
        () => () => {
            if (statsRef.current && statsRef.current.dom.parentNode) {
                statsRef.current.dom.parentNode.removeChild(statsRef.current.dom);
            }
        },
        [],
    );

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
    }, [projDict, resLevel, state.isGlobeView]);

    const field = 't2';
    const { colors, colorLevels, contourLevels, colorType } = configFields[field].colorBars.default;

    const layers = useMemo(() => {
        const result = [];
        if (state.shadedCheckbox)
            result.push(
                new ShadedLayer({
                    id: `shadedLayer-${state.isGlobeView ? 'globe' : 'mercator'}-${state.shadedInterpolateCheckbox ? 'interp' : 'nointerp'}`,
                    // beforeId: mapStyles[style].beforeId,
                    data,
                    colors,
                    colorLevels,
                    colorType,
                    projection,
                    elevation: 0,
                    displaynum: [0], // important for multi-panel!
                    interpolateData: state.shadedInterpolateCheckbox,
                    parameters: { depthCompare: 'always', cullMode: 'back' },
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
        if (state.contourCheckbox)
            result.push(
                new ContourLayer({
                    id: `contourLayer-${state.isGlobeView ? 'globe' : 'mercator'}`,
                    // beforeId: mapStyles[style].beforeId,
                    data,
                    colors,
                    colorLevels,
                    colorType,
                    contourLevels,
                    projection,
                    elevation: 0,
                    displaynum: [1], // important for multi-panel!
                    parameters: {
                        depthCompare: 'always',
                        cullMode: 'back',
                    },
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
                    parameters: {
                        depthCompare: 'always',
                        frontFace: 'ccw',
                        cullMode: 'back',
                    },
                    getPointRadius: 4,
                    getTextSize: 12,
                }),
            );
        }
        if (state.vectorCheckbox)
            result.push(
                new VectorLayer({
                    id: `vectorLayer-${state.isGlobeView ? 'globe' : 'mercator'}`,
                    // beforeId: mapStyles[style].beforeId,
                    dataDir: wdir,
                    dataMag: wmag,
                    getColor: [255, 255, 255, 255],
                    projection,
                    displaynum: [2], // important for multi-panel!
                    angleOffset: state.isGlobeView ? 180 : 0,
                    parameters: { depthTest: false, depthCompare: 'always', cullMode: 'front' },
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
        if (state.particleCheckbox) {
            result.push(
                new ParticleLayer({
                    id: `particleLayer-${state.isGlobeView ? 'globe' : 'mercator'}-${currentDataset}-${currentController}`,
                    dataDir: wdir,
                    dataMag: wmag,
                    displaynum: [2],
                    color: [255, 255, 255, 255],
                    width: 1.5,
                    widthMinPixels: 1.5,
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
                }),
                new ParticleLayer({
                    id: `particleLayer2-${state.isGlobeView ? 'globe' : 'mercator'}-${currentDataset}-${currentController}`,
                    dataDir: wdir2,
                    dataMag: wmag,
                    displaynum: [3],
                    color: [255, 0, 255, 255],
                    width: 1.5,
                    widthMinPixels: 1.5,
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
                }),
            );
        }

        return result;
    }, [
        state.shadedCheckbox,
        state.isGlobeView,
        state.shadedInterpolateCheckbox,
        state.contourCheckbox,
        state.contourLabels,
        state.geojsonLayer,
        state.vectorCheckbox,
        state.particleCheckbox,
        currentController,
        data,
        colors,
        colorLevels,
        colorType,
        projection,
        contourLevels,
        wdir,
        wmag,
    ]);

    const layerFilter = useCallback(
        ({ layer, viewport }) => {
            const viewNum = Number(viewport.id.split('-')[1]) || 0;

            // Access the main layer from the deck.gl layer id
            const matchingLayer = layers.find((l) => l.id === layer.id);
            const layerDisplayNum = matchingLayer?.props.displaynum;

            // mapbox id will be automatically added in multiple displays, we don't use this id
            // in multiple displays
            // Hide the default 'mapbox' viewport in multi-panel mode
            if (viewport.id === 'mapbox' && displayNum > 1) {
                return false;
            }

            if (typeof layerDisplayNum !== 'undefined') {
                if (layerDisplayNum.includes(viewNum)) return true;
                return false;
            }
            return true;
        },
        [layers, displayNum],
    );

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
            <div ref={mapContainer} id="mapContainer" style={{ position: 'relative' }}>
                {currentController === 'MapLibre-GL' && (
                    <Map
                        initialViewState={{ longitude: -100.4, latitude: 37.8, zoom: 3 }}
                        maxPitch={0}
                        ref={mapRef}
                        antialias
                        // mapStyle={mapStyle}
                        projection={state.isGlobeView ? 'globe' : 'mercator'}
                    >
                        <DeckGLOverlay
                            views={state.views}
                            overlayRef={overlayRef}
                            layers={layers}
                            // eslint-disable-next-line react/jsx-no-bind
                            layerFilter={layerFilter}
                            interleaved
                        />
                        {/* Render a Readout for each panel */}
                        <Readout
                            mapContainer={mapContainer}
                            overlayRef={overlayRef}
                            title="Multi-Panel Display"
                            views={state.views}
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
                        views={state.views}
                        layerFilter={layerFilter}
                    >
                        <Readout
                            mapContainer={mapContainer}
                            overlayRef={deckRef}
                            title="Multi-Panel Display"
                            views={state.views}
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
