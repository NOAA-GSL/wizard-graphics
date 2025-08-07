import { CompositeLayer, GeoJsonLayer } from 'deck.gl';

// Define a function to set color and label based on `tid` and `stat` based on NWS GIS arcgis online
function getSymbolInfo(tid, stat) {
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

    return uniqueValueMap[`${tid},${stat}`] || { color: [0, 0, 0, 150], label: 'N/A' };
}

const defaultProps = {
    data: 'https://mapservices.weather.noaa.gov/vector/rest/services/fire_weather/nws_fire_weather_spot/MapServer/0/query?outFields=*&where=1%3D1&orderByFields=rfill%20ASC&geometryPrecision=3&f=geojson',
    pointType: 'circle+text',
    getText: (d) => {
        const { cirtext } = getSymbolInfo(d.properties.tid, d.properties.stat);
        return cirtext;
    },
    getSize: 60,
    getPointRadius: 20,
    pointRadiusUnits: 'pixels',
    radiusScale: 6,
    getColor: [0, 0, 0, 255],
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    getTextColor: [0, 0, 0, 255],
    getFillColor: (d) => {
        const { color } = getSymbolInfo(d.properties.tid, d.properties.stat);
        return color;
    },
    textFontFamily: 'Open Sans, sans-serif',
    textFontWeight: '700',
    getTextSize: 20,
    textSizeUnits: 'pixels',
    getTextBorderColor: [0, 0, 0, 255],
    getTextBorderWidth: 4,
    getElevation: 0,
    elevationScale: 1,
    parameters: { depthTest:true, depthCompare: 'always', cullMode: 'none' },
    // Add click handler prop
    onSpotClick: null,
    pickingFunction: (d) => {
        if (d.object) {
            const { tid, stat, name, type, rmade, rfill, deliverdtg, wfo, snumunum } =
                d.object.properties;

            // Initialize an array to store available rows
            const readout = [];

            // Conditionally add each variable to the tooltip
            if (name)
                readout.push(
                    <div key="name">
                        <strong>Name:</strong> {name}
                        <br />
                    </div>,
                );

            if (tid && stat) {
                const { label, color } = getSymbolInfo(tid, stat);
                readout.push(
                    <div key="type">
                        <strong>Type:</strong>
                        <span style={{ color: `rgb(${color[0]},${color[1]},${color[2]})` }}>
                            {' '}
                            {label}
                        </span>
                        <br />
                    </div>,
                );
            }

            if (rmade)
                readout.push(
                    <div key="request">
                        <strong>Request Made:</strong> {rmade}
                        <br />
                    </div>,
                );
            if (deliverdtg)
                readout.push(
                    <div key="deliver">
                        <strong>Deliver Time:</strong> {deliverdtg}
                        <br />
                    </div>,
                );
            if (wfo)
                readout.push(
                    <div key="office">
                        <strong>Forecast Office:</strong> {wfo}
                        <br />
                    </div>,
                );

            // Add the spot forecast link
            if (snumunum) {
                const spoturl = `https://spot.weather.gov/forecasts/${snumunum}`;
                readout.push(
                    <div key="spot-link" className="spot-forecast-link">
                        <strong>Link:</strong>{' '}
                        <a 
                            href={spoturl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Link will open normally
                            }}
                        >
                            Spot Forecast
                        </a>
                        <br />
                    </div>,
                );
            }

            // Return readout with additional metadata for persistent tooltips
            return { 
                readout, 
                coordinates: [d.coordinate[0], d.coordinate[1]],
                object: d.object,
                isPersistent: d.type === 'click' // Will be true for clicks
            };
        }
        return { readout: null };
    },
};

class SpotLayer extends CompositeLayer {
    renderLayers() {
        return new GeoJsonLayer(this.props, {
            id: `${this.props.id}-geojson`,
            onClick: this.props.onClick, // Pass through click handler
        });
    }
}

SpotLayer.defaultProps = defaultProps;
SpotLayer.layerName = 'SpotLayer';
export default SpotLayer;