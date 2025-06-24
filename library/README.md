# DESI Graphics

An extension of of deck.gl along with other mapping tools.

## Getting Started

### To install:

```bash
npm install desi-graphics
```

## Library

### Maps

Maps.getStyles()
Maps.loadStyle()

## Usage

## `configFields`

Example of the properties contained in a weather field configuration:

```json
"dustFineSfc": {
  "defaults": "default", // could be a field like "t2"
  "colorBars": {
    "default": { // could also be `difference`, `spread`, `timing`, `percentage`, `paintball`
      "colorLevels": [0, 1, 25, ...],
      "colors": [
        "rgba(0,0,0,0)",
        "rgba(0,0,0,0)",
        "rgb(255, 240, 204)",
        ...
      ],
      "colorType": "scaleLinear", // scaleLinear, scaleThreshold
      "contourLevels": [5, 25, 50, ...],
      "isLeftCap": false,
      "tickAngle": -90,
      "ticks": "byColorLevels", // `byColorLevels`, `linear`
      "tickValues": []
    },
    "difference": {
      "colorLevels": [-2, -1, -0.75, -0.5, ...],
    },
    "spread": {
      "colorLevels": [0, 0.1, 0.25, 0.5, 0.75, 1],
    },
  },
  "colorPrimary": "rgb(200,153,100)", // for 1D chart
  "nameLegend": "Near Surface Fine Dust",
  "namePublic": "Near Surface Fine Dust",
  "nameShort": "Fine Dust",
  "roundto": 1,
  "roundtoReadout": 0,
  "units": "µg/m^3"
}
```

## Legend Properties

## Readout Properties

```js
const shadedLayer = new ShadedLayer({
  ...
  readout: [
    {
      // array - full data array
      data,
      // number - rounding of data in the readout
      decimals,
      // boolean - does readout use linear interpolated between points
      interpolate,
      // string - leading readout text such as `Mean Temperature`
      prependText,
      // string - will be appended to the end of the data value (ie `mph`)
      units,
      // function - this will alter the default readout text for the value. It takes `value` as
      // an argument and should return a string
      valueFormatter
    }
  ]
})
```
