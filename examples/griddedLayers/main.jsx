import { StrictMode, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import { Maps, DeckGLOverlay, Readout, Legend } from 'desi-graphics/maps';
import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import projDict from 'demo-data/projection';
import temperatures from 'demo-data/temp';
import wdir from 'demo-data/wdir';
import wmag from 'demo-data/wmag';
import { Projection } from 'desi-graphics/utilities';
import { ContourLayer, ShadedLayer, VectorLayer } from 'desi-graphics/layers';

function MapContainer() {
    // memoizing so that it doesn't re-run when moving the map or other re-renders
    const { mapToken } = process.env;
    const style = Maps.getMaps()[0];
    const mapStyle = useMemo(() => Maps.getStyle(style, mapToken), [style, mapToken]);
    const [state, setState] = useState({
        contourCheckbox: true,
        contourLabels: true,
        shadedCheckbox: true,
        shadedInterpolateCheckbox: true,
        vectorCheckbox: false,
    });
    const overlayRef = useRef();
    const mapContainer = useRef();
    // Make the LonLatGrid of Data
    // This is HREF data sampled every 4 points (resLevel = 4)
    const resLevel = 4;
    const projection = new Projection(projDict, resLevel);
    projection.makeLonLatGrid();

    // Define colors, colorLevels, and contour levels (optional)
    const colors = [
        'rgb(145,0,63)',
        'rgb(206,18,86)',
        'rgb(231,41,138)',
        'rgb(223,101,176)',
        'rgb(255,115,223)',
        'rgb(255,190,232)',
        'rgb(250,250,250)',
        'rgb(218,218,235)',
        'rgb(188,189,220)',
        'rgb(158,154,200)',
        'rgb(117,107,177)',
        'rgb(84,39,143)',
        'rgb(13,0,125)',
        'rgb(13,61,156)',
        'rgb(0,102,194)',
        'rgb(41,158,255)',
        'rgb(74,199,255)',
        'rgb(115,215,255)',
        'rgb(173,255,255)',
        'rgb(48,207,194)',
        'rgb(0,153,150)',
        'rgb(18,87,87)',
        'rgb(6,109,44)',
        'rgb(49,163,84)',
        'rgb(116,196,118)',
        'rgb(161,217,155)',
        'rgb(211,255,190)',
        'rgb(255,255,179)',
        'rgb(255,237,160)',
        'rgb(254,209,118)',
        'rgb(254,174,42)',
        'rgb(253,141,60)',
        'rgb(252,78,42)',
        'rgb(227,26,28)',
        'rgb(177,0,38)',
        'rgb(128,0,38)',
        'rgb(89,0,66)',
        'rgb(40,0,40)',
    ];
    const colorLevels = [
        -60, -55, -50, -45, -40, -35, -30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40,
        45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120,
    ];
    const contourLevels = [
        -60, -55, -50, -45, -40, -35, -30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40,
        45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120,
    ];
    const colorType = 'threshold';

    // Format data (nulls to NaN)
    const data = new Float32Array(
        Object.values(temperatures).map((value) => (value === null ? NaN : value)),
    );

    const layers = [];
    //

    if (state.shadedCheckbox) {
        const shadedLayer = new ShadedLayer({
            id: 'shadedLayer',
            // beforeId: getBeforeID(plottype),
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
            // beforeId: getBeforeID(plottype),
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
            // beforeId: getBeforeID(layer.plottype),
        });
        layers.push(vectorLayer);
    }

    /*
    Not working until deck.gl v9.1
    const particleLayer = new ParticleLayer({
        id: 'vectorLayer',
        dataDir: wdir,
        dataMag: wmag,
        proj,
        // beforeId: getBeforeID(layer.plottype),
    });
    */

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

            <div ref={mapContainer} id="mapContainer">
                <Map
                    initialViewState={{
                        longitude: -100.4,
                        latitude: 37.8,
                        zoom: 3,
                    }}
                    antialias
                    reuseMaps
                    mapStyle={mapStyle}
                >
                    <DeckGLOverlay overlayRef={overlayRef} layers={layers} interleaved />
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
