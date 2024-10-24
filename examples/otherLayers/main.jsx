import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import { Maps, DeckGLOverlay, Readout } from 'desi-graphics/maps';
import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import demoCities from 'demo-data/demoCities';
import { IconClusterLayer, CitiesLayer } from 'desi-graphics/layers';
import iconMapping from './icon/location-icon-mapping.json?url';
import iconAtlas from './icon/location-icon-atlas.png?url';
import temperatures from 'demo-data/temp';
import projDict from 'demo-data/projection';
import { Projection } from 'desi-graphics/utilities';

function MapContainer() {
    // memoizing so that it doesn't re-run when moving the map or other re-renders
    const { mapToken } = process.env;
    const style = Maps.getMaps()[1];
    const mapStyle = useMemo(() => Maps.getStyle(style, mapToken), [style, mapToken]);
    const [state, setState] = useState({
        iconLayerCheckbox: false,
        citiesLayerCheckbox: true,
        citiesDataLabelsCheckbox: true,
    });
    const overlayRef = useRef();
    const mapContainer = useRef();

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

    return (
        <>
            <label htmlFor="iconLayerCheckbox">
                <input
                    id="iconLayerCheckbox"
                    type="checkbox"
                    checked={state.iconLayerCheckbox}
                    onChange={(e) => {
                        setState({ ...state, iconLayerCheckbox: e.target.checked });
                    }}
                />
                Icon Cluster Layer
            </label>
            <br />
            <label htmlFor="citiesLayerCheckbox">
                <input
                    id="citiesLayerCheckbox"
                    type="checkbox"
                    checked={state.citiesLayerCheckbox}
                    onChange={(e) => {
                        setState({ ...state, citiesLayerCheckbox: e.target.checked });
                    }}
                />
                Cities Layer
            </label>
            <label htmlFor="citiesDataLabelsCheckbox">
                <input
                    id="citiesDataLabelsCheckbox"
                    type="checkbox"
                    checked={state.citiesDataLabelsCheckbox}
                    onChange={(e) => {
                        setState({ ...state, citiesDataLabelsCheckbox: e.target.checked });
                    }}
                />
                Cities Data Labels
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
                        layers={layers}
                        title="Wed 06:00 am PST, Oct 21"
                    />
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
