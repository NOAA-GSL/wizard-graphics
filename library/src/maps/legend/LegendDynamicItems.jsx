import { debounce, some } from 'lodash';
import { useEffect, useRef, useState } from 'react';

// Legend types
// 'staticBar', 'staticItems', 'dynamicItems'

export default function LegendDynamicItems({ mapRef, viewState, overlayRef, options }) {
    const [dynamicLegendItems, setDynamicLegendItems] = useState([]);

    // TODO: need to add some logic to allow flexible positioning of the legend
    // const legendPosition = options.position || 'left';

    // Debounce for dynamicItems
    const debouncedEffect = useRef(
        debounce(() => {
            if (overlayRef?.current) {
                // eslint-disable-next-line no-underscore-dangle
                const { width, height } = overlayRef.current._deck;
                if (!width || !height) return;
                // Pick all pickable objects (20-50 ms, ouch!)
                const objects = overlayRef.current.pickObjects({ x: 0, y: 0, width, height });

                // Load legend items into array
                const arr = [];
                for (const i in objects) {
                    const object = objects[i];
                    const pickingFunction = object.sourceLayer.props?.pickingFunction;
                    if (pickingFunction) {
                        const { dynamicLegend } = pickingFunction(object);
                        // Don't allow duplicates
                        if (dynamicLegend && !some(arr, dynamicLegend)) {
                            arr.push(dynamicLegend);
                        }
                    }
                }
                setDynamicLegendItems(arr);
            }
        }, 300), // Adjust the debounce delay as needed
    ).current;

    useEffect(() => {
        debouncedEffect();
        // Cleanup function to cancel the debounce on unmount
        return () => {
            debouncedEffect.cancel();
        };
    }, [mapRef, viewState, overlayRef, debouncedEffect]);

    return (
        <>
            <div className="dynamic-legend-title">{options.title}</div>
            {dynamicLegendItems.map((item, index) => (
                <div key={index} className="dynamic-legend-items">
                    <div
                        className="dynamic-legend-items-color"
                        style={{ backgroundColor: item.color }}
                    />
                    <div>{item.text}</div>
                </div>
            ))}
        </>
    );
}
