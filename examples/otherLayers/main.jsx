import { StrictMode, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import { Maps, DeckGLOverlay, Readout } from 'desi-graphics/maps';
import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import demoCities from 'demo-data/demoCities';
import { IconClusterLayer, CitiesLayer } from 'desi-graphics/layers';
import temperatures from 'demo-data/temp';
import projDict from 'demo-data/projection';
import { Projection } from 'desi-graphics/utilities';
import {
    SpotLayer,
    NIFCLayer,
    CPCLayer,
    SPCLayer,
    WPCLayer,
    WWALayer,
} from 'desi-graphics/layers/canned';
import URLdata from './URLdata';
import iconMapping from './icon/location-icon-mapping.json?url';
import iconAtlas from './icon/location-icon-atlas.png?url';
import { Legend } from '../../src/maps';

function MapContainer() {
    // memoizing so that it doesn't re-run when moving the map or other re-renders
    const { mapToken } = process.env;
    const style = Maps.getMaps()[1];
    const mapStyle = useMemo(() => Maps.getStyle(style, mapToken), [style, mapToken]);
    const [state, setState] = useState({
        iconLayerCheckbox: false,
        citiesLayerCheckbox: false,
        citiesDataLabelsCheckbox: true,
        spotLayerCheckbox: true,
        nifcLayerCheckbox: false,
        cpcLayerCheckbox: false,
        spcLayerCheckbox: false,
        wpcLayerCheckbox: false,
        wwaLayerCheckbox: false,
    });
    const overlayRef = useRef();
    const mapContainer = useRef();
    const mapRef = useRef();
    const [viewState, setViewState] = useState({});
    const layers = [];

    // Make the LonLatGrid of Data
    // This is HREF data sampled every 4 points (resLevel = 4)
    const resLevel = 4;
    const projection = new Projection(projDict, resLevel);
    projection.makeLonLatGrid();

    // Format data (nulls to NaN)
    const data = new Float32Array(
        Object.values(temperatures).map((value) => (value === null ? NaN : value)),
    );

    if (state.iconLayerCheckbox) {
        console.log('demoCities', demoCities.length);
        const iconLayer = new IconClusterLayer({
            id: 'iconLayer',
            data: demoCities,
            pickable: false,
            getPosition: (d) => [parseFloat(d.lon), parseFloat(d.lat), 0],
            iconAtlas,
            iconMapping,
            sizeScale: 40,
        });
        layers.push(iconLayer);
    }
    if (state.citiesLayerCheckbox) {
        const citiesLayer = new CitiesLayer({
            id: 'citiesLayer',
            cityList: demoCities,
            ...(state.citiesDataLabelsCheckbox && {
                dataLabels: {
                    data,
                    projection,
                    decimals: 0,
                    units: '°F',
                    interpolate: true,
                },
            }),
            pickable: true,
            // background: false,
            // cityBaseScale: layer.fontSize,
            // settings,
        });
        layers.push(citiesLayer);
    }
    if (state.spotLayerCheckbox) {
        const spotLayer = new SpotLayer({
            id: 'spotLayer',
            pickable: true,
        });
        layers.push(spotLayer);
    }
    if (state.nifcLayerCheckbox) {
        const nifcLayer = new NIFCLayer({
            id: 'nifcLayer',
            data: URLdata['NIFC-active'],
            incidents: 'active', // 'active' or 'last24Hours'
            pickable: true,
        });
        layers.push(nifcLayer);
    }
    if (state.cpcLayerCheckbox) {
        const cpcLayer = new CPCLayer({
            id: 'cpcLayer',
            data: URLdata['CPC-day6-10Temp'],
            pickable: true,
        });
        layers.push(cpcLayer);
    }
    if (state.spcLayerCheckbox) {
        const spcLayer = new SPCLayer({
            id: 'spcLayer',
            data: URLdata['SPC-day1Outlook'],
            pickable: true,
        });
        layers.push(spcLayer);
    }

    if (state.wpcLayerCheckbox) {
        const wpcLayer = new WPCLayer({
            id: 'wpcLayer',
            data: URLdata['WPC-day3Outlook'],
            pickable: true,
        });
        layers.push(wpcLayer);
    }
    if (state.wwaLayerCheckbox) {
        const wwaLayer = new WWALayer({
            id: 'wwaLayer',
            data: URLdata.WWA,
            pickable: true,
        });
        layers.push(wwaLayer);
    }

    const checkboxes = [
        { key: 'citiesLayerCheckbox', label: 'Cities Layer', break: false },
        { key: 'citiesDataLabelsCheckbox', label: 'Cities Data Labels', break: true },
        { key: 'iconLayerCheckbox', label: 'Icon Cluster Layer', break: true },
        { key: 'spotLayerCheckbox', label: 'Spot Layer', break: true },
        { key: 'nifcLayerCheckbox', label: 'NIFC Layer', break: true },
        { key: 'cpcLayerCheckbox', label: 'CPC Layer', break: true },
        { key: 'spcLayerCheckbox', label: 'SPC Layer', break: true },
        { key: 'wpcLayerCheckbox', label: 'WPC Layer', break: true },
        { key: 'wwaLayerCheckbox', label: 'WWA Layer', break: true },
    ];

    function onViewStateChange(props) {
        const { viewState: viewStateNew } = props;
        if (viewState) {
            setViewState(viewStateNew);
        }
    }

    return (
        <>
            {checkboxes.map((checkbox) => (
                <span key={checkbox.key}>
                    <label htmlFor={checkbox.key}>
                        <input
                            id={checkbox.key}
                            type="checkbox"
                            checked={state[checkbox.key]}
                            onChange={(e) => {
                                setState({ ...state, [checkbox.key]: e.target.checked });
                            }}
                        />
                        {checkbox.label}
                    </label>
                    {checkbox.break && <br />}
                </span>
            ))}

            <div ref={mapContainer} id="mapContainer">
                <Map
                    initialViewState={{
                        longitude: -100.4,
                        latitude: 37.8,
                        zoom: 3,
                    }}
                    ref={mapRef}
                    onMoveEnd={onViewStateChange}
                    antialias
                    reuseMaps
                    mapStyle={mapStyle}
                >
                    <DeckGLOverlay overlayRef={overlayRef} layers={layers} interleaved />
                    <Readout
                        mapContainer={mapContainer}
                        overlayRef={overlayRef}
                        layers={layers}
                        title="Wed 06:00 am PST, Oct 21"
                    />
                    <Legend mapRef={mapRef} overlayRef={overlayRef} viewState={viewState} />
                </Map>
            </div>
        </>
    );
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <MapContainer />,
    </StrictMode>,
);
