const defaults = {
    // The default configuration
    defaults: 'default',
    // Colorbars
    colorBars: {
        // Default colorbar
        default: {
            // Colors in rgb or rgba
            colors: [
                'rgb(0,0,255)',
                'rgb(50,0,205)',
                'rgb(100,0,155)',
                'rgb(150,0,105)',
                'rgb(200,0,55)',
                'rgb(255,0,0)',
            ],
            // Color values corresponding to the colors
            colorLevels: [20, 40, 60, 80, 100],
            // Color scale type, 'scaleLinear' or 'scaleThreshold'
            colorType: 'scaleThreshold',
            // Contour values
            contourLevels: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
            // Cap on the left/bottom side of legend
            isLeftCap: true,
            // Cap on the right/top side of legend
            isRightCap: true,
            // tick placement on legend, 'linear'=linear or 'byColorLevels'=by color values
            ticks: 'linear',
        },
        // Difference colorbar
        difference: {
            colors: [
                'rgb(0,0,70)',
                'rgb(36,56,119)',
                'rgb(68,106,161)',
                'rgb(100,152,195)',
                'rgb(132,185,216)',
                'rgb(164,207,228)',
                'rgba(194,227,239,200)',
                'rgba(255,255,255,0)',
                'rgba(254,195,118,200)',
                'rgb(252,163,95)',
                'rgb(247,128,76)',
                'rgb(234,93,59)',
                'rgb(199,61,41)',
                'rgb(148,29,24)',
                'rgb(84,0,0)',
            ],
            colorLevels: [-14, -12, -10, -8, -6, -4, -2, 2, 4, 6, 8, 10, 12, 14],
            colorType: 'scaleThreshold',
            contourLevels: [-14, -12, -10, -8, -6, -4, -2, 2, 4, 6, 8, 10, 12, 14],
            isLeftCap: true,
            isRightCap: true,
            ticks: 'byColorLevels',
        },
        // Spread colorbar
        spread: {
            colors: [
                'rgba(0,0,0,0)',
                'rgba(0,0,0,0)',
                'rgba(255,239,3,0.5)',
                'rgb(255,195,3)',
                'rgb(255,87,51)',
                'rgb(190,0,0)',
                'rgb(88,24,70)',
            ],
            colorLevels: [0, 2, 4, 6, 8, 10],
            colorType: 'scaleThreshold',
            contourLevels: [0, 2, 4, 6, 8, 10],
            isLeftCap: false,
            isRightCap: true,
            ticks: 'byColorLevels',
        },
        // Timing colorbar
        timing: {
            colors: ['rgba(0,0,0,0)', 'rgb(16, 89, 140)', 'rgb(250, 247, 179)'],
            colorLevels: undefined, // Defined in X4D.jsx
            colorType: 'scaleThreshold',
            contourLevels: undefined, // Defined in X4D.jsx
            isLeftCap: false,
            isRightCap: true,
            ticks: 'byColorLevels',
        },
        // Percentage colorbar
        percentage: {
            colors: [
                'rgba(0,0,0,0)',
                'rgb(10,5,30)',
                'rgb(30,14,80)',
                'rgb(50,32,150)',
                'rgb(174,48,91)',
                'rgb(218,78,59)',
                'rgb(241,114,29)',
                'rgb(251,158,7',
                'rgb(250,187,33)',
                'rgb(248,224,55)',
                'rgb(255,255,150)',
                'rgb(255,255,150)',
            ],
            colorLevels: [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
            colorType: 'scaleThreshold',
            contourLevels: [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
            isLeftCap: true,
            isRightCap: false,
            ticks: 'byColorLevels',
        },
        // Paintball colorbar
        paintball: {
            // If we want to support more than 14 members in paintball, update colors here
            colors: [
                'rgb(229,153,255)',
                'rgb(131,71,153)',
                'rgb(165,191,229)',
                'rgb(32,62,153)',
                'rgb(239,138,139)',
                'rgb(205,61,50)',
                'rgb(164,239,165)',
                'rgb(67,128,7)',
                'rgb(255,255,0)',
                'rgb(150,150,0)',
                'rgb(255,161,0)',
                'rgb(255,204,118)',
                'rgb(1,255,190)',
                'rgb(0,117,87)',
            ],
            colorLevels: [], // levels & contours set dynamically in X4d.jsx
            colorType: 'scaleThreshold',
            contourLevels: [], // levels & contours set dynamically in X4d.jsx
            isLeftCap: true,
            isRightCap: false,
            ticks: 'byColorLevels',
        },
    },
    colorPrimary: 'rgb(0,0,255)',
    isZeroLowerBound: false,
    nameLegend: 'Default Name',
    namePublic: 'Default Name',
    nameShort: 'Default Name',
    roundto: 1,
    roundtoReadout: 1,
    units: '',
};

export default defaults;
