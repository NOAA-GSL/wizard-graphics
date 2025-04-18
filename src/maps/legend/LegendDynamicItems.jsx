import { debounce, some } from 'lodash';
import { useEffect, useRef, useState } from 'react';

// Legend types
// 'staticBar', 'staticItems', 'dynamicItems'

export default function LegendDynamicItems({ mapRef, viewState, overlayRef, options }) {
    const [dynamicLegendItems, setDynamicLegendItems] = useState([]);

    // Debounce for dynamicItems
    const debouncedEffect = useRef(
        debounce(() => {
            console.log('made it2');

            if (overlayRef?.current) {
                console.log('made it3');

                const t0 = performance.now();
                // eslint-disable-next-line no-underscore-dangle
                const { width, height, layers } = overlayRef.current._deck;
                console.log('layers:', layers);
                if (!width || !height) return;
                // Pick all pickable objects (20-50 ms, ouch!)
                const objects = overlayRef.current.pickObjects({ x: 0, y: 0, width, height });
                console.log('objects:', objects);

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
        console.log('made it');
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
                    <div className="dynamic-legend-items-text">{item.text}</div>
                </div>
            ))}
        </>
    );
}
