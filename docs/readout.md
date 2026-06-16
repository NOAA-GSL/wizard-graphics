# Readout

`Readout` is the hover readout component used by Wizard maps. It samples data from layer `readout` configs and renders text near the cursor

Source files:

- `library/src/maps/readout/Readout.jsx`
- `library/src/maps/readout/readoutFunctions.js`

Example integration:

- `demo/examples/globeView/main.jsx`

## Imports

From the package:

```js
import { Readout, readoutFunction } from '@noaa-gsl/wizard-graphics';
```

## Component Props

`Readout` accepts these props:

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `mapContainer` | `React ref` | Yes | None | Ref to the container DOM element that receives mouse events. |
| `overlayRef` | `React ref` | Yes | None | Ref to `DeckGLOverlay` (MapLibre path) or `DeckGL` (Deck-only path). |
| `title` | `string` | No | `undefined` | Optional text shown at the top of the readout box. |
| `views` | `Array<object>` | No | `['placeholder']` | Used to align readout placement across multi-view layouts. |

## Layer Readout Contract

`Readout.jsx` looks for `readout` on each layer:

```js
readout: [
  {
    data,
    readoutFunction,
    readoutOptions,
  },
]
```

Each item should return display-ready text from `readoutFunction(...)`. `Readout` de-duplicates identical strings and sorts them before rendering.

## Built-In `readoutFunction`

`readoutFunction` from `@noaa-gsl/wizard-graphics` is a wrapper around the samplers in `readoutFunctions.js`:

- `griddedReadout`
- `sphericalReadout`
- `unstructuredReadout`

It formats output as:

`"<prependText>: <roundedValue><units>"`

Common `readoutOptions`:

| Option | Type | Required | Notes |
| --- | --- | --- | --- |
| `readoutType` | `'gridded' \| 'spherical' \| 'unstructured'` | Yes | Chooses sampler path. |
| `dataType` | `'scalar' \| 'vector'` | No | Used by gridded sampler (`vector` applies direction-safe interpolation). |
| `projection` | object | Gridded | Projection instance used for ij conversion. |
| `lonlatGrid` | `Array<[lon, lat]>` | Spherical/Unstructured | Coordinate array used for nearest/triangle lookup. |
| `shape` | `[rows, cols]` | Spherical structured | Grid shape metadata. |
| `triangulationMode` | string | No | Used by spherical sampler modes. |
| `interpolate` | boolean | No | Enables interpolation when sampler supports it. |
| `prependText` | string | No | Label prefix, for example `Temperature`. |
| `units` | string | No | Suffix, for example `F`, `mph`, `deg`. |
| `decimals` | number | No | Rounding precision. |

## Example: GlobeView Pattern

This is the same pattern used in `demo/examples/globeView/main.jsx`.

```js
const readoutType = projDict
  ? 'gridded'
  : currentDataset === 'Radar'
    ? 'spherical'
    : 'unstructured';

const baseReadoutOptions = {
  projection,
  lonlatGrid,
  shape,
  readoutType,
  dataType: 'scalar',
  interpolate: shouldInterpolateReadout,
  triangulationMode: state.triangulationMode,
  units: dataUnits,
  prependText: dataLabel,
  decimals: 0,
};

new ShadedLayer({
  ...,
  readout: [
    {
      data,
      readoutFunction,
      readoutOptions: baseReadoutOptions,
    },
  ],
});

new VectorLayer({
  ...,
  readout: [
    {
      data: wmag,
      readoutFunction,
      readoutOptions: {
        ...baseReadoutOptions,
        prependText: 'Wind Speed',
        units: 'mph',
      },
    },
    {
      data: wdir,
      readoutFunction,
      readoutOptions: {
        ...baseReadoutOptions,
        prependText: 'Wind Direction',
        units: 'deg',
      },
    },
  ],
});
```

## Mounting `Readout`

MapLibre + `DeckGLOverlay` path:

```jsx
<DeckGLOverlay overlayRef={overlayRef} layers={layers} interleaved />
<Readout
  mapContainer={mapContainer}
  overlayRef={overlayRef}
  title="Wed 06:00 am PST, Oct 21"
/>
```

Deck-only path:

```jsx
<DeckGL ref={deckRef} layers={layers} controller>
  <Readout
    mapContainer={mapContainer}
    overlayRef={deckRef}
    title="Wed 06:00 am PST, Oct 21"
  />
</DeckGL>
```

## Runtime Behavior

- Readout hides when cursor leaves the map container.
- Right-click opens a small menu with:
  - `Sample` toggle (readout on/off)
  - `Lat/Lon Readout` toggle
- Pick-based messages from layer `pickingFunction` are shown below sampled readout values.

## Troubleshooting

If no readout appears:

1. Verify `Readout` is mounted and receives valid `mapContainer` and `overlayRef` refs.
2. Verify at least one visible layer defines `readout` with `data`, `readoutFunction`, and `readoutOptions`.
3. Confirm `readoutOptions.readoutType` matches your dataset layout.
4. Confirm `projection`, `lonlatGrid`, and `shape` (when required) are populated.
5. If values show as `NaN`, inspect the raw data and `decimals/units` formatting inputs.
