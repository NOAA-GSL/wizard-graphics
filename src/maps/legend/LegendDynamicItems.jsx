import * as d3 from 'd3';
import { debounce, over, some } from 'lodash';
import { useEffect, useRef, useState } from 'react';
import gUtilities from '../../utilities/graphicsUtilities';

// Legend types
// 'staticBar', 'staticItems', 'dynamicItems'

export default function LegendDynamicItems({ mapRef, viewState, overlayRef, options }) {
    const [dynamicLegendItems, setDynamicLegendItems] = useState([]);
    const svgRef = useRef();
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

    useEffect(() => {
        if (!svgRef.current || dynamicLegendItems.length === 0) return;
        const divContainer = d3.select(svgRef.current);

        /// Step 1: Check if the SVG exists in the divContainer, otherwise create one
        let svg = divContainer.select('svg');
        if (svg.empty()) {
            svg = divContainer
                .append('svg')
                .attr('width', 250) // Initial width, will adjust later
                .attr('height', 500); // Initial height, will adjust later
        }

        // Create or select the legend group
        let container = svg.select('#dynamicLegend');
        if (container.empty()) {
            container = svg.append('g').attr('id', 'dynamicLegend');
        } else {
            // Remove existing legend items and title
            container.selectAll('g.dynamicLegend-item').remove();
            container.selectAll('text.title').remove();
        }

        const PADDING = 10; // Increased padding for more space at the top
        const ITEM_SPACING = 10; // Space between legend items vertically
        const BOX_SIZE = 10; // Size of the color rectangle
        const FONT_SIZE = '12px';

        let titleHeight = 0;

        const legendItems = dynamicLegendItems.map(item => ({
            color: item.color,
            text: item.text,
        }));

        // Calculate the maximum width needed for the legend (based on text labels)
        const itemWidths = legendItems.map((item) => {
            const labelTextElement = svg
                .append('text')
                .text(item.text)
                .style('font-size', FONT_SIZE)
                .style('visibility', 'hidden');

            const width = BOX_SIZE + labelTextElement.node().getBBox().width + PADDING;
            labelTextElement.remove(); // Clean up
            return width;
        });
        const maxWidth = d3.max(itemWidths);

        // Add title if provided
        //const validTimes = gUtilities.formatValidTime(options); // Assuming gUtilities is defined
        if (options.title) {
            const titleText = `${options.title}`;
            const title = container
                .append('text')
                .attr('class', 'title')
                .attr('x', maxWidth / 2) // Center the title
                .attr('y', PADDING) // Start title at PADDING (e.g., 10px from top)
                .style('font-size', FONT_SIZE)
                .style('font-weight', 'bold') // Add bold style
                .attr('text-anchor', 'middle')
                .text(titleText);

            titleHeight = title.node().getBBox().height + PADDING; // Include padding below title
        }

        // Create legend items
        const legendGroup = container
            .selectAll('g.dynamicLegend-item')
            .data(legendItems)
            .join('g')
            .attr('class', 'dynamicLegend-item')
            .attr('transform', (d, i) => {
                const x = PADDING; // Fixed horizontal position
                const y = titleHeight + (BOX_SIZE + ITEM_SPACING) * i; // Stack below title
                return `translate(${x}, ${y})`;
            });

        // Add color rectangles
        legendGroup
            .append('rect')
            .attr('width', BOX_SIZE)
            .attr('height', BOX_SIZE)
            .style('fill', (d) => d.color);

        // Add text labels
        legendGroup
            .append('text')
            .attr('x', BOX_SIZE + PADDING)
            .attr('y', BOX_SIZE / 2 + 3) // Vertically center text with rectangle
            .style('font-size', FONT_SIZE)
            .text((d) => d.text);

        // Calculate the total dimensions and update SVG
        const legendBBox = container.node().getBBox();
        const totalSVGWidth = maxWidth + PADDING * 2; // Width includes padding on both sides
        const totalSVGHeight = legendBBox.height + PADDING; // Height includes top padding and all content

        // Move the container down to ensure the title isn’t cut off
        container.attr('transform', `translate(0, ${PADDING})`);

        // Update SVG dimensions
        svg.attr('width', totalSVGWidth)
            .attr('height', totalSVGHeight);
        
    }, [dynamicLegendItems, svgRef, options]);

    return <div ref={svgRef} />
}
