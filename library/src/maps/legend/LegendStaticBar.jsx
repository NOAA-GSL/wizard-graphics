import { useId } from 'react';
import { scaleLinear, range, format } from 'd3';
import {
    getTextDimensions,
    getColors,
    getMaxTextDimensions,
    getTransformProps,
    getTitleProps,
} from './legendHelperFunctions';

export default function LegendStaticBar({ options }) {
    // destructuring `options` with default values
    const {
        // required variables
        colors, // array of color strings
        colorLevels, // array of numbers
        colorType, // scaleLinear, scaleThreshold
        // optional variables
        // animationSpeed = 1000, // removed animations for now
        ticks: tickStyle = 'linear', // 'linear', 'byColorLevels'
        orient = 'vertical', // vertical or horizontal
        barLength = 600, // how long is the bar
        thickness = 10, // how thick is the bar
        title = '', // title on legend
        units = '', // units on legend
        // styling options and additions
        containerClassName = 'desi-default-legend-container',
        containerSx = {},
        titleClassName = 'desi-default-legend-title',
        titleSx = {},
        titleJustify = 'center', // left, center, right
        // space between the title and the bar, this is a multiplier of the title height/width
        titlePaddingMultiplier = 1.2,
        tickClassName = 'desi-default-legend-tick',
        tickLength = 5, // length of the tick lines
        tickAngle = 0, // angle of the tick-text values. ticks must be 'byColorLevels' or tickValues must be defined
        tickValues = null, // specific tick values for the colorbar
        tickPadding = 2, // extra padding between ticks and labels
        tickStrokeWidth = 1, // stroke width of the tick lines
        // hide the first and last ticks, will not affect end caps ticks since those are already hidden
        hideOuterTicks = false,
        // set the axis line stroke width
        axisStrokeWidth = 1,
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

    // we need to generate a unique id for the legend bar gradient
    const gradientId = useId();

    // End caps can introduce ticks that are outside the original values
    // This function will prevent those ticks from showing up
    const filterTicks = (domain, ticksToFilter) => {
        const min = domain[0];
        const max = domain[domain.length - 1];
        return ticksToFilter.filter((tick) => tick >= min && tick <= max);
    };

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
    fillLegendScale.range(legendRange);

    // Compute tick values and labels
    let finalTickValues = [];
    let finalTickLabels = [];
    // limit number of ticks based on the bar length
    const maxTicks = barLength * 0.025;

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

    // perform some logic to hide outer ticks if specified
    // this will only be applied if isLeftCap or isRightCap is false
    if (hideOuterTicks) {
        if (!isLeftCap) {
            finalTickValues = finalTickValues.slice(1);
            finalTickLabels = finalTickLabels.slice(1);
        }
        if (!isRightCap) {
            finalTickValues = finalTickValues.slice(0, finalTickValues.length - 1);
            finalTickLabels = finalTickLabels.slice(0, finalTickLabels.length - 1);
        }
    }

    // don't include the () when no units are provided
    // using .trim() because sometimes we get a space in the empty string
    const titleText = `${title} ${units.trim() ? `(${units})` : ''}`.trim();

    const titleDimensions = getTextDimensions(
        titleText,
        `${titleFontWeight} ${titleFontSize}px ${titleFontFamily}`,
        titleRotate,
    );
    console.log('titleDimensions:', titleDimensions);

    let titleSize = 0;
    if (titleText.length > 0) {
        titleSize = isHorizontal
            ? titleDimensions.height * titlePaddingMultiplier
            : titleDimensions.width * titlePaddingMultiplier;
    }

    const maxTickDimensions = getMaxTextDimensions(
        finalTickLabels,
        `${tickFontWeight} ${tickFontSize}px ${tickFontFamily}`,
        tickAngle,
    );

    // we have to adjust the tickPadding based on a negative tickLength
    const adjustedTickPadding = tickLength < 0 ? tickPadding * -1 : tickPadding;
    let tickSize = isHorizontal
        ? maxTickDimensions.height + tickLength + adjustedTickPadding + axisStrokeWidth / 2
        : maxTickDimensions.width + tickLength + adjustedTickPadding + axisStrokeWidth / 2;
    // if ticks are inside the bar, don't add to size (just the axis line)
    if (tickLength < 0) tickSize = axisStrokeWidth / 2;

    // The logic below is used to add space for the first and last tick labels.
    // Without this, it's possible for the first and last labels to be cut off
    let labelSizeStart = 0;
    let labelSizeEnd = 0;
    if (finalTickValues[0] === domain[0]) {
        const labelDimensionsStart = getTextDimensions(
            finalTickLabels[0],
            `${tickFontWeight} ${tickFontSize}px ${tickFontFamily}`,
            tickAngle,
        );
        labelSizeStart = isHorizontal ? labelDimensionsStart.width : labelDimensionsStart.height;
    }
    if (finalTickValues[finalTickValues.length - 1] === domain[domain.length - 1]) {
        const labelDimensionsEnd = getTextDimensions(
            finalTickLabels[finalTickLabels.length - 1],
            `${tickFontWeight} ${tickFontSize}px ${tickFontFamily}`,
            tickAngle,
        );
        labelSizeEnd = isHorizontal ? labelDimensionsEnd.width : labelDimensionsEnd.height;
    }
    // divide the label size by 2 when the tick angle is 0 or 90 because the text is centered on the tick
    if (tickAngle === 90 || tickAngle === -90 || tickAngle === 0) {
        labelSizeStart /= 2;
        labelSizeEnd /= 2;
    }
    const svgWidth = isHorizontal
        ? barLength + labelSizeStart + labelSizeEnd
        : thickness + titleSize + tickSize;
    const svgHeight = isHorizontal
        ? thickness + titleSize + tickSize
        : barLength + labelSizeStart + labelSizeEnd;

    const titleProps = getTitleProps({
        isHorizontal,
        titleJustify,
        barLength,
        svgWidth,
        svgHeight,
        titleDimensions,
    });

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
                        id={gradientId}
                        x1="0%"
                        y1="100%"
                        x2={isHorizontal ? '100%' : '0%'}
                        y2={isHorizontal ? '100%' : '0%'}
                    >
                        {fillLegendScale.domain().map((d, i) => {
                            let offset;
                            if (isHorizontal) {
                                offset = (fillLegendScale(d) / barLength) * 100;
                            } else {
                                // For vertical, flip the offset so 0% is at the bottom
                                offset = 100 - (fillLegendScale(d) / barLength) * 100;
                            }
                            return <stop key={i} offset={`${offset}%`} stopColor={colorScale(d)} />;
                        })}
                    </linearGradient>
                </defs>
            )}

            {/* adjust position of entire legend based on extra spacing necessary for start/end labels  */}
            <g
                transform={`translate(${isHorizontal ? labelSizeStart : 0}, ${isHorizontal ? 0 : labelSizeEnd})`}
            >
                {/* title */}
                <text
                    transform={titleProps.transform}
                    x={titleProps.x}
                    y={titleProps.y}
                    textAnchor={titleProps.textAnchor}
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
                            fill={`url(#${gradientId})`}
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
                        strokeWidth={axisStrokeWidth}
                    />
                    {finalTickValues.map((tickValue, i) => {
                        const pos = fillLegendScale(tickValue);
                        const anchorPoint =
                            thickness + tickLength + adjustedTickPadding + axisStrokeWidth / 2;
                        const transformProps = getTransformProps(
                            isHorizontal,
                            anchorPoint,
                            tickLength,
                            tickAngle,
                        );
                        return (
                            <g
                                key={tickValue}
                                // The offset of axisStrokeWidth is for the axis line of 1px thickness
                                transform={
                                    isHorizontal
                                        ? `translate(${pos},${(axisStrokeWidth / 2) * (tickLength < 0 ? -1 : 1)})`
                                        : `translate(${(axisStrokeWidth / 2) * (tickLength < 0 ? -1 : 1)},${pos})`
                                }
                            >
                                <line
                                    x1={isHorizontal ? 0 : thickness}
                                    y1={isHorizontal ? thickness : 0}
                                    x2={isHorizontal ? 0 : thickness + tickLength}
                                    y2={isHorizontal ? thickness + tickLength : 0}
                                    stroke={tickFontColor}
                                    strokeWidth={tickStrokeWidth}
                                />
                                <text
                                    x={isHorizontal ? 0 : anchorPoint}
                                    y={isHorizontal ? anchorPoint : 0}
                                    className={tickClassName}
                                    transform={transformProps.transform}
                                    textAnchor={transformProps.textAnchor}
                                    dominantBaseline={transformProps.dominantBaseline}
                                    style={{
                                        fill: tickFontColor,
                                        fontFamily: tickFontFamily,
                                        fontSize: `${tickFontSize}px`,
                                        fontWeight: tickFontWeight,
                                        color: tickFontColor,
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
