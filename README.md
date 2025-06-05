# DESI Graphics

An extension of of deck.gl along with other mapping tools.

## Getting Started

This is a monorepo setup using NPM Workspaces. The `/library` directory contains the `desi-graphics` package and the `/demo` directory contains the examples, which can be run with [Vite](https://vitejs.dev/).

In order for the basemaps to load in the examples, you need an [ESRI API key](https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/tutorials/migrate-to-api-key-credentials/). You can either set an environment variable:

```bash
export mapToken=<ESRI_API_KEY>
```

Or set `TOKEN` directly in `main.jsx`.

### To install dependencies:

```bash
# root directory
npm install
```

### To run the Vite dev server with examples:

```bash
# root directory
npm run dev
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
      "ticks": "linear"
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
