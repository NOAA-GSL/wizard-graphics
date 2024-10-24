import * as d3 from 'd3';

/*
//position relative to the div container
let loptions = {
	x: 0,
	y: 0,
	length : length,
	class : 'x4d-legend',
	tickValues : tickValues,
	tickAngle  : tickAngle,
	orient     : 'vertical',
	animationspeed: 1000,
	title: title,
	colorbar_ticks: layers[id]['colorbar_ticks'],
	colorbar_type : layers[id]['colorbar_type'],
	colorbar_levels:layers[id]['colorbar_levels'],
	colorbar_colors:layers[id]['colorbar_colors']
}
             
Legends.legendbar("legend-id",loptions)
*/

export default class Legend {
    static getcolors(colorbar_levels, colorbar_colors, colorbar_type) {
        const clen = colorbar_colors.length;
        const llen = colorbar_levels.length;
        if (colorbar_type === 'threshold') {
            if (llen + 1 !== clen) {
                console.log(
                    `ERROR: When using the threshold colorbar the number of colors must be one greater than the number of levels.` +
                        `\nColors Length: ${clen}\nLevels Length: ${llen}
                        \nLevels: ${colorbar_levels}
                        \nColors: ${colorbar_colors}`,
                );
            }
        } else if (colorbar_type === 'linear') {
            if (llen != clen) {
                console.log(
                    `ERROR: When using the linear colorbar the number of colors and levels must be equal` +
                        `\nColors Length: ${clen}\nLevels Length: ${llen}
                        \nLevels: ${colorbar_levels}
                        \nColors: ${colorbar_colors}`,
                );
            }
        } else {
            console.log('ERROR: Colorbar of type', colorbar, 'not found in field', field);
        }

        const colors = colorbar_type === 'linear' ? d3.scaleLinear() : d3.scaleThreshold();

        colors.domain(colorbar_levels).range(colorbar_colors);
        return colors;
    }

    static legendbarUpdatePositon(svgid, options) {
        const svg = d3.select(`#${svgid}`).select('#legend').selectAll('svg.colorbar');

        // Update the x & y position in case the graph has moved
        svg.transition().duration(options.animationspeed).attr('x', options.x).attr('y', options.y);
    }

    // End caps can introduce ticks that are outside the original values
    // This function will prevent those ticks from showing up
    static filterTicks(domain, ticks) {
        const min = domain[0];
        const max = domain[domain.length - 1];
        return ticks.filter((x) => x >= min && x <= max);
    }

    static legendbar(svgid, options) {
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

        let origin;
        const barlength = options.length; // how long is the bar
        const thickness = 10; // how thick is the bar
        let fillLegend;
        let fillLegendScale;

        let thickness_attr;
        let length_attr;
        let axis_orient;
        let position_variable;
        let non_position_variable;
        let axis_transform;
        let rect_transform;
        let text_dx;
        let text_dy;
        let text_rotate;
        let additionalTextRotate = 0;
        let additionalTextTranslate = 'translate(0,0)';

        const leftCap = options.colorbar_type == 'linear' ? false : !!options.colorbar_lcap;
        const rightCap = options.colorbar_type == 'linear' ? false : !!options.colorbar_rcap;

        // Grab the color scale
        const colorScale = Legends.getcolors(
            options.colorbar_levels,
            options.colorbar_colors,
            options.colorbar_type,
        );

        const titlepadding = options.title == '' ? 0 : 17;

        // Margin
        const margin = {
            // For vertical titles, the top is actually the left side
            top: titlepadding,
            bottom: 30, // *This needs to be dynamic based on the text width
            left: 5,
            right: 5,
        };

        if (options.orient === 'horizontal') {
            origin = {
                x: options.x,
                y: options.y,
            };
            margin.bottom = 15; // Don't need the bottom padding as much since numbers are horizonal
            thickness_attr = 'height';
            length_attr = 'width';
            axis_orient = 'bottom';
            position_variable = 'x';
            non_position_variable = 'y';
            text_dx = barlength / 2;
            text_dy = -5;
            text_rotate = 0;
            axis_transform = `translate (${(margin.left + margin.right) / 2},${
                thickness + margin.top
            })`;
            rect_transform = `translate (${(margin.left + margin.right) / 2},${margin.top})`;
        } else {
            origin = {
                x: options.x,
                y: options.y,
            };
            thickness_attr = 'width';
            length_attr = 'height';
            axis_orient = 'right';
            position_variable = 'y';
            non_position_variable = 'x';
            text_dx = -barlength / 2;
            text_dy = -5;
            text_rotate = -90;
            axis_transform = `translate (${thickness + margin.top},${
                (margin.left + margin.right) / 2
            })`;
            rect_transform = `translate (${margin.top},${(margin.left + margin.right) / 2})`;
        }

        // Only make if it doesn't exists
        d3.select(`#${svgid}`).select('#legend').node()
            ? d3.select(`#${svgid}`).select('#legend')
            : d3
                  .select(`#${svgid}`)
                  .append('g')
                  .attr('id', 'legend')
                  .attr('class', `legendbar ${options.class}`);

        const container = d3.select(`#${svgid}`).select('#legend');
        var svg = container.selectAll('svg.colorbar').data([origin]);

        // otherwise create the skeletal chart
        const new_colorbars = svg
            .enter()
            .append('svg')
            .classed('colorbar', true)
            .attr('x', origin.x) // Set the inital x and y position
            .attr('y', origin.y)
            .attr('charttype', 'chicletlegend')
            .attr(thickness_attr, thickness + titlepadding + margin.bottom) // gets overwritten later once we know what the label size is
            .attr(length_attr, barlength + 5 + 5);
        // <text dy="12" dx="18" class="legendtext">Grand Ensemble</text>

        // Always update the x, y and, field attributes
        svg.transition()
            .duration(options.animationspeed)
            .attr('x', origin.x) // Update the x and y position if graph has moved
            .attr('y', origin.y)
            .attr(length_attr, barlength + 5 + 5); // Update the length since that may have changed

        new_colorbars.append('g').attr('transform', rect_transform).classed('colorbar', true);

        var svg = d3.select(`#${svgid}`).select('#legend').select('svg');
        let text = d3.select(`#${svgid}`).select('#legend').select('.legendtext_colorbar');
        let axis = d3.select(`#${svgid}`).select('#legend').select('.axis.color');

        // Make axis if it doesn't exist
        if (!axis.node()) {
            axis = svg.append('g').attr('class', 'axis color legend-label-text');
        }

        if (!text.node()) {
            text = svg
                .append('text')
                .attr('class', 'legendtext_colorbar')
                .style('text-anchor', 'middle')
                .attr('dx', text_dx)
                .attr('dy', text_dy);
            // .attr("transform","rotate(" + text_rotate + ")")
        }

        // Set the title
        text.attr('transform', `${rect_transform} rotate(${text_rotate})`)
            .attr('dx', text_dx) // Update the position in case that has changed
            .attr('dy', text_dy)
            .text(options.title);

        // This either creates, or updates, a fill legend, and drops it
        // on the screen. A fill legend includes a pointer chart can be
        // updated in response to mouseovers, because that's way cool.

        fillLegend = svg.selectAll('g.colorbar');

        // Make the fillLegendScale
        const domain = colorScale.domain();
        // If left or right cap, just add another value to the array
        if (rightCap) domain.push(domain[domain.length - 1] + 1);
        if (leftCap) domain.unshift(domain[0] - 1);
        fillLegendScale = d3.scaleLinear().domain(domain);

        // Is this needed?
        // fillLegendScale = scale.copy();
        // if (typeof(fillLegendScale.invert)=="undefined") {
        //	fillLegendScale = d3.scaleLinear().domain(fillLegendScale.domain())
        // }

        const legendRange = d3.range(
            0,
            barlength,
            barlength / (fillLegendScale.domain().length - 1),
        );
        if (legendRange[legendRange.length - 1] != barlength) {
            legendRange.push(barlength);
        }

        if (options.orient == 'vertical') {
            // Vertical should go bottom to top, horizontal from left to right.
            // This should be changeable in the options, ideally.
            legendRange.reverse();
        }
        fillLegendScale.range(legendRange);

        const colorScaleRects = fillLegend
            .selectAll('rect.legendbars')
            .data(d3.range(0, barlength));

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
            .attr(thickness_attr, thickness)
            .attr(length_attr, 2) // single pixel thickness produces ghosting on some browsers
            .attr(position_variable, (d) => d)
            .attr(non_position_variable, 0)
            .transition()
            .duration(options.animationspeed)
            .style('fill', (d) => colorScale(fillLegendScale.invert(d)));

        if (axis_orient == 'right') {
            var colorAxisFunction = d3.axisRight();
        }
        if (axis_orient == 'bottom') {
            var colorAxisFunction = d3.axisBottom();
        }

        colorAxisFunction.scale(fillLegendScale).tickFormat(d3.format(',.2~f'));

        // If we supply specific values to the legend, use those labels (paintball plots)
        if (options.colorbar_ticks == 'byvalue' && options.tickValues) {
            let ticks = fillLegendScale.domain();
            ticks = this.filterTicks(colorScale.domain(), ticks);
            additionalTextRotate = options.tickAngle;
            colorAxisFunction.tickValues(ticks);
            colorAxisFunction.tickFormat((d, i) => options.tickValues[i]);
            if (additionalTextRotate < -80) {
                additionalTextTranslate = 'translate(0,10)';
            }
        }
        // If we want to plot tics by the values supplied
        else if (options.colorbar_ticks == 'byvalue') {
            const maxTicks = 20; // Only have this many ticks
            let ticks = fillLegendScale.domain();
            ticks = this.filterTicks(colorScale.domain(), ticks);
            // If ticks are greater than the max length, remove every nth value
            if (ticks.length > maxTicks) {
                const removeNth = (arr, n) => {
                    for (let i = n - 1; i < arr.length; i += n) {
                        arr.splice(i, 1);
                    }
                };
                // let nth = Math.floor(ticks.length/maxTicks)-1
                removeNth(ticks, 1);
            }
            colorAxisFunction.tickValues(ticks);
        }
        // Default tick values
        else {
            let ticks = colorAxisFunction.scale().ticks();
            ticks = this.filterTicks(colorScale.domain(), ticks);
            colorAxisFunction.tickValues(ticks);
        }

        // Now update the axis
        axis.attr('transform', axis_transform)
            .transition()
            .duration(options.animationspeed)
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

                const bufferPadding = 5;
                // probably don't want to hardcode width in there and use thickness_attr, but this works for now
                svg.transition().attr(
                    'width',
                    thickness + titlepadding + axisBBox.width + bufferPadding,
                );
            })
            .catch((error) => {
                //console.error('Error:', error);
            });
    }
}
