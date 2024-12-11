import { debounce, over, some } from 'lodash';
import { useEffect, useRef, useState } from 'react';

// Legend types
// 'staticBar', 'staticItems', 'dynamicItems'

export default function LegendDynamicItems({ mapRef, viewState, overlayRef, options }) {
    const [dynamicLegendItems, setDynamicLegendItems] = useState([]);

    // Debounce for dynamicItems
    const debouncedEffect = useRef(
        debounce(() => {
            console.log('made it2');

            if (mapRef?.current) {
                const t0 = performance.now();
                const map = mapRef.current.getMap();
                console.log('Complete code here');
                // const visibleFeatures = map.queryRenderedFeatures();
                // Korri's console.log('visible features maplibre: ', visibleFeatures);
            }
            if (overlayRef?.current) {
                console.log('made it3');

                const t0 = performance.now();
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
        console.log('made it');
        debouncedEffect();
        // Cleanup function to cancel the debounce on unmount
        return () => {
            debouncedEffect.cancel();
        };
    }, [mapRef, viewState, overlayRef, debouncedEffect]);

    return (
        <div
            style={{
                position: 'absolute',
                right: 0,
                backgroundColor: 'white',
                padding: '10px',
                borderRadius: '5px',
            }}
        >
            <h3>{options.title}</h3>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {dynamicLegendItems.map((item) => (
                    <li
                        key={item.text + item.color}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '5px',
                        }}
                    >
                        <span
                            style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: item.color,
                                display: 'inline-block',
                                marginRight: '10px',
                            }}
                        />
                        {item.text}
                    </li>
                ))}
            </ul>
        </div>
    );
}
