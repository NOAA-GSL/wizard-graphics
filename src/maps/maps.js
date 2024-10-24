import darkGrayStyle from './custom-maps/darkGray.json';
import lightGrayStyle from './custom-maps/lightGray.json';
// Basemap layers
// List of basemaps can be found here: https://developers.arcgis.com/documentation/mapping-apis-and-services/maps/services/basemap-layer-service/

const mapLayers = {
    Classic: {
        isJson: false,
        url: 'ArcGIS:Navigation',
        beforeId: 'Ferry/Ferry',
        beforeIdLines: 'Water point/Sea or ocean',
    },
    Charcoal: {
        isJson: true,
        url: darkGrayStyle,
        beforeId: 'Water area/Dam or weir',
        beforeIdLines: 'Water area/Dam or weir',
    },
    Dark: {
        isJson: false,
        url: 'ArcGIS:DarkGray',
        beforeId: 'Railroad/2',
        beforeIdLines: 'Water point/Sea or ocean',
    },
    'Dark (streets)': {
        isJson: false,
        url: 'ArcGIS:StreetsNight',
        beforeId: 'Ferry/Ferry',
        beforeIdLines: 'Ferry/label/Ferry',
    },
    Light: {
        isJson: false,
        url: 'ArcGIS:LightGray',
        beforeId: 'Railroad/2',
        beforeIdLines: 'Water point/Sea or ocean',
    },
    /*
    Midcentury: {
        isJson: false,
        url: 'ArcGIS:Imagery',
        beforeId: 'Railroad/casing',
        beforeIdLines: 'Water point/Stream or river',
    },
    Newspaper: {
        isJson: false,
        url: 'ArcGIS:Imagery',
        beforeId: 'Railroad/casing',
        beforeIdLines: 'Water point/Stream or river',
    },
    Nova: {
        isJson: false,
        url: 'ArcGIS:Imagery',
        beforeId: 'Railroad/casing',
        beforeIdLines: 'Water point/Stream or river',
    },
    */
    Platinum: {
        isJson: true,
        url: lightGrayStyle,
        beforeId: 'Water area/Dam or weir',
        beforeIdLines: 'Water area/Dam or weir',
    },
    Satellite: {
        isJson: false,
        url: 'ArcGIS:Imagery',
        beforeId: 'Railroad/casing',
        beforeIdLines: 'Water point/Stream or river',
    },
    Topography: {
        isJson: false,
        url: 'ArcGIS:Topographic',
        beforeId: 'Ferry/Ferry',
        beforeIdLines: 'Tree/Elm',
    },
};

function updateToken(item, mapToken) {
    if (typeof item === 'string' && item.includes('token=')) {
        if (!item.includes(mapToken)) {
            return item + mapToken;
        }
    } else if (Array.isArray(item)) {
        return item.map((subItem) => updateToken(subItem, mapToken));
    } else if (typeof item === 'object' && item !== null) {
        for (const key in item) {
            // eslint-disable-next-line no-param-reassign
            item[key] = updateToken(item[key], mapToken);
        }
    }
    return item;
}

export default class Maps {
    constructor() {
        this.style = 'Topography';
        this.loaded = false;
        this.beforeId = mapLayers[this.style].beforeId;
        this.beforeIdLines = mapLayers[this.style].beforeIdLines;
    }

    static getMaps() {
        return Object.keys(mapLayers);
    }

    static getStyle(style, mapToken) {
        if (mapLayers[style].isJson) {
            // it's actually a regular js object since it is being imported
            const jsonStyle = mapLayers[style].url;

            // find instances of `token=` in jsonStyle and append the correct API token
            // Recursive function to update token in strings
            if (jsonStyle.glyphs) {
                jsonStyle.glyphs = updateToken(jsonStyle.glyphs, mapToken);
            }

            if (jsonStyle.sources) {
                jsonStyle.sources = updateToken(jsonStyle.sources, mapToken);
            }

            return jsonStyle;
        }
        return `https://basemaps-api.arcgis.com/arcgis/rest/services/styles/${
            mapLayers[style].url
        }?type=style&token=${mapToken}`;
    }
}
