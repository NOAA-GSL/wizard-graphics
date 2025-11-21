/* eslint-disable import/prefer-default-export */

// setting up canvas outside of function to prevent repeated creation
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');

/**
 * Measures the dimensions of a given text string using a canvas context.
 *
 * @param {string} text - The text to measure.
 * @param {string} font - The CSS font property string, e.g. '400 16px Open Sans'.
 *   Should be in the format: '[font-weight] [font-size] [font-family]'.
 *   Font weight can be omitted, a number (e.g., 400, 700) or a keyword (e.g., 'bold').
 * @param {number} [rotate=0] - Degrees to rotate the text before measuring (not commonly used).
 * @returns {TextMetrics} The TextMetrics object containing width and other properties.
 *
 * @example
 * const metrics = getTextDimensions('Legend', '700 14px Arial');
 * console.log(metrics.width);
 */
export function getTextDimensions(text, font, rotate = 0) {
    console.log('rotate:', rotate);
    context.save();
    context.font = font;
    const metrics = context.measureText(text);
    console.log('metrics:', metrics);
    const { width } = metrics;
    const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    // now we need to calculate the rotated width and height
    const radians = (rotate * Math.PI) / 180;
    const rotatedWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
    const rotatedHeight =
        Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
    context.restore();
    return { width: rotatedWidth, height: rotatedHeight };
}
