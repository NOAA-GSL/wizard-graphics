import { some } from 'lodash';
import LegendDynamicItems from './LegendDynamicItems';
import LegendStaticItems from './LegendStaticItems';
import LegendStaticBar from './LegendStaticBar';
import './Legend.css';

/**
 * This will render legend items based on the layer.props.legend properties. The properties are
 * `type`, `title`, `units`, `position`, `colors`, `labels`, `layerType`, and `range`.
 * @param {import('react').Ref} mapRef - Reference to the MapLibre GL JS map instance
 * @param {object} viewState - view state of the map
 * @param {import('react').Ref} overlayRef - Reference to the Deck.gl overlay layer
 * @returns The requested legend components ('staticBar', 'staticItems', 'dynamicItems')
 */
export default function Legend({ mapRef, viewState, overlayRef }) {
    // eslint-disable-next-line no-underscore-dangle
    const layers = overlayRef?.current?._props?.layers;

    const dynamicItems = [];
    const staticItems = [];
    const staticBars = [];
    if (layers) {
        for (const layer of layers) {
            const legend = layer.props?.legend;
            if (legend) {
                if (legend.type === 'dynamicItems') {
                    if (legend && !some(dynamicItems, legend)) dynamicItems.push(legend);
                }
                if (legend.type === 'staticBar') {
                    const { colors, colorLevels, colorType } = layer.props;
                    const obj = { colors, colorLevels, colorType, ...legend };
                    if (obj && !some(staticBars, obj)) staticBars.push(obj);
                }
                if (legend.type === 'staticItems') {
                    staticItems.push(legend);
                }
            }
        }
    }
    console.log('TEST THIS BRO');

    return (
        <>
            <div id="legendContainer">
                {/* Add static bar legends */}
                {staticBars.map((item, index) => (
                    <LegendStaticBar key={index} options={item} />
                ))}
            </div>
            {/* Only render dynamic or static legends if they contain items */}
            {dynamicItems.length > 0 ? (
                <div id="dynamicLegendItems">
                    {/* Add dynamic item legends */}
                    {dynamicItems.map((item, index) => (
                        <LegendDynamicItems
                            key={index}
                            mapRef={mapRef}
                            viewState={viewState}
                            overlayRef={overlayRef}
                            options={item}
                        />
                    ))}
                </div>
            ) : null}
            {staticItems.length > 0 ? (
                <div id="staticLegendItems">
                    {/* Add static item legends */}
                    {staticItems.map((item, index) => (
                        <LegendStaticItems
                            key={index}
                            mapRef={mapRef}
                            viewState={viewState}
                            overlayRef={overlayRef}
                            options={item}
                        />
                    ))}
                </div>
            ) : null}
        </>
    );
}
