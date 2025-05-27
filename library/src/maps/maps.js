import darkGrayStyle from './custom-maps/darkGray.json';
import lightGrayStyle from './custom-maps/lightGray.json';
// Basemap layers
// List of basemaps can be found here: https://developers.arcgis.com/documentation/mapping-apis-and-services/maps/services/basemap-layer-service/

export const mapStyles = {
    Classic: {
        isJson: false,
        url: 'arcgis/navigation',
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
        url: 'arcgis/dark-gray',
        beforeId: 'Railroad/2',
        beforeIdLines: 'Water point/Sea or ocean',
    },
    'Dark (streets)': {
        isJson: false,
        url: 'arcgis/streets-night',
        beforeId: 'Ferry/Ferry',
        beforeIdLines: 'Ferry/label/Ferry',
    },
    Light: {
        isJson: false,
        url: 'arcgis/light-gray',
        beforeId: 'Railroad/2',
        beforeIdLines: 'Water point/Sea or ocean',
    },
    Platinum: {
        isJson: true,
        url: lightGrayStyle,
        beforeId: 'Water area/Dam or weir',
        beforeIdLines: 'Water area/Dam or weir',
    },
    Satellite: {
        isJson: false,
        url: 'arcgis/imagery',
        beforeId: 'Railroad/casing',
        beforeIdLines: 'Water point/Stream or river',
    },
    Topography: {
        isJson: false,
        url: 'arcgis/topographic',
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

export class Maps {
    constructor(styles, mapToken) {
        this.mapStyles = styles;
        this.mapToken = mapToken;
    }

    static loadMapStyle(style, mapToken) {
        if (mapStyles[style].isJson) {
            // it's actually a regular js object since it is being imported
            const jsonStyle = mapStyles[style].url;

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
        return `https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/${
            mapStyles[style].url
        }?type=style&token=${mapToken}&worldview=unitedStatesOfAmerica`;
    }

    static getBeforeID(plottype) {
        if (getMaptype(chartOptions) == 'Mapbox') {
            const beforeID =
                MapBoxLayers[chartOptions.x4dMaps.mapboxBasemap.value][
                    plotorder[plottype].beforeId
                ];
            const mapLayers = mapRef?.current?.getStyle()?.layers ?? [];
            for (let layer of mapLayers) {
                if (layer.id == beforeID) {
                    return beforeID;
                }
            }
            console.log(
                `\n\nWarning: Could not find beforeID ${beforeID} in mapbox layers.  Please set correct beforeID.\n\n`,
            );
            return undefined;
        } else {
            return undefined;
        }
    }
}
