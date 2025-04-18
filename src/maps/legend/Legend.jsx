import { some } from 'lodash';
import LegendDynamicItems from './LegendDynamicItems';
import LegendStaticItems from './LegendStaticItems';
import LegendStaticBar from './LegendStaticBar';
import './Legend.css';
// Legend types
// 'staticBar', 'staticItems', 'dynamicItems'

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

    return (
        <>
            <div id="legendContainer">
                {/* Add static bar legends */}
                {staticBars.map((item, index) => (
                    <LegendStaticBar key={index} options={item} />
                ))}
            </div>
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
        </>
    );
}
