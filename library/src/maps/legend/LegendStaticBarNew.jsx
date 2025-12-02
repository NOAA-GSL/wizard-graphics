import * as d3 from 'd3';
import { scaleLinear, scaleThreshold, range, format } from 'd3';
import { useEffect, useRef } from 'react';
import { getTextDimensions, getColors, getMaxTextDimensions } from './legendHelperFunctions';

export default function LegendStaticBar({ options }) {
    // destructuring `options` with default values
    const {
        // required variables
        colors, // array of color strings
        colorLevels, // array of numbers
        colorType, // scaleLinear, scaleThreshold
        // optional variables
        animationSpeed = 1000,
        ticks: tickStyle = 'linear', // 'linear', 'byColorLevels'
        orient = 'vertical', // vertical or horizontal
        barLength = 600, // how long is the bar
        thickness = 10, // how thick is the bar
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
        tickLength = 5, // length of the tick lines
        tickAngle = 0, // angle of the tick-text values. ticks must be 'byColorLevels' or tickValues must be defined
        tickValues = null, // specific tick values for the colorbar
        // font props
        titleFontFamily = 'sans-serif',
        titleFontSize = 12,
        titleFontWeight = 400,
        titleFontColor = '#fff',
        tickFontFamily = 'sans-serif',
        tickFontSize = 10,
        tickFontWeight = 400,
        tickFontColor = '#fff',
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

    // todo: actually, I might not need this...
    function filterTicksTest(domain, ticksToFilter) {
        const min = domain[0];
        const max = domain[domain.length - 1];
        return ticksToFilter.map((tick) => {
            if (tick >= min && tick <= max) {
                return tick;
            }
            return '';
        });
    }

    useEffect(() => {
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
        const colorScale = getColors(colorLevels, colors, colorType);

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

    // do all the tick calculations
    // Grab the color scale
    const colorScale = getColors(colorLevels, colors, colorType);

    // Make the fillLegendScale
    const domain = colorScale.domain();
    // If left or right cap, just add another value to the array
    if (isRightCap) domain.push(domain[domain.length - 1] + 1);
    if (isLeftCap) domain.unshift(domain[0] - 1);
    console.log('domain:', domain);
    const fillLegendScale = scaleLinear().domain(domain);

    // the legendRange determines where the colors are placed along the bar
    const legendRange = range(0, barLength, barLength / (fillLegendScale.domain().length - 1));
    if (legendRange[legendRange.length - 1] !== barLength) {
        legendRange.push(barLength);
    }
    // Vertical should go bottom to top, horizontal from left to right.
    if (orient === 'vertical') {
        legendRange.reverse();
    }
    console.log('legendRange:', legendRange);
    fillLegendScale.range(legendRange);

    // Compute tick values and labels
    let finalTickValues = [];
    let finalTickLabels = [];
    const maxTicks = 20;

    if (tickStyle === 'byColorLevels' && tickValues) {
        // Use provided tick values and labels
        finalTickValues = fillLegendScale.domain();
        finalTickValues = filterTicks(colorScale.domain(), finalTickValues);
        finalTickLabels = tickValues;
    } else if (tickStyle === 'byColorLevels') {
        // Use color levels, but limit number of ticks
        finalTickValues = fillLegendScale.domain();
        finalTickValues = filterTicks(colorScale.domain(), finalTickValues);
        if (finalTickValues.length > maxTicks) {
            // Downsample ticks
            const step = Math.ceil(finalTickValues.length / maxTicks);
            finalTickValues = finalTickValues.filter((_, i) => i % step === 0);
        }
        finalTickLabels = finalTickValues.map((d) => format(',.2~f')(d));
    } else {
        // Default: use scale ticks
        finalTickValues = fillLegendScale.ticks
            ? fillLegendScale.ticks()
            : fillLegendScale.domain();
        finalTickValues = filterTicks(colorScale.domain(), finalTickValues);
        finalTickLabels = finalTickValues.map((d) => format(',.2~f')(d));
    }
    console.log('finalTickValues:', finalTickValues);
    console.log('finalTickLabels:', finalTickLabels);

    // don't include the () when no units are provided
    // using .trim() because sometimes we get a space in the empty string
    const titleText = `${title} ${units.trim() ? `(${units})` : ''}`;
    console.log('titleText:', titleText);

    const titleDimensions = getTextDimensions(
        titleText,
        `${titleFontWeight} ${titleFontSize}px ${titleFontFamily}`,
        titleRotate,
    );

    const textPaddingMultiplier = 1.2;
    const titleSize = isHorizontal
        ? titleDimensions.height * textPaddingMultiplier
        : titleDimensions.width * textPaddingMultiplier;

    const tickDimensions = getMaxTextDimensions(
        finalTickLabels,
        `${tickFontWeight} ${tickFontSize}px ${tickFontFamily}`,
        tickAngle,
    );

    const tickPadding = 2; // extra padding between ticks and labels
    const tickSize = isHorizontal
        ? tickDimensions.height + tickLength + tickPadding
        : tickDimensions.width + tickLength + tickPadding;

    // The logic below is used to add space for the first and last tick labels.
    // Without this, it's possible for the first and last labels to be cut off
    let labelSizeStart = 0;
    let labelSizeEnd = 0;
    if (finalTickValues[0] === domain[0]) {
        const labelDimensionsStart = getTextDimensions(
            finalTickLabels[0],
            `${tickFontWeight} ${tickFontSize}px ${tickFontFamily}`,
        );
        labelSizeStart = isHorizontal
            ? labelDimensionsStart.width / 2
            : labelDimensionsStart.height / 2;
        console.log('labelSizeStart:', labelSizeStart);
    }
    if (finalTickValues[finalTickValues.length - 1] === domain[domain.length - 1]) {
        const labelDimensionsEnd = getTextDimensions(
            finalTickLabels[finalTickLabels.length - 1],
            `${tickFontWeight} ${tickFontSize}px ${tickFontFamily}`,
        );
        labelSizeEnd = isHorizontal ? labelDimensionsEnd.width / 2 : labelDimensionsEnd.height / 2;
        console.log('labelSizeEnd:', labelSizeEnd);
    }

    const svgWidth = isHorizontal
        ? barLength + labelSizeStart + labelSizeEnd
        : thickness + titleSize + tickSize;
    const svgHeight = isHorizontal
        ? thickness + titleSize + tickSize
        : barLength + labelSizeStart + labelSizeEnd;

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

    return (
        <svg
            width={svgWidth}
            height={svgHeight}
            className={containerClassName}
            style={{
                display: 'block',
                ...containerSx,
            }}
        >
            {/* SVG defs for gradient */}
            {colorType === 'scaleLinear' && (
                <defs>
                    <linearGradient
                        id="legend-gradient"
                        x1={isHorizontal ? '0%' : '100%'}
                        y1={isHorizontal ? '100%' : '0%'}
                        x2={isHorizontal ? '100%' : '100%'}
                        y2={isHorizontal ? '100%' : '100%'}
                        gradientUnits="userSpaceOnUse"
                    >
                        {fillLegendScale.domain().map((d, i) => (
                            <stop
                                key={i}
                                offset={`${(fillLegendScale(d) / barLength) * 100}%`}
                                stopColor={colorScale(d)}
                            />
                        ))}
                    </linearGradient>
                </defs>
            )}

            {/* adjust position of entire legend based on extra spacing necessary for start/end labels  */}
            <g
                transform={`translate(${isHorizontal ? labelSizeStart : 0}, ${isHorizontal ? 0 : labelSizeEnd})`}
            >
                {/* title */}
                <text
                    // need to adjust rotation by setting the origin to the center of the text
                    // keep in mind that the titleDimensions include the rotation already
                    transform={
                        isHorizontal
                            ? undefined
                            : `rotate(${titleRotate}, ${titleDimensions.width / 2}, ${svgHeight / 2})`
                    }
                    x={isHorizontal ? svgWidth / 2 : titleDimensions.width / 2}
                    y={isHorizontal ? titleDimensions.height / 2 : svgHeight / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={titleClassName}
                    style={{
                        fill: titleFontColor,
                        fontFamily: titleFontFamily,
                        fontSize: titleFontSize,
                        fontWeight: titleFontWeight,
                        color: titleFontColor,
                        ...titleSx,
                    }}
                >
                    {titleText}
                </text>
                {/* legend bar */}
                <g
                    transform={
                        isHorizontal ? `translate(0, ${titleSize})` : `translate(${titleSize}, 0)`
                    }
                >
                    {/* if scaleLinear, we use a single rect with the gradient */}
                    {colorType === 'scaleLinear' ? (
                        <rect
                            x={0}
                            y={0}
                            width={isHorizontal ? barLength : thickness}
                            height={isHorizontal ? thickness : barLength}
                            fill="url(#legend-gradient)"
                        />
                    ) : (
                        // if scaleThreshold, we use multiple rects for each color segment
                        segments.map((seg, i) => (
                            <rect
                                key={i}
                                x={isHorizontal ? seg.start : 0}
                                y={isHorizontal ? 0 : seg.end}
                                width={isHorizontal ? seg.end - seg.start : thickness}
                                height={isHorizontal ? thickness : seg.start - seg.end}
                                fill={seg.color}
                            />
                        ))
                    )}
                </g>
                {/* legend ticks */}
                <g
                    transform={
                        isHorizontal ? `translate(0, ${titleSize})` : `translate(${titleSize}, 0)`
                    }
                >
                    {/* axis line */}
                    <line
                        x1={isHorizontal ? 0 : thickness}
                        y1={isHorizontal ? thickness : 0}
                        x2={isHorizontal ? barLength : thickness}
                        y2={isHorizontal ? thickness : barLength}
                        stroke={tickFontColor}
                    />
                    {finalTickValues.map((tickValue, i) => {
                        const pos = fillLegendScale(tickValue);
                        return (
                            <g
                                key={tickValue}
                                // The offset of 1 is for the axis line of 1px thickness
                                transform={
                                    isHorizontal ? `translate(${pos},1)` : `translate(1,${pos})`
                                }
                            >
                                <line
                                    x1={isHorizontal ? 0 : thickness}
                                    y1={isHorizontal ? thickness : 0}
                                    x2={isHorizontal ? 0 : thickness + tickLength}
                                    y2={isHorizontal ? thickness + tickLength : 0}
                                    stroke={tickFontColor}
                                />
                                <text
                                    x={isHorizontal ? 0 : thickness + tickLength + tickPadding}
                                    y={isHorizontal ? thickness + tickLength + tickPadding : 0}
                                    transform={
                                        isHorizontal
                                            ? `rotate(${tickAngle}, 0, ${thickness + tickLength + tickSize})`
                                            : `rotate(${tickAngle}, ${thickness + tickLength + tickSize}, 0)`
                                    }
                                    textAnchor={isHorizontal ? 'middle' : 'start'}
                                    dominantBaseline={isHorizontal ? 'hanging' : 'central'}
                                    className={tickClassName}
                                    style={{
                                        fill: tickFontColor,
                                        fontFamily: tickFontFamily,
                                        fontSize: `${tickFontSize}px`,
                                        fontWeight: tickFontWeight,
                                        color: tickFontColor,
                                        ...tickSx,
                                    }}
                                >
                                    {finalTickLabels[i]}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </g>
        </svg>
    );
}
