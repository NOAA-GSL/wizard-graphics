import React, { StrictMode, useMemo, useRef, useCallback, useReducer } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import {
    mapStyles,
    Maps,
    DeckGLOverlay,
    Readout,
    readoutFunction,
    Legend,
    Projection,
    ShadedLayer,
    ContourLayer,
    ParticleLayer,
    configFields,
} from 'wizard-graphics';

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

import { TerrainLayer, SolidPolygonLayer } from 'deck.gl';
import { _TerrainExtension as TerrainExtension } from '@deck.gl/extensions';
import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'wizard-graphics/wizard-graphics.css';

const checkboxConfig = [
    { key: 'contourCheckbox', label: 'Contour Layer' },
    { key: 'contourLabels', label: 'Contour Labels', parent: 'contourCheckbox' },
    { key: 'shadedCheckbox', label: 'Shaded Layer' },
    { key: 'shadedInterpolateCheckbox', label: 'Interpolate Data', parent: 'shadedCheckbox' },
    { key: 'particleCheckbox', label: 'Particle Layer' },
    { key: 'terrainCheckbox', label: 'Terrain Layer' },
    { key: 'solidPolygonLayer', label: 'Solid Polygon Layer' },
];

function MapContainer() {
    const { mapToken } = process.env;
    const style = useMemo(() => Object.keys(mapStyles)[0], []);
    const mapStyle = useMemo(() => Maps.loadMapStyle(style, mapToken), [style, mapToken]);

    const [state, dispatch] = useReducer((s, { key, value }) => ({ ...s, [key]: value }), {
        contourCheckbox: true,
        contourLabels: true,
        shadedCheckbox: true,
        shadedInterpolateCheckbox: true,
        particleCheckbox: true,
        terrainCheckbox: true,
        solidPolygonLayer: true,
    });
    const radioOptions = ['HREF', 'RRFS', 'EAGLE'];
    const [currentDataset, setCurrentDataset] = React.useState(radioOptions[0]);

    const toggle = useCallback((key) => (e) => dispatch({ key, value: e.target.checked }), []);

    const overlayRef = useRef();
    const mapContainer = useRef();
    const mapRef = useRef();

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
    const data = useMemo(
        () =>
            new Float32Array(
                temperatures.flat().map((v) => (v == null ? NaN : ((v - 273.15) * 9) / 5 + 32)),
            ),
        [temperatures],
    );

    const dataDir = useMemo(
        () => new Float32Array(wdir.flat().map((v) => (v == null ? NaN : v))),
        [wdir],
    );

    const dataMag = useMemo(
        () => new Float32Array(wmag.flat().map((v) => (v == null ? NaN : v * 2.23694))),
        [wmag],
    );

    const projection = useMemo(() => {
        const p = new Projection(projDict, resLevel);
        p.makeLonLatGrid();
        return p;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDataset]);

    const lonlatGrid = useMemo(() => projection?.lonlatGrid?.flat?.() || [], [projection]);
    const shape = useMemo(() => {
        const nx = projection?.nx;
        const ny = projection?.ny;
        if (Number.isFinite(nx) && Number.isFinite(ny) && nx > 0 && ny > 0) {
            return [ny, nx];
        }
        return null;
    }, [projection]);

    const baseReadoutOptions = useMemo(
        () => ({
            projection,
            lonlatGrid,
            shape,
            readoutType: 'gridded',
            dataType: 'scalar',
            interpolate: true,
            decimals: 0,
            units: '°F',
            prependText: 'Mean Temperature',
        }),
        [projection, lonlatGrid, shape],
    );

    const field = 't2';
    const { colors, colorLevels, contourLevels, colorType } = configFields[field].colorBars.default;

    const terrainLayer = useMemo(() => {
        // Mapzen
        const elevationDecoder = {
            rScaler: 256,
            gScaler: 1,
            bScaler: 0.00390625,
            offset: -32768,
        };
        const elevationData =
            'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
        const texture =
            'https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png';
        const magicalTerrainLayer = new TerrainLayer({
            id: `terrain-layer`,
            elevationData,
            texture,
            elevationDecoder,
            wireframe: false,
            visible: state.terrainCheckbox,
            strategy: 'no-overlap',
            color: [255, 255, 255],
            operation: 'terrain+draw',
            // onTileLoad: (tile) => console.log('Terrain tile loaded:', tile),
            // onTileError: (err) => console.error('Terrain tile error:', err),
        });
        return magicalTerrainLayer;
    }, [state.terrainCheckbox]);

    const layers = useMemo(() => {
        const result = [];
        if (state.terrainCheckbox) result.push(terrainLayer);
        if (state.solidPolygonLayer) {
            result.push(
                new SolidPolygonLayer({
                    id: 'SolidPolygonLayer',
                    data: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/sf-zipcodes.json',
                    extensions: [new TerrainExtension()],
                    terrainDrawMode: 'drape',
                    extruded: true,
                    wireframe: true,
                    getPolygon: (d) => d.contour,
                    getElevation: (d) => d.population / d.area / 10,
                    getFillColor: (d) => [d.population / d.area / 60, 140, 0],
                    getLineColor: [80, 80, 80],
                    pickable: true,
                }),
            );
        }
        if (state.shadedCheckbox)
            result.push(
                new ShadedLayer({
                    id: `shadedLayer`,
                    beforeId: mapStyles[style].beforeId,
                    data,
                    colors,
                    colorLevels,
                    colorType,
                    lonlatGrid,
                    shape,
                    triangulationMode: 'quadkey',
                    elevation: 0,
                    extensions: [new TerrainExtension()],
                    terrainDrawMode: 'drape',
                    interpolateData: state.shadedInterpolateCheckbox,
                    readout: [
                        {
                            data,
                            readoutFunction,
                            readoutOptions: baseReadoutOptions,
                        },
                    ],
                    legend: { type: 'staticBar', title: 'Temperature', units: '°F' },
                }),
            );
        if (state.contourCheckbox)
            result.push(
                new ContourLayer({
                    id: 'contourLayer-mercator',
                    beforeId: mapStyles[style].beforeId,
                    data,
                    colors,
                    colorLevels,
                    colorType,
                    contourLevels,
                    lonlatGrid,
                    shape,
                    elevation: 0,
                    extensions: [new TerrainExtension()],
                    terrainDrawMode: 'drape',
                    labels: { enabled: state.contourLabels, getSize: 14 },
                    readout: [
                        {
                            data,
                            readoutFunction,
                            readoutOptions: baseReadoutOptions,
                        },
                    ],
                    legend: { type: 'staticBar', title: 'Temperature', units: '°F' },
                }),
            );
        if (state.particleCheckbox)
            result.push(
                new ParticleLayer({
                    id: `particleLayer-${currentDataset}`,
                    dataDir,
                    dataMag,
                    lonlatGrid,
                    shape,
                    color: [255, 255, 255, 255],
                    width: 1.5,
                    numParticles: 10000,
                    widthMinPixels:1.5,
                    extensions: [new TerrainExtension()],
                    terrainDrawMode: 'offset',
                    readout: [
                        {
                            data: dataMag,
                            readoutFunction,
                            readoutOptions: {
                                ...baseReadoutOptions,
                                prependText: 'Wind Speed',
                                units: 'mph',
                            },
                        },
                    ],
                }),
            );
        return result;
    }, [
        state.terrainCheckbox,
        state.solidPolygonLayer,
        state.shadedCheckbox,
        state.shadedInterpolateCheckbox,
        state.contourCheckbox,
        state.particleCheckbox,
        state.contourLabels,
        terrainLayer,
        style,
        data,
        dataDir,
        dataMag,
        currentDataset,
        colors,
        colorLevels,
        colorType,
        lonlatGrid,
        shape,
        baseReadoutOptions,
        contourLevels,
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
            <div ref={mapContainer} id="mapContainer" style={{ position: 'relative' }}>
                {console.log('layers:', layers)}
                <Map
                    initialViewState={{ longitude: -100.4, latitude: 37.8, zoom: 3 }}
                    // maxPitch={0}
                    ref={mapRef}
                    antialias
                    mapStyle={mapStyle}
                    projection="mercator"
                >
                    <DeckGLOverlay overlayRef={overlayRef} layers={layers} />
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
