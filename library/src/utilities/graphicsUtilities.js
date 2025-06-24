export default class gUtilities {
    static ijToIdx(i, j, width, height, size = 1) {
        if (i < 0 || i >= width || j < 0 || j >= height) return NaN;
        return (j * width + i) * size;
    }

    static ijkToIdx(i, j, k, width, height) {
        return k * (width * height) + j * width + i;
    }

    static uvToDirection(u, v) {
        return 180 + (180 / Math.PI) * Math.atan2(u, v);
    }

    static uvToMagnitude(u, v) {
        return Math.sqrt(u * u + v * v);
    }

    static DirectionToUV(dir, mag) {
        const rad = (dir * Math.PI) / 180;
        const u = -mag * Math.sin(rad);
        const v = -mag * Math.cos(rad);
        return [u, v];
    }

    static getreadoutvalue(lat, lon, proj, data, units, interpolate = true) {
        const [i, j] = proj.LonLatToij(lon, lat, false, true);

        // Get floor/ceil points
        const iFloor = Math.floor(i);
        const iCeiling = Math.ceil(i);
        const jFloor = Math.floor(j);
        const jCeiling = Math.ceil(j);

        // Get weights
        const iWeight = 1 - (i - iFloor);
        const iWeight2 = 1 - iWeight;
        const jWeight = 1 - (j - jFloor);
        const jWeight2 = 1 - jWeight;

        // Get data points
        // p3-----p4
        // |------|
        // p1-----p2
        const dims = [proj.lonlatGrid.length, proj.lonlatGrid[0].length];
        const p1 = data?.[gUtilities.ijToIdx(iFloor, jCeiling, dims[1], dims[0])];
        const p2 = data?.[gUtilities.ijToIdx(iCeiling, jCeiling, dims[1], dims[0])];
        const p3 = data?.[gUtilities.ijToIdx(iFloor, jFloor, dims[1], dims[0])];
        const p4 = data?.[gUtilities.ijToIdx(iCeiling, jFloor, dims[1], dims[0])];

        function interpolateData(point1, point2, point3, point4) {
            let value;
            const values = [point3, point1, point4, point2];
            if (interpolate) {
                value =
                    point3 * iWeight * jWeight +
                    point1 * iWeight * jWeight2 +
                    point4 * iWeight2 * jWeight +
                    point2 * iWeight2 * jWeight2;
            } else {
                const weights = [
                    iWeight * jWeight,
                    iWeight * jWeight2,
                    iWeight2 * jWeight,
                    iWeight2 * jWeight2,
                ];
                const max = Math.max(...weights);
                const index = weights.indexOf(max);
                value = values[index];
            }

            // Check for missing value or NaN
            value = values.some((val) => Number.isNaN(val)) ? NaN : value;

            return value;
        }

        let value;
        if (units === '°') {
            const [p1u, p1v] = this.DirectionToUV(p1, 1);
            const [p2u, p2v] = this.DirectionToUV(p2, 1);
            const [p3u, p3v] = this.DirectionToUV(p3, 1);
            const [p4u, p4v] = this.DirectionToUV(p4, 1);
            const uValue = interpolateData(p1u, p2u, p3u, p4u);
            const vValue = interpolateData(p1v, p2v, p3v, p4v);
            value = this.uvToDirection(uValue, vValue);
        } else {
            value = interpolateData(p1, p2, p3, p4);
        }

        return value;
    }

    static roundto(value, digits) {
        const roundto = 10 ** digits;
        return Math.round(value * roundto) / roundto;
    }

    static string_to_rgb(rgbString) {
        const rgb = rgbString
            .replace(/[^\d,.]/g, '')
            .split(',')
            .map(Number);
        if (rgb.length === 3) {
            rgb.push(255);
        } else {
            rgb[3] = Math.round(rgb[3] * 255);
        }
        return rgb;
    }

    static rgb_to_string(arr) {
        if (arr.length === 4) {
            return `rgba(${arr[0]},${arr[1]},${arr[2]},${arr[3]})`;
        }
        if (arr.length === 3) {
            return `rgb(${arr[0]},${arr[1]},${arr[2]})`;
        }
        return null;
    }

    static hexToRgb(hex) {
        // Remove the hash at the start if it's there
        const hexNoHash = hex.replace(/^#/, '');

        // Parse the r, g, b values
        const bigint = parseInt(hexNoHash, 16);
        const r = Math.floor(bigint / (256 * 256)) % 256;
        const g = Math.floor(bigint / 256) % 256;
        const b = bigint % 256;

        return [r, g, b];
    }

    static closestceilvalue(inArr, val) {
        // convert arr to numbers
        const arr = inArr.map(Number);
        let idx = Math.min.apply(
            null,
            arr.filter((v) => v >= val),
        );
        // If we come up with -Infinity, take the last value in the array
        if (idx === Infinity) {
            idx = arr[arr.length - 1];
        }
        return idx;
    }

    static closestfloorvalue(inArr, val) {
        // convert arr to numbers
        const arr = inArr.map(Number);
        let idx = Math.max.apply(
            null,
            arr.filter((v) => v <= val),
        );
        // If we come up with -Infinity, take the first value in the array
        if (idx === -Infinity) {
            [idx] = arr;
        }
        return idx;
    }

    static normalize(values, clevels, ctype) {
        // Get max and min color values from color config file
        // to normalize data
        // const t0 = performance.now();
        const max = Math.max(...clevels);
        const min = Math.min(...clevels);

        // Loop over values and store normalized values in nvalues
        const nvalues = new Float32Array(values.length);
        for (let i = 0; i < nvalues.length; i += 1) {
            nvalues[i] = gUtilities.normalize1D(values[i], max, min, clevels, ctype);
        }
        // console.log('Done', performance.now() - t0);

        return nvalues;
    }

    static formatValidTime(currentLayer) {
        const date = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };

        const outlookDays = {
            day1outlook: 0,
            day2outlook: 1,
            day3outlook: 2,
            day4outlook: 3,
            day5outlook: 4,
        };

        if (Object.keys(outlookDays).includes(currentLayer.dataType)) {
            const offset = outlookDays[currentLayer.dataType];
            const start = this.getCurrentDayAndHour(offset, offset !== 0);
            const endDate = new Date(date.setUTCDate(date.getUTCDate() + offset));
            endDate.setUTCHours(12);
            const end = this.formatSpcDate(endDate);
            return `${start} - ${end}`;
        }

        if (currentLayer.layerType === 'prcp' || currentLayer.layerType === 'temp') {
            const rangeOffset = currentLayer.range === '6-10' ? [6, 10] : [8, 14];
            const [startOffset, endOffset] = rangeOffset;
            const startDate = new Date(date.setUTCDate(date.getUTCDate() + startOffset));
            const endDate = new Date(date.setUTCDate(date.getUTCDate() + endOffset - startOffset));
            return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
        }

        return '';
    }

    static formatSpcDate(dateUTC) {
        // Ensure the input is a valid Date object
        if (!(dateUTC instanceof Date) || Number.isNaN(dateUTC)) {
            throw new Error('Input must be a valid Date object.');
        }

        // Add one day to the input date
        const nextDay = new Date(dateUTC);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        // Format the output as DD/1200Z
        const day = String(nextDay.getUTCDate()).padStart(2, '0'); // Ensure two digits
        const formattedOutput = `${day}/12Z`;

        return formattedOutput;
    }

    static getCurrentDayAndHour = (offset = 0, isStartAt12Z = false) => {
        const date = new Date();
        const adjustedDate = new Date(date);
        if (isStartAt12Z) {
            adjustedDate.setUTCDate(date.getUTCDate() + offset);
            adjustedDate.setUTCHours(12); // Set to 12Z for days 2 and 3
        } else {
            adjustedDate.setUTCDate(date.getUTCDate() + offset);
        }
        return `${String(adjustedDate.getUTCDate()).padStart(2, '0')}/${String(adjustedDate.getUTCHours()).padStart(2, '0')}Z`;
    };

    static normalize1D(value, max, min, clevels, ctype) {
        // Not sure if this top info is relevant anymore
        // For webGL if you have 3 colors, they change as followed
        // color:  Color1       Color2    Color3
        // value: 0 - 0.33    0.33-0.66   0.66-1

        // We don't have trouble interpolating to colors above the highest
        // and below the lowest clevels anymore.  This is becuase we linear
        // interpolate from the lowest two (or upper two) point in clevels.
        // Additionally, we don't cap the nvalues at 0 or 1.  That said,
        // if the scale is not linear, there could be problems interpolating
        // to points above the highest and below the lowest clevels.  I am not
        // really sure though

        // There is always one more color than there are levels
        // clevels [-2,2] would have [color1,color2,color3]

        if (Number.isNaN(value)) return NaN;

        let idx;
        // Get the closest two points
        if (value < min) {
            idx = 0;
        } else if (value >= max) {
            idx = clevels.length - 2;
        } else {
            idx = clevels.findIndex((d) => d > value) - 1;
        }

        const lnvalue = idx / (clevels.length - 1);
        const lvalue = clevels[idx];
        const unvalue = (idx + 1) / (clevels.length - 1);
        const uvalue = clevels[idx + 1];

        const fractionBetween = (value - lvalue) / (uvalue - lvalue);
        // fractionBetween = fractionBetween > 1 ? 1 : fractionBetween < 0 ? 0 : fractionBetween

        // Now we have a value between 0 and 1
        let nvalue = (1 - fractionBetween) * lnvalue + fractionBetween * unvalue;

        // When you are right on the threshold values, weird lines appear, these if() blocks prevent that
        // This shows up in precip but also difference fields of precip.  High threshold value give a
        // blocky look.  FMost fields have a value of 0.0. Really this only needs to be applied when going
        // from no shaded area (think precip) to a shaded area.  For now, it is applied to all levels
        if (ctype === 'threshold') {
            const threshold = 0.01;
            if (threshold > 0) {
                if (Math.abs(nvalue - lnvalue) < threshold) {
                    nvalue += threshold;
                }
                if (Math.abs(nvalue - unvalue) < threshold) {
                    nvalue -= threshold;
                }
            }
        }

        // But we need to sqeeze this between the range of the lowest and upper most color values
        let lowestColorValue;
        if (ctype === 'linear') {
            lowestColorValue = 1 / clevels.length / 2;
        } else {
            lowestColorValue = 1 / (clevels.length + 1);
        }
        const range = 1 - lowestColorValue * 2;

        nvalue = lowestColorValue + range * nvalue;

        // Don't cap the upper and lower value, this will help with interpolation
        // done in the fragment shader
        // However, values > 1 && < 0 are transparent in the fragment shader
        // So you have to cap!
        if (nvalue >= 0.999) {
            // value of 1 has weird lines using linear colorbar
            nvalue = 0.999;
        }
        if (nvalue <= 0.001) {
            // value of 0 has weird lines using linear colorbar
            nvalue = 0.001;
        }

        return nvalue;

        /*
        //Threshold colorbars
        let len=clevels.length+1

        let idx
        //Get the closest two points
        if ( value < min ){
            idx = 0
        }
        else if ( value >= max ){
            idx = clevels.length-2
        }
        else {
            idx = clevels.findIndex(d => d > value) - 1 
        }

        let lnvalue=(idx+1)/len
        let lvalue=clevels[idx]
        let unvalue=(idx+2)/len
        let uvalue=clevels[idx+1]

        let local_normalized_value = (value-lvalue)/(uvalue-lvalue)

        //let adj    = 
        let nvalue = lnvalue + local_normalized_value * (unvalue-lnvalue)

        //When you are right on the threshold values, weird lines appear, these if() blocks prevent that
        //This shows up in precip but also difference fields of precip.  High threshold value give a 
        //blocky look.  FMost fields have a value of 0.0. 
        let threshold = dic_fields[field]['plots']['normalizingAdjustment']
        if ( threshold > 0 ){
            if ( Math.abs(nvalue - lnvalue) < threshold ){
                nvalue += threshold
            }
            if ( Math.abs(nvalue - unvalue) < threshold ){
                nvalue -= threshold
            }
        }

        //Don't cap the upper and lower value, this will help with interpolation
        //done in the fragment shader
        // However, values > 1 && < 0 are transparent in the fragment shader
        if ( nvalue > 1 ){nvalue=1}
        if ( nvalue < 0 ){nvalue=0}
        //nvalue = Math.round(nvalue*1000)/1000
        
        return nvalue
        */
    }
}
