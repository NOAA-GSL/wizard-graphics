import * as d3 from 'd3';
import { scaleLinear, range } from 'd3';
import { useEffect, useRef } from 'react';
import { getTextDimensions } from './legendHelperFunctions';

export function getcolors(colorLevels, colors, colorType) {
    const clen = colors.length;
    const llen = colorLevels.length;
    if (colorType === 'scaleThreshold') {
        if (llen + 1 !== clen) {
            console.log(
                `ERROR: When using the threshold colorbar the number of colors must be one greater than the number of levels.` +
                    `\nColors Length: ${clen}\nLevels Length: ${llen}
                    \nLevels: ${colorLevels}
                    \nColors: ${colors}`,
            );
        }
    } else if (colorType === 'scaleLinear') {
        if (llen !== clen) {
            console.log(
                `ERROR: When using the linear colorbar the number of colors and levels must be equal` +
                    `\nColors Length: ${clen}\nLevels Length: ${llen}
                    \nLevels: ${colorLevels}
                    \nColors: ${colors}`,
            );
        }
    } else {
        console.log('ERROR: Colorbar of type', colorType, 'not found');
    }

    const colorScale = colorType === 'scaleLinear' ? d3.scaleLinear() : d3.scaleThreshold();

    colorScale.domain(colorLevels).range(colors);
    return colorScale;
}

export default function LegendStaticBar({ options }) {
    // destructuring `options` with default values
    const {
        // required variables
        colors, // array of color strings
        colorLevels, // array of numbers
        colorType, // scaleLinear, scaleThreshold
        // optional variables
        animationSpeed = 1000,
        className = '',
        ticks: tickStyle = 'linear', // 'linear', 'byColorLevels'
        orient = 'vertical', // vertical or horizontal
        barLength = 600, // how long is the bar
        thickness = 10, // how thick is the bar
        tickAngle = 0, // angle of the tick-text values. ticks must be 'byColorLevels' or tickValues must be defined
        tickValues = null, // specific tick values for the colorbar
        title = '', // title on legend
        units = '', // units on legend
        x = 0, // position relative to the div container
        y = 0, // position relative to the div container
        // styling options and additions
        containerClassName = 'desi-default-legend-container',
        containerSx = {},
        titleClassName = 'desi-default-legend-title',
        titleSx = {},
        tickClassName = 'desi-default-legend-tick',
        tickSx = {},
        // font props
        fontFamily = 'sans-serif',
        fontSize = 12,
        fontWeight = 400,
        fontColor = '#fff',
    } = options;

    // scaleLinear should always have isLeftCap and isRightCap set to false
    // otherwise, use the options provided
    const isLeftCap = colorType === 'scaleLinear' ? false : options.isLeftCap;
    const isRightCap = colorType === 'scaleLinear' ? false : options.isRightCap;

    const svgRef = useRef();

    // End caps can introduce ticks that are outside the original values
    // This function will prevent those ticks from showing up
    function filterTicks(domain, ticksToFilter) {
        const min = domain[0];
        const max = domain[domain.length - 1];
        return ticksToFilter.filter((tick) => tick >= min && tick <= max);
    }

    useEffect(() => {
        /*
		Copyright (c) 2013, Benjamin Schmidt
		All rights reserved.
		Modified by Travis Wilson for D3v6 and this application
		
		Redistribution and use in source and binary forms, with or without modification,
		are permitted provided that the following conditions are met:
		
		* Redistributions of source code must retain the above copyright notice, this
			list of conditions and the following disclaimer.
		
		* Redistributions in binary form must reproduce the above copyright notice, this
			list of conditions and the following disclaimer in the documentation and/or
			other materials provided with the distribution.
		
		* Neither the name of the {organization} nor the names of its
			contributors may be used to endorse or promote products derived from
			this software without specific prior written permission.
		
		THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
		ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
		WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
		DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
		ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
		(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
		LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
		ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
		(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
		SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
		*/

        const origin = { x, y };

        let thicknessAttr;
        let lengthAttr;
        let axisOrient;
        let positionVariable;
        let nonPositionVariable;
        let axisTransform;
        let rectTransform;
        let textDx;
        let textDy;
        let textRotate;
        let additionalTextRotate = 0;
        let additionalTextTranslate = 'translate(0,0)';

        // Grab the color scale
        const colorScale = getcolors(colorLevels, colors, colorType);

        const titlePadding = title ? 17 : 0;

        // Margin
        const margin = {
            // For vertical titles, the top is actually the left side
            top: titlePadding,
            bottom: 30, // *This needs to be dynamic based on the text width
            left: 5,
            right: 5,
        };

        if (orient === 'horizontal') {
            margin.bottom = 15; // Don't need the bottom padding as much since numbers are horizonal
            margin.right = 0; // something is adding unnecessary padding on the right side
            thicknessAttr = 'height';
            lengthAttr = 'width';
            axisOrient = 'bottom';
            positionVariable = 'x';
            nonPositionVariable = 'y';
            textDx = barLength / 2;
            textDy = -5;
            textRotate = 0;
            axisTransform = `translate (${(margin.left + margin.right) / 2},${
                thickness + margin.top
            })`;
            rectTransform = `translate (${(margin.left + margin.right) / 2},${margin.top})`;
        } else {
            thicknessAttr = 'width';
            lengthAttr = 'height';
            axisOrient = 'right';
            positionVariable = 'y';
            nonPositionVariable = 'x';
            textDx = -barLength / 2;
            textDy = -5;
            textRotate = -90;
            axisTransform = `translate (${thickness + margin.top},${
                (margin.left + margin.right) / 2
            })`;
            rectTransform = `translate (${margin.top},${(margin.left + margin.right) / 2})`;
        }

        const divContainer = d3.select(svgRef.current);

        // otherwise create the skeletal chart
        const newColorbars = divContainer
            .selectAll('svg.colorbar')
            .data([origin])
            .enter()
            .append('svg')
            .classed('colorbar', true)
            .attr('x', origin.x) // Set the inital x and y position
            .attr('y', origin.y)
            .attr(thicknessAttr, thickness + titlePadding + margin.bottom) // gets overwritten later once we know what the label size is
            .attr(lengthAttr, barLength + 5 + 5);
        // <text dy="12" dx="18" class="legendtext">Grand Ensemble</text>

        // Always update the x, y and, field attributes
        divContainer
            .selectAll('svg.colorbar')
            .data([origin])
            .transition()
            .duration(animationSpeed)
            .attr('x', origin.x) // Update the x and y position if graph has moved
            .attr('y', origin.y)
            .attr(lengthAttr, barLength + 5 + 5); // Update the length since that may have changed

        newColorbars.append('g').attr('transform', rectTransform).classed('colorbar', true);

        const svg = divContainer.select('svg');
        let text = divContainer.select('.legendtext_colorbar');
        let axis = divContainer.select('.axis.color');

        // Make axis if it doesn't exist
        if (!axis.node()) {
            axis = svg.append('g').attr('class', 'axis color legend-label-text');
        }

        if (!text.node()) {
            text = svg
                .append('text')
                .attr('class', 'legendtext_colorbar')
                .style('text-anchor', 'middle')
                .attr('dx', textDx)
                .attr('dy', textDy);
            // .attr("transform","rotate(" + textRotate + ")")
        }

        // This either creates, or updates, a fill legend, and drops it
        // on the screen. A fill legend includes a pointer chart can be
        // updated in response to mouseovers, because that's way cool.

        const fillLegend = svg.selectAll('g.colorbar');

        // Make the fillLegendScale
        const domain = colorScale.domain();
        // If left or right cap, just add another value to the array
        if (isRightCap) domain.push(domain[domain.length - 1] + 1);
        if (isLeftCap) domain.unshift(domain[0] - 1);
        const fillLegendScale = d3.scaleLinear().domain(domain);

        const legendRange = d3.range(
            0,
            barLength,
            barLength / (fillLegendScale.domain().length - 1),
        );
        if (legendRange[legendRange.length - 1] !== barLength) {
            legendRange.push(barLength);
        }
        if (orient === 'vertical') {
            // Vertical should go bottom to top, horizontal from left to right.
            // This should be changeable in the options, ideally.
            legendRange.reverse();
        }
        fillLegendScale.range(legendRange);

        const colorScaleRects = fillLegend
            .selectAll('rect.legendbars')
            .data(d3.range(0, barLength));

        colorScaleRects
            .enter()
            .append('rect')
            .attr('class', 'legendbars')
            .style('opacity', 0)
            .style('stroke-thickness', 0)
            .style('fill', (d) => colorScale(fillLegendScale.invert(d)));

        colorScaleRects.exit().remove();

        // Switch to using the original selection so that the transition will be inheirited
        svg.selectAll('rect.legendbars')
            .style('opacity', 1)
            .attr(thicknessAttr, thickness)
            .attr(lengthAttr, 2) // single pixel thickness produces ghosting on some browsers
            .attr(positionVariable, (d) => d)
            .attr(nonPositionVariable, 0)
            .transition()
            .duration(animationSpeed)
            .style('fill', (d) => colorScale(fillLegendScale.invert(d)));

        let colorAxisFunction;
        if (axisOrient === 'right') {
            colorAxisFunction = d3.axisRight();
        }
        if (axisOrient === 'bottom') {
            colorAxisFunction = d3.axisBottom();
        }

        colorAxisFunction.scale(fillLegendScale).tickFormat(d3.format(',.2~f'));

        // If we supply specific values to the legend, use those labels (paintball plots)
        if (tickStyle === 'byColorLevels' && tickValues) {
            let finalTicks = fillLegendScale.domain();
            finalTicks = filterTicks(colorScale.domain(), finalTicks);
            additionalTextRotate = tickAngle ?? 0;
            colorAxisFunction.tickValues(finalTicks);
            colorAxisFunction.tickFormat((d, i) => tickValues[i]);
            if (additionalTextRotate < -80) {
                additionalTextTranslate = 'translate(0,10)';
            }
        }
        // If we want to plot tics by the values supplied
        else if (tickStyle === 'byColorLevels') {
            const maxTicks = 20; // Only have this many ticks
            let finalTicks = fillLegendScale.domain();
            finalTicks = filterTicks(colorScale.domain(), finalTicks);
            // If ticks are greater than the max length, remove every nth value
            if (finalTicks.length > maxTicks) {
                const removeNth = (arr, n) => {
                    for (let i = n - 1; i < arr.length; i += n) {
                        arr.splice(i, 1);
                    }
                };
                // let nth = Math.floor(ticks.length/maxTicks)-1
                removeNth(finalTicks, 1);
            }
            colorAxisFunction.tickValues(finalTicks);
        }
        // Default tick values
        else {
            let finalTicks = colorAxisFunction.scale().ticks();
            finalTicks = filterTicks(colorScale.domain(), finalTicks);
            colorAxisFunction.tickValues(finalTicks);
        }

        // Now update the axis
        axis.attr('transform', axisTransform)
            .transition()
            .duration(animationSpeed)
            .call(colorAxisFunction)
            .selectAll('text')
            .attr('transform', `rotate(${additionalTextRotate}) ${additionalTextTranslate}`)
            .end()
            .then(() => {
                // update the margin based on the size of the text labels
                const axisBBox = axis.node().getBBox();
                if (additionalTextRotate !== 0) {
                    // Calculate the rotated bounding box dimensions
                    const radians = (additionalTextRotate * Math.PI) / 180;
                    const cos = Math.abs(Math.cos(radians));
                    const sin = Math.abs(Math.sin(radians));
                    // using width for both measurements because height is the entire legend axis
                    const rotatedWidth = axisBBox.width * cos;
                    const rotatedHeight = axisBBox.width * sin;

                    // Using 10 as a buffer for the rotated text. This is because the axis of the text is
                    // centered, so when it rotates, the top of the last letter can get cut off.
                    axisBBox.width = rotatedWidth + 10;
                    axisBBox.height = rotatedHeight + 10;
                }

                // hack to make the resizing work for horizontal and vertical legends
                const legendBarDimension = orient === 'horizontal' ? 'height' : 'width';
                const bufferPadding = 5;
                // probably don't want to hardcode width in there and use thicknessAttr, but this works for now
                svg.transition().attr(
                    legendBarDimension,
                    thickness + titlePadding + axisBBox[legendBarDimension] + bufferPadding,
                );
            })
            // eslint-disable-next-line no-unused-vars
            .catch((error) => {
                // eslint-disable-next-line spaced-comment
                //console.error('Error:', error);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colors, colorLevels, colorType, barLength, thickness, title, units, x, y]);

    // ----------------- New Legend Code Below -----------------
    const isHorizontal = orient === 'horizontal';
    const titleRotate = isHorizontal ? 0 : -90;

    // don't include the () when no units are provided
    // using .trim() because sometimes we get a space in the empty string
    const titleText = `${title} ${units.trim() ? `(${units})` : ''}`;

    const titleDimensions = getTextDimensions(
        titleText,
        `${fontWeight} ${fontSize}px ${fontFamily}`,
        titleRotate,
    );

    // todo: fix the 10px hardcoding here
    const svgWidth = isHorizontal ? barLength + 10 : thickness + 10 + titleDimensions.width;
    console.log('svgWidth:', svgWidth);
    const svgHeight = isHorizontal ? thickness + 10 + titleDimensions.height : barLength + 10;
    console.log('svgHeight:', svgHeight);

    // Grab the color scale
    const colorScale = getcolors(colorLevels, colors, colorType);
    console.log('colorScale:', colorScale);

    // Make the fillLegendScale
    const domain = colorScale.domain();
    // If left or right cap, just add another value to the array
    if (isRightCap) domain.push(domain[domain.length - 1] + 1);
    if (isLeftCap) domain.unshift(domain[0] - 1);
    console.log('domain:', domain);
    const fillLegendScale = scaleLinear().domain(domain);
    console.log('fillLegendScale:', fillLegendScale);

    // the legendRange determines where the colors are placed along the bar
    const legendRange = range(0, barLength, barLength / (fillLegendScale.domain().length - 1));
    if (legendRange[legendRange.length - 1] !== barLength) {
        legendRange.push(barLength);
    }
    // Vertical should go bottom to top, horizontal from left to right.
    // This should be configurable in the options, ideally.
    if (orient === 'vertical') {
        legendRange.reverse();
    }
    console.log('legendRange:', legendRange);
    fillLegendScale.range(legendRange);
    console.log('fillLegendScale:', fillLegendScale);

    // Compute segment positions
    const stops = fillLegendScale.domain();
    const segments = [];
    for (let i = 0; i < stops.length - 1; i += 1) {
        segments.push({
            start: fillLegendScale(stops[i]),
            end: fillLegendScale(stops[i + 1]),
            color: colorScale(stops[i]),
        });
    }
    console.log('titleDimensions.height:', titleDimensions.height);

    return (
        <div
            className={containerClassName}
            style={{ fontFamily, fontSize, fontWeight, color: fontColor, ...containerSx }}
        >
            <svg width={svgWidth} height={svgHeight} style={{ border: '1px solid white' }}>
                {/* title */}
                <text
                    // need to adjust rotation so it isn't around the origin
                    transform={
                        isHorizontal
                            ? null
                            : `translate(${titleDimensions.width}, ${svgHeight / 2}) rotate(${titleRotate})`
                    }
                    x={isHorizontal ? svgWidth / 2 : 0}
                    y={isHorizontal ? titleDimensions.height / 2 : 0}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={titleClassName}
                    style={{ fill: fontColor, ...titleSx }}
                >
                    {titleText}
                </text>
                {/* legend bar */}
                {console.log('titleDimensions.height:', titleDimensions.height)}
                <g
                    // todo: need to come back and fix the 5px hardcoding here
                    transform={
                        isHorizontal
                            ? `translate(5, ${titleDimensions.height})`
                            : `translate(${titleDimensions.width * 1.25}, 5)`
                    }
                >
                    {segments.map((seg, i) => (
                        <rect
                            key={i}
                            x={isHorizontal ? seg.start : 0}
                            y={isHorizontal ? 0 : seg.start}
                            width={isHorizontal ? seg.end - seg.start : thickness}
                            height={isHorizontal ? thickness : seg.end - seg.start}
                            fill={seg.color}
                        />
                    ))}
                </g>
            </svg>
        </div>
    );
}
