/* eslint-disable max-len */
import { CompositeLayer } from '@deck.gl/core';
import { TextLayer } from '@deck.gl/layers';
import gUtilities from '../../utilities/graphicsUtilities';
import deckUtilities from '../../utilities/deckUtilities';
import { computeProgressiveDisclosure, dys } from './computeProgressiveDisclosure';

const defaultProps = {
    elevation: 0,
    cityBaseScale: 14,
    fontFamily: 'Open Sans, sans-serif',
    billboard: true,
    backgroundPadding: [4, 1],
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'bottom', // was 'center' but descenders were cut off
    getPixelOffset: [0, 10], // prevent descenders from being cut off
    characterSet: 'auto',
    fontSettings: {
        sdf: true,
        radius: 12,
        cutoff: 0.25,
        buffer: 10,
        smoothing: 0.2, // only applies if sdf is true
    },
    outlineWidth: 4, // was 3.59
    outlineColor: [0, 0, 0, 255],
    fontWeight: '700', // was 500
    getColor: (x) => x.color || [255, 255, 255, 255],
    getLabel: (x) => x.label,
    getWeight: (x) => x.weight || 1,
    getPosition: (x) => x.position,
    parameters: { depthTest: false, depthCompare: 'always', cullMode: 'front' },
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
            // Globeview bearing is undefined, so grab it this way
            const bearing = viewport.bearing || 0;

            const { latPerPixel } = deckUtilities.getLatLonPerPixel(viewport);
            // added cityBaseScale to make padding dynamic based on city fontsize when running graphicUtilities.js
            const citiesInDomain = deckUtilities.getCities(
                viewport,
                tree,
                dys,
                props.cityBaseScale,
            );

            const cityData = [];
            for (const i in citiesInDomain) {
                const lat = Number(citiesInDomain[i].lat);
                const lon = Number(citiesInDomain[i].lon);
                const { name } = citiesInDomain[i];
                const { population } = citiesInDomain[i];
                let value;
                let fvalue;
                if (dataLabels) {
                    const { data, projection, decimals, units, interpolate } = dataLabels;
                    value = gUtilities.getreadoutvalue(
                        lat,
                        lon,
                        projection,
                        data,
                        units,
                        interpolate,
                    );
                    fvalue = gUtilities.roundto(value, decimals) + units;

                    if (props.isTiming && !Number.isNaN(value)) {
                        const initDate = new Date(props.initDate);
                        initDate.setHours(initDate.getHours() + Number(fvalue));
                        fvalue = gUtilities.formatdate(initDate, 'timing', props.settings);
                    }
                }

                cityData.push({
                    value: !Number.isNaN(value) ? fvalue : '',
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
                latPerPixel,
                bearing,
                lastTrigger,
            });
        }, wait);
    }

    renderLayers() {
        const { cityData, zoomScale, latPerPixel, bearing } = this.state;
        const { elevation } = this.props;
        const baseScale = this.props.cityBaseScale;
        const readoutScale = 1.5; // was 1.2

        const layers = [
            new TextLayer(this.props, {
                id: `${this.props.id}-tagmap-layer`,
                data: cityData,
                // outlineWidth: 4,
                getText: (d) => d.name,
                getPosition: (d) => [Number(d.lon), Number(d.lat), elevation],
                getSize: (d) => {
                    const populationScale = findPopulationScale(d);
                    return baseScale * populationScale * zoomScale;
                },
            }),
        ];

        if (this.props.dataLabels) {
            layers.push(
                new TextLayer(this.props, {
                    id: `${this.props.id}-tagmap-dataLabels`,
                    data: cityData,
                    fontWeight: '700',
                    outlineWidth: 3,
                    getText: (d) => d.value,
                    // Always make sure the value is above the city, no matter the bearing
                    getPosition: (d) => {
                        // padding between readout and city name is based on scale and a small padding multiplier
                        const padding = 1; // shrank this because now setting alignment to bottom
                        const rad = (bearing * Math.PI) / 180;
                        const populationScale = findPopulationScale(d);
                        const displace = latPerPixel * baseScale * populationScale * padding;
                        return [
                            Number(d.lon) + Math.sin(rad) * displace,
                            Number(d.lat) + Math.cos(rad) * displace,
                            elevation,
                        ];
                    },
                    getSize: (d) => {
                        const populationScale = findPopulationScale(d);
                        return baseScale * populationScale * zoomScale * readoutScale;
                    },
                }),
            );
        }

        return layers;
    }
}

CitiesLayer.layerName = 'CitiesLayer';
CitiesLayer.defaultProps = defaultProps;

export { CitiesLayer };
