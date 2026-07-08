/* eslint-disable max-len */
import { CompositeLayer } from '@deck.gl/core';
import { TextLayer } from '@deck.gl/layers';
import gUtilities from '../../utilities/graphicsUtilities';
import deckUtilities from '../../utilities/deckUtilities';
import { computeProgressiveDisclosure, dys } from './computeProgressiveDisclosure';

const defaultProps = {
    elevation: 0,
    cityBaseScale: 14,
    cityPadding: 1,
    fontFamily: 'Open Sans, sans-serif',
    billboard: true,
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    getPixelOffset: [0, 0],
    characterSet: 'auto',
    fontSettings: {
        sdf: false,
        radius: 12,
        cutoff: 0.25,
        buffer: 10,
        smoothing: 0.2,
    },
    outlineWidth: 0,
    outlineColor: [0, 0, 0, 255],
    fontWeight: '700',
    cityHaloEnabled: true,
    cityHaloColor: [0, 0, 0, 255],
    cityHaloPixelRadius: null,
    cityHaloSizeRatio: 0.03,
    cityHaloMinPixelRadius: 0.25,
    cityHaloMaxPixelRadius: Infinity,
    dataLabelHaloEnabled: true,
    dataLabelHaloColor: [0, 0, 0, 255],
    dataLabelHaloPixelRadius: null,
    dataLabelHaloSizeRatio: 0.03,
    dataLabelHaloMinPixelRadius: 0.25,
    dataLabelHaloMaxPixelRadius: Infinity,
    getColor: (x) => x.color || [255, 255, 255, 255],
    getLabel: (x) => x.label,
    getWeight: (x) => x.weight || 1,
    getPosition: (x) => x.position,
    parameters: { depthCompare: 'always', cullMode: 'none' },
};

const findPopulationScale = (d) => {
    const { population } = d;
    let populationScale = 0.85;
    if (population > 1000000) populationScale = 1.1;
    else if (population > 100000) populationScale = 1.0;
    else if (population > 50000) populationScale = 0.9;
    else if (population > 0) populationScale = 0.85;
    return populationScale;
};

const throttle = 500;
let tree;
let cityLengthLast;

const haloDirections = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
];

const resolvePixelOffset = (baseOffset, d, info) => {
    if (typeof baseOffset === 'function') {
        const value = baseOffset(d, info);
        return Array.isArray(value) ? value : [0, 0];
    }
    return Array.isArray(baseOffset) ? baseOffset : [0, 0];
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default class CitiesLayer extends CompositeLayer {
    initializeState() {
        this.state = {
            // Cached tags per zoom level
            tagsCache: {},
            tags: [],
            lastTimeout: undefined,
            lastTrigger: performance.now(),
        };
    }

    // eslint-disable-next-line class-methods-use-this
    shouldUpdateState({ changeFlags }) {
        return changeFlags.somethingChanged;
    }

    updateState({ props, oldProps, changeFlags }) {
        if (!changeFlags.viewportChanged && !changeFlags.propsOrDataChanged) return;

        super.updateState({ props, oldProps, changeFlags });

        let wait = 0;
        if (changeFlags.viewportChanged) {
            wait = performance.now() - this.state.lastTrigger;
            wait = wait < throttle ? throttle - wait : 0;
        }

        clearTimeout(this.state?.lastTimeout);
        this.state.lastTimeout = setTimeout(() => {
            const lastTrigger = performance.now();

            // Get RBUSH tree
            const { cityList, dataLabels } = props;
            const cityLength = cityList?.length;
            if (!tree || cityLength !== cityLengthLast) {
                tree = computeProgressiveDisclosure(props.cityList);
            }
            cityLengthLast = cityLength;

            const { viewport } = this.context;
            // added cityBaseScale to make padding dynamic based on city fontsize when running graphicUtilities.js
            const citiesInDomain = deckUtilities.getCities(
                viewport,
                tree,
                dys,
                props.cityBaseScale,
                props.cityPadding,
            );

            const cityData = [];
            for (const i in citiesInDomain) {
                const lat = Number(citiesInDomain[i].lat);
                const lon = Number(citiesInDomain[i].lon);
                const { name } = citiesInDomain[i];
                const { population } = citiesInDomain[i];
                let value;
                if (dataLabels) {
                    const {
                        data,
                        readoutFunction,
                        readoutOptions,
                    } = dataLabels;

                    if (typeof readoutFunction === 'function') {
                        value = readoutFunction(lat, lon, data, {
                            ...readoutOptions,
                        });
                    }

                }

                cityData.push({
                    value: String(value),
                    lat,
                    lon,
                    name,
                    population,
                });
            }

            // zoom scale
            // zoom: 1, scale 0.85
            // zoom: 3, scale 1.0
            const x1 = 1;
            const y1 = 0.85;
            const x2 = 3;
            const y2 = 1.0;
            let zoomScale;
            if (viewport.zoom > x2) zoomScale = y2;
            else if (viewport.zoom <= x1) zoomScale = y1;
            else {
                // y = mx+b
                const m = (y2 - y1) / (x2 - x1);
                const b = y1 - m * x1;
                zoomScale = m * viewport.zoom + b;
            }
            this.setState({
                cityData,
                zoomScale,
                lastTrigger,
            });
        }, wait);
    }

    renderLayers() {
        const { cityData, zoomScale } = this.state;
        const {
            elevation,
            cityHaloEnabled,
            cityHaloColor,
            cityHaloPixelRadius,
            cityHaloSizeRatio,
            cityHaloMinPixelRadius,
            cityHaloMaxPixelRadius,
            dataLabelHaloEnabled,
            dataLabelHaloColor,
            dataLabelHaloPixelRadius,
            dataLabelHaloSizeRatio,
            dataLabelHaloMinPixelRadius,
            dataLabelHaloMaxPixelRadius,
        } = this.props;
        const baseScale = this.props.cityBaseScale;
        const readoutScale = 1.5;

        // access the camera position
        const { viewport } = this.context;
        const { zoom } = viewport;
        const cameraLat = viewport.latitude;
        const cameraLon = viewport.longitude;
        // Keep displacement calculations tied to the current render frame during zoom.
        const bearing = viewport.bearing || 0;
        const { latPerPixel } = deckUtilities.getLatLonPerPixel(viewport);

        const visibleCityData =
            cityData?.filter((d) =>
                deckUtilities.isFeatureVisibleOnGlobe(cameraLat, cameraLon, d.lat, d.lon, zoom),
            ) || [];

        const cityFontSettings = cityHaloEnabled
            ? {
                  ...this.props.fontSettings,
                  sdf: false,
              }
            : this.props.fontSettings;

        const dataLabelFontSettings = dataLabelHaloEnabled
            ? {
                  ...this.props.fontSettings,
                  sdf: false,
              }
            : this.props.fontSettings;

        const getCityPosition = (d) => [Number(d.lon), Number(d.lat), elevation];
        const getCitySize = (d) => {
            const populationScale = findPopulationScale(d);
            return baseScale * populationScale * zoomScale;
        };

        const getDataLabelPosition = (d) => {
            // padding between readout and city name is based on scale and a small padding multiplier
            const padding = 1.1;
            const rad = (bearing * Math.PI) / 180;
            const populationScale = findPopulationScale(d);
            const displace = latPerPixel * baseScale * populationScale * padding;
            return [
                Number(d.lon) + Math.sin(rad) * displace,
                Number(d.lat) + Math.cos(rad) * displace,
                elevation,
            ];
        };
        const getDataLabelSize = (d) => {
            const populationScale = findPopulationScale(d);
            return baseScale * populationScale * zoomScale * readoutScale;
        };

        const getCityHaloRadius = (d) => {
            if (Number.isFinite(cityHaloPixelRadius)) return cityHaloPixelRadius;
            const size = getCitySize(d);
            const ratio = Number.isFinite(cityHaloSizeRatio) ? cityHaloSizeRatio : 0.14;
            const minRadius = Number.isFinite(cityHaloMinPixelRadius)
                ? cityHaloMinPixelRadius
                : 0.5;
            const maxRadius = Number.isFinite(cityHaloMaxPixelRadius)
                ? cityHaloMaxPixelRadius
                : Infinity;
            return clamp(size * ratio, minRadius, maxRadius);
        };

        const getDataHaloRadius = (d) => {
            if (Number.isFinite(dataLabelHaloPixelRadius)) return dataLabelHaloPixelRadius;
            const size = getDataLabelSize(d);
            const ratio = Number.isFinite(dataLabelHaloSizeRatio) ? dataLabelHaloSizeRatio : 0.14;
            const minRadius = Number.isFinite(dataLabelHaloMinPixelRadius)
                ? dataLabelHaloMinPixelRadius
                : 0.5;
            const maxRadius = Number.isFinite(dataLabelHaloMaxPixelRadius)
                ? dataLabelHaloMaxPixelRadius
                : Infinity;
            return clamp(size * ratio, minRadius, maxRadius);
        };

        const getPixelOffsetProp = this.props.getPixelOffset;

        const makeOffsetAccessor = (dx, dy, getRadius) => (d, info) => {
            const [x, y] = resolvePixelOffset(getPixelOffsetProp, d, info);
            const radius = getRadius(d);
            return [x + dx * radius, y + dy * radius];
        };

        const layers = [];

        if (cityHaloEnabled) {
            haloDirections.forEach(([dx, dy], index) => {
                layers.push(
                    new TextLayer(this.props, {
                        id: `${this.props.id}-tagmap-halo-layer-${index}`,
                        data: visibleCityData,
                        getText: (d) => d.name,
                        getPosition: getCityPosition,
                        getSize: getCitySize,
                        getColor: cityHaloColor,
                        getPixelOffset: makeOffsetAccessor(dx, dy, getCityHaloRadius),
                        outlineWidth: 0,
                        fontSettings: cityFontSettings,
                        pickable: false,
                        autoHighlight: false,
                    }),
                );
            });
        }

        layers.push(
            new TextLayer(this.props, {
                id: `${this.props.id}-tagmap-layer`,
                data: visibleCityData,
                getText: (d) => d.name,
                getPosition: getCityPosition,
                getSize: getCitySize,
                outlineWidth: cityHaloEnabled ? 0 : this.props.outlineWidth,
                fontSettings: cityFontSettings,
            }),
        );

        if (this.props.dataLabels) {
            if (dataLabelHaloEnabled) {
                haloDirections.forEach(([dx, dy], index) => {
                    layers.push(
                        new TextLayer(this.props, {
                            id: `${this.props.id}-tagmap-dataLabels-halo-${index}`,
                            data: visibleCityData,
                            getText: (d) => d.value,
                            getPosition: getDataLabelPosition,
                            getSize: getDataLabelSize,
                            getColor: dataLabelHaloColor,
                            getPixelOffset: makeOffsetAccessor(dx, dy, getDataHaloRadius),
                            outlineWidth: 0,
                            fontSettings: dataLabelFontSettings,
                            pickable: false,
                            autoHighlight: false,
                        }),
                    );
                });
            }

            layers.push(
                new TextLayer(this.props, {
                    id: `${this.props.id}-tagmap-dataLabels`,
                    data: visibleCityData,
                    fontWeight: '700',
                    getText: (d) => d.value,
                    getPosition: getDataLabelPosition,
                    getSize: getDataLabelSize,
                    outlineWidth: dataLabelHaloEnabled ? 0 : 3,
                    fontSettings: dataLabelFontSettings,
                }),
            );
        }

        return layers;
    }
}

CitiesLayer.layerName = 'CitiesLayer';
CitiesLayer.defaultProps = defaultProps;

export { CitiesLayer };
