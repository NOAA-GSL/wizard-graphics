import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import gUtilities from '../../utilities/graphicsUtilities';

export default function LegendStaticItems({ options }) {
    const svgRef = useRef();

    useEffect(() => {

        const divContainer = d3.select(svgRef.current);

        /// Step 1: Check if the SVG exists in the divContainer, otherwise create one
        let svg = divContainer.select('svg');
        if (svg.empty()) {
            svg = divContainer.append('svg')
                .attr('width', 500)  // Set width of the SVG
                .attr('height', 500); // Set height of the SVG
        }

        // Create or select the legend group
        let container = svg.select('#staticLegend');
        if (container.empty()) {
            container = svg.append('g').attr('id', 'staticLegend');
        } else {
            // Remove existing legend items and title
            container.selectAll('g.staticLegend-item').remove();
            container.selectAll('text.title').remove();
        }

        const PADDING = 5; // General padding
        const ITEM_SPACING = 10; // Increased space between legend items
        const BOX_SIZE = 10;
        const FONT_SIZE = '12px';

        let titleHeight = 0;

        if (options.colors.length !== options.labels.length) {
            console.error('Colors and labels must have the same length.');
            return;
        }

        let legendItems = [];
        if (options.layerType === 'temp') {
            legendItems = options.colors.temp.map((color, index) => ({
                label: options.labels.labels[index],
                color: color,
            }));
        } else if (options.layerType === 'prcp') {
            legendItems = options.colors.prcp.map((color, index) => ({
                label: options.labels.labels[index],
                color: color,
            }));
        } else {
            legendItems = options.colors.map((color, index) => ({
                label: options.labels[index],
                color: color,
            })) || []; 
        }
        
        const itemWidths = legendItems.map((item) => {
            const labelTextElement = svg
                .append('text')
                .text(item.label)
                .style('font-size', FONT_SIZE)
                .style('visibility', 'hidden');

            const width = BOX_SIZE + labelTextElement.node().getBBox().width + PADDING;
            labelTextElement.remove(); // Clean up
            return width;
        });

        const totalWidth = d3.sum(itemWidths);
        const totalPadding = ITEM_SPACING * (legendItems.length - 1); // Padding between items
        const fullWidth = totalWidth + totalPadding;

        // Calculate total SVG width without excessive padding
        const totalSVGWidth = fullWidth; // Only width of legend items
        const validTimes = gUtilities.formatValidTime(options)
        
        if (options.title && validTimes) {
            const titleText = `${options.title} ${validTimes}`;
            const title = container
                .append('text')
                .attr('class', 'title')
                .attr('x', totalSVGWidth / 2) // Centering based on total width
                .attr('y', 10)
                .style('font-size', FONT_SIZE)
                .attr('text-anchor', 'middle')
                .text(titleText);

            titleHeight = title.node().getBBox().height;
        }

        const legendGroup = container
            .selectAll('g.staticLegend-item')
            .data(legendItems)
            .join('g')
            .attr('class', 'staticLegend-item')
            .attr('transform', (d, i) => {
                const x = d3.sum(itemWidths.slice(0, i)) + ITEM_SPACING * i; // Adjusted for item spacing
                const y = titleHeight + PADDING;
                return `translate(${x}, ${y})`;
            });

        legendGroup
            .append('rect')
            .attr('width', BOX_SIZE)
            .attr('height', BOX_SIZE)
            .style('fill', (d) => d.color);

        legendGroup
            .append('text')
            .attr('x', BOX_SIZE + 5)
            .attr('y', BOX_SIZE / 2 + 3)
            .style('font-size', FONT_SIZE)
            .text((d) => d.label);

        // Calculate the centering offset for the entire legend group
        const legendBBox = container.node().getBBox();
        const centerOffset = (totalSVGWidth - legendBBox.width) / 2;

        // Apply transform to center the legend group
        container.attr('transform', `translate(${centerOffset}, ${titleHeight + PADDING})`);

        // Update the SVG dimensions, reducing bottom padding
        svg.attr('width', totalSVGWidth).attr('height', legendBBox.height + titleHeight + PADDING);
        
    }, [options]);

    return <div ref={svgRef} />;
}

