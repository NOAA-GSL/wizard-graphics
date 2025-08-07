import { StrictMode, useMemo, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import { Maps, DeckGLOverlay, Readout, mapStyles, Legend } from 'desi-graphics';
import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import demoCities from 'demo-data/demoCities';
import { IconClusterLayer, CitiesLayer } from 'desi-graphics';
import temperatures from 'demo-data/temp';
import projDict from 'demo-data/projection';
import { Projection } from 'desi-graphics';
import { SpotLayer, NIFCLayer, CPCLayer, SPCLayer, WPCLayer, WWALayer } from 'desi-graphics';
import URLdata from './URLdata';
import iconMapping from './icon/location-icon-mapping.json?url';
import iconAtlas from './icon/location-icon-atlas.png?url';
import 'desi-graphics/desi-graphics.css';

// Custom persistent tooltip component
function PersistentTooltip({ tooltip, onClose }) {
    if (!tooltip) return null;

    return (
        <div
            className="x4d-readout x4d-persistent-tooltip"
            style={{
                left: tooltip.x,
                top: tooltip.y,
                pointerEvents: 'auto', // Override the pointer-events: none from x4d-readout
                position: 'absolute',
            }}
            onClick={(e) => e.stopPropagation()} // Prevent map clicks from closing
        >
            <div className="x4d-persistent-tooltip-header">
                <div className="x4d-persistent-tooltip-content">
                    {tooltip.readout}
                </div>
                <button
                    className="x4d-persistent-tooltip-close"
                    onClick={onClose}
                    title="Close tooltip"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

function MapContainer() {
    // memoizing so that it doesn't re-run when moving the map or other re-renders
    const { mapToken } = process.env;
    const style = Object.keys(mapStyles)[1];
    const mapStyle = useMemo(() => Maps.loadMapStyle(style, mapToken), [style, mapToken]);
    const [state, setState] = useState({
        iconLayerCheckbox: false,
        citiesLayerCheckbox: false,
        citiesDataLabelsCheckbox: true,
        spotLayerCheckbox: false,
        nifcLayerCheckbox: false,
        cpcLayerCheckbox: false,
        spcLayerCheckbox: false,
        wpcLayerCheckbox: false,
        wwaLayerCheckbox: true,
        isGlobeView: true,
    });
    
    // Add state for persistent tooltip
    const [persistentTooltip, setPersistentTooltip] = useState(null);
    
    // Add ref to track when spot was clicked to prevent immediate closure
    const spotClickedRef = useRef(false);
    
    const overlayRef = useRef();
    const mapContainer = useRef();
    const mapRef = useRef();
    const [viewState, setViewState] = useState({});
    const layers = [];

    // Make the LonLatGrid of Data
    // This is HREF data sampled every 4 points (resLevel = 4)
    const resLevel = 4;
    const projection = useMemo(() => {
        const p = new Projection(projDict, resLevel);
        p.makeLonLatGrid();
        p.isGlobe = state.isGlobeView;
        return p;
    }, [state.isGlobeView]);

    // Format data (nulls to NaN)
    const data = new Float32Array(
        Object.values(temperatures).map((value) => (value === null ? NaN : value)),
    );

    // Handle spot layer clicks
    const handleSpotClick = useCallback((info, event) => {
        console.log('Spot clicked:', info); // Debug log
        
        // Set flag to prevent map click from closing tooltip immediately
        spotClickedRef.current = true;
        
        // Clear flag after a short delay
        setTimeout(() => {
            spotClickedRef.current = false;
        }, 100);
        
        if (info.object) {
            // Get the screen coordinates from the click event
            const rect = mapContainer.current?.getBoundingClientRect();
            if (!rect) return false;
            
            const x = info.pixel ? info.pixel[0] : (event?.center?.x || 0);
            const y = info.pixel ? info.pixel[1] : (event?.center?.y || 0);

            // Use the picking function from SpotLayer default props directly
            const { tid, stat, name, type, rmade, rfill, deliverdtg, wfo, snumunum } = info.object.properties;
            
            // Build tooltip content directly (same logic as in SpotLayer)
            const readout = [];
            
            if (name) {
                readout.push(
                    <div key="name">
                        <strong>Name:</strong> {name}
                        <br />
                    </div>
                );
            }

            if (tid && stat) {
                // Import getSymbolInfo function or recreate it here
                const uniqueValueMap = {
                    '0,P': { color: [255, 193, 7, 150], cirtext: 'W', label: 'Wildfire Pending' },
                    '0,C': { color: [25, 135, 84, 150], cirtext: 'W', label: 'Wildfire Completed' },
                    '1,P': { color: [255, 193, 7, 150], cirtext: 'P', label: 'Prescribed Pending' },
                    '1,C': { color: [25, 135, 84, 150], cirtext: 'P', label: 'Prescribed Completed' },
                    '2,P': { color: [255, 193, 7, 150], cirtext: 'M', label: 'Marine Pending' },
                    '2,C': { color: [25, 135, 84, 150], cirtext: 'M', label: 'Marine Completed' },
                    '3,P': { color: [255, 193, 7, 150], cirtext: 'H', label: 'Hazmat Pending' },
                    '4,P': { color: [255, 193, 7, 150], cirtext: 'H', label: 'Hazmat Pending' },
                    '8,P': { color: [255, 193, 7, 150], cirtext: 'H', label: 'Hazmat Pending' },
                    '3,C': { color: [25, 135, 84, 150], cirtext: 'H', label: 'Hazmat Completed' },
                    '4,C': { color: [25, 135, 84, 150], cirtext: 'H', label: 'Hazmat Completed' },
                    '8,C': { color: [25, 135, 84, 150], cirtext: 'H', label: 'Hazmat Completed' },
                    '5,P': { color: [255, 193, 7, 150], cirtext: 'S', label: 'SAR Pending' },
                    '6,P': { color: [255, 193, 7, 150], cirtext: 'S', label: 'SAR Pending' },
                    '9,P': { color: [255, 193, 7, 150], cirtext: 'S', label: 'SAR Pending' },
                    '5,C': { color: [25, 135, 84, 150], cirtext: 'S', label: 'SAR Completed' },
                    '6,C': { color: [25, 135, 84, 150], cirtext: 'S', label: 'SAR Completed' },
                    '9,C': { color: [25, 135, 84, 150], cirtext: 'S', label: 'SAR Completed' },
                    '7,P': { color: [255, 193, 7, 150], cirtext: 'O', label: 'Other Pending' },
                    '7,C': { color: [25, 135, 84, 150], cirtext: 'O', label: 'Other Completed' },
                };
                
                const symbolInfo = uniqueValueMap[`${tid},${stat}`] || { color: [0, 0, 0, 150], label: 'N/A' };
                const { label, color } = symbolInfo;
                
                readout.push(
                    <div key="type">
                        <strong>Type:</strong>
                        <span style={{ color: `rgb(${color[0]},${color[1]},${color[2]})` }}>
                            {' '}
                            {label}
                        </span>
                        <br />
                    </div>
                );
            }

            if (rmade) {
                readout.push(
                    <div key="request">
                        <strong>Request Made:</strong> {rmade}
                        <br />
                    </div>
                );
            }
            
            if (deliverdtg) {
                readout.push(
                    <div key="deliver">
                        <strong>Deliver Time:</strong> {deliverdtg}
                        <br />
                    </div>
                );
            }
            
            if (wfo) {
                readout.push(
                    <div key="office">
                        <strong>Forecast Office:</strong> {wfo}
                        <br />
                    </div>
                );
            }

            if (snumunum) {
                const spoturl = `https://spot.weather.gov/forecasts/${snumunum}`;
                readout.push(
                    <div key="spot-link" className="spot-forecast-link">
                        <strong>Link:</strong>{' '}
                        <a 
                            href={spoturl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                        >
                            🔗 Spot Forecast
                        </a>
                        <br />
                    </div>
                );
            }

            if (readout.length > 0) {
                console.log('Setting persistent tooltip'); // Debug log
                setPersistentTooltip({
                    readout,
                    x: Math.min(x, window.innerWidth - 320),
                    y: Math.max(y - 10, 10)
                });
            }
        }
        return true; // Prevent default deck.gl click handling
    }, []);

    // Close persistent tooltip
    const closePersistentTooltip = useCallback(() => {
        console.log('Closing persistent tooltip'); // Debug log
        setPersistentTooltip(null);
    }, []);

    // Close tooltip when clicking on map (but not immediately after spot click)
    const handleMapClick = useCallback((event) => {
        // Don't close if a spot was just clicked
        if (spotClickedRef.current) {
            console.log('Map click ignored - spot was just clicked'); // Debug log
            return;
        }
        
        if (persistentTooltip) {
            console.log('Map clicked, closing tooltip'); // Debug log
            setPersistentTooltip(null);
        }
    }, [persistentTooltip]);

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
            parameters: { depthTest:false, depthCompare: 'always', cullMode: 'front' },
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
            onClick: handleSpotClick, // Add click handler
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
            legend: {
                type: 'staticItems', // 'staticBar', 'staticItems', 'dynamicItems'
                title: 'CPC 6-10 Temperature Outlook',
                colors: {
                    temp: [
                        'rgb(28, 19, 66)',
                        'rgb(34, 24, 82)',
                        'rgb(47, 64, 111)',
                        'rgb(0, 92, 161)',
                        'rgb(56, 159, 219)',
                        'rgb(119, 181, 226)',
                        'rgb(160, 192, 223)',
                        'rgb(0, 0, 0, 0)',
                        'rgb(231, 177, 104)',
                        'rgb(227, 139, 74)',
                        'rgb(220, 86, 47)',
                        'rgb(199, 46, 40)',
                        'rgb(204, 48, 71)',
                        'rgb(138, 47, 56)',
                        'rgb(98, 34, 40)',
                    ],
                    prcp: [
                        'rgb(79, 47, 47)',
                        'rgb(128, 64, 0)',
                        'rgb(147, 70, 57)',
                        'rgb(155, 80, 49)',
                        'rgb(187, 109, 51)',
                        'rgb(216, 167, 80)',
                        'rgb(240, 212, 147)',
                        'rgb(0, 0, 0, 0)',
                        'rgb(179, 217, 171)',
                        'rgb(148, 205, 126)',
                        'rgb(72, 174, 56)',
                        'rgb(58, 123, 95)',
                        'rgb(0, 142, 64)',
                        'rgb(40, 85, 61)',
                        'rgb(40, 85, 23)',
                    ],
                },
                labels: {
                    labels: [
                        '90-100%',
                        '80-90%',
                        '70-80%',
                        '60-70%',
                        '50-60%',
                        '40-50%',
                        '33-40%',
                        'Near Normal',
                        '33-40%',
                        '40-50%',
                        '50-60%',
                        '60-70%',
                        '70-80%',
                        '80-90%',
                        '90-100%',
                    ],
                },
                layerType: 'temp', // 'temp', 'prcp'
                range: '6-10', // '6-10', '8-14'
            },
        });
        layers.push(cpcLayer);
    }
    if (state.spcLayerCheckbox) {
        const spcLayer = new SPCLayer({
            id: 'spcLayer',
            data: URLdata['SPC-day1Outlook'],
            pickable: true,
            legend: {
                type: 'staticItems', // 'staticBar', 'staticItems', 'dynamicItems'
                title: 'SPC Day 1 Convective Outlook', // match day to data received
                colors: [
                    'rgb(192, 232, 192)',
                    'rgb(127, 197, 127)',
                    'rgb(246, 246, 127)',
                    'rgb(230, 194, 127)',
                    'rgb(230, 127, 127)',
                    'rgb(255, 127, 255)',
                ],
                labels: [
                    'General Thunderstorms',
                    'Marginal',
                    'Slight',
                    'Enhanced',
                    'Moderate',
                    'High',
                ],
                dataType: 'day1outlook', // day1outlook, day2outlook, day3outlook, day4outlook, day5outlook
            },
        });
        layers.push(spcLayer);
    }

    if (state.wpcLayerCheckbox) {
        const wpcLayer = new WPCLayer({
            id: 'wpcLayer',
            data: URLdata['WPC-day3Outlook'],
            legend: {
                type: 'staticItems', // 'staticBar', 'staticItems', 'dynamicItems'
                title: 'WPC Day 1 Excessive Rainfall Outlook', // match day to data received
                colors: [
                    'rgb(0, 205, 0)',
                    'rgb(238, 238, 0)',
                    'rgb(255, 0, 0)',
                    'rgb(255, 0, 255)',
                ],
                labels: [
                    'Marginal (At Least 5%)',
                    'Slight (At Least 15%)',
                    'Moderate (At Least 40%)',
                    'High (At Least 70%)',
                ],
                dataType: 'day1outlook', // day1outlook, day2outlook, day3outlook, day4outlook, day5outlook
            },
            pickable: true,
        });
        layers.push(wpcLayer);
    }
    if (state.wwaLayerCheckbox) {
        const wwaLayer = new WWALayer({
            id: 'wwaLayer',
            data: URLdata.WWA,
            pickable: true,
            legend: {
                type: 'dynamicItems', // 'staticBar', 'staticItems', 'dynamicItems'
                title: 'NWS Hazards & Warnings',
            },
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
                    onClick={handleMapClick}
                    antialias
                    reuseMaps
                    mapStyle={mapStyle}
                    projection={'globe'}
                >
                    <DeckGLOverlay overlayRef={overlayRef} layers={layers} interleaved />
                    <Readout
                        mapContainer={mapContainer}
                        overlayRef={overlayRef}
                        layers={layers.filter(layer => layer.id !== 'spotLayer')} // Exclude spot layer from normal readout
                        title="Wed 06:00 am PST, Oct 21"
                    />
                    <Legend mapRef={mapRef} overlayRef={overlayRef} viewState={viewState} />
                </Map>
                
                {/* Render persistent tooltip */}
                <PersistentTooltip 
                    tooltip={persistentTooltip} 
                    onClose={closePersistentTooltip} 
                />
            </div>
        </>
    );
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <MapContainer />,
    </StrictMode>,
);