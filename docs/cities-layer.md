# CitiesLayer

`CitiesLayer` renders city name labels with progressive disclosure and optional per-city data readouts.

## Data Contract

The layer consumes `cityList` as the source geometry/labels.

Supported `cityList` object shape:

1. Base city entry (required fields):
   - `name`: city label text
   - `lat`: latitude (`number` or numeric string)
   - `lon`: longitude (`number` or numeric string)

2. Population-aware entry (recommended):
   - `population`: population value (`number` or numeric string)
   - `ignorePopulation?`: optional boolean to bypass population filtering in disclosure

3. Optional metadata (passed through, not required by rendering):
   - Any additional fields are allowed.

Optional data label contract (`dataLabels` prop):

- `data`: scalar data array used for readout sampling.
- `readoutFunction`: function called as `(lat, lon, data, options)` to compute the value.
- `readoutOptions`: optional options object passed to `readoutFunction`.

## CitiesLayer Props

In addition to inherited `CompositeLayer`/`TextLayer` props, `CitiesLayer` supports:

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `cityList` | `Array<object>` | Yes | None | Source cities for progressive disclosure and label rendering. |
| `dataLabels` | `{ data, readoutFunction, readoutOptions }` | No | None | Enables second text layer with sampled values near each city using caller-supplied readout logic. |
| `isTiming` | `boolean` | No | `false` behavior when omitted | If true, data label values are treated as hours offset from `initDate`. |
| `initDate` | `string \| Date` | Conditional | None | Required when `isTiming` is true. |
| `settings` | `object` | Conditional | None | Required when `isTiming` is true (used by timing formatter). |
| `elevation` | `number` | No | `0` | Z elevation for rendered text. |
| `cityBaseScale` | `number` | No | `14` | Base city font scale before zoom/population adjustments. |
| `fontFamily` | `string` | No | `'Open Sans, sans-serif'` | Font family for city labels. |
| `billboard` | `boolean` | No | `true` | Billboard text toward camera. |
| `getTextAnchor` | `string` | No | `'middle'` | Horizontal text anchor. |
| `getAlignmentBaseline` | `string` | No | `'center'` | Vertical text anchor baseline. |
| `getPixelOffset` | `[number, number]` | No | `[0, 0]` | Pixel offset for text placement. |
| `characterSet` | `string \| string[]` | No | `'auto'` | Character set for glyph atlas generation. |
| `fontSettings` | `object` | No | `{ sdf: false, radius: 12, cutoff: 0.25, buffer: 10, smoothing: 0.2 }` | Glyph atlas options for text rendering. When halo mode is enabled, city and data label text force `sdf: false` to avoid per-glyph SDF clipping artifacts. |
| `outlineWidth` | `number` | No | `0` | Text outline width for built-in deck.gl SDF outlines. Ignored when halo mode is enabled. |
| `outlineColor` | `[number, number, number, number]` | No | `[0, 0, 0, 255]` | Text outline RGBA color. |
| `fontWeight` | `string \| number` | No | `'700'` | Font weight for labels. |
| `cityHaloEnabled` | `boolean` | No | `true` | Enables a second city-name text pass behind the main text to emulate outline/halo without SDF outlines. |
| `cityHaloColor` | `[number, number, number, number]` | No | `[0, 0, 0, 255]` | Halo color for city-name labels. |
| `cityHaloPixelRadius` | `number \| null` | No | `null` | Optional fixed halo radius in pixels for city-name labels. If `null`, halo radius is derived from rendered text size using `cityHaloSizeRatio`. |
| `cityHaloSizeRatio` | `number` | No | `0.03` | Ratio used to compute city halo radius from rendered city text size (`haloRadius = getSize * ratio`). |
| `cityHaloMinPixelRadius` | `number` | No | `0.25` | Minimum pixel radius clamp applied to computed city halo radius. |
| `cityHaloMaxPixelRadius` | `number` | No | `Infinity` | Maximum pixel radius clamp applied to computed city halo radius. |
| `dataLabelHaloEnabled` | `boolean` | No | `true` | Enables a second data-label text pass behind the main data-label text. |
| `dataLabelHaloColor` | `[number, number, number, number]` | No | `[0, 0, 0, 255]` | Halo color for data-label text. |
| `dataLabelHaloPixelRadius` | `number \| null` | No | `null` | Optional fixed halo radius in pixels for data-label text. If `null`, halo radius is derived from rendered data-label size using `dataLabelHaloSizeRatio`. |
| `dataLabelHaloSizeRatio` | `number` | No | `0.03` | Ratio used to compute data-label halo radius from rendered data-label size (`haloRadius = getSize * ratio`). |
| `dataLabelHaloMinPixelRadius` | `number` | No | `0.25` | Minimum pixel radius clamp applied to computed data-label halo radius. |
| `dataLabelHaloMaxPixelRadius` | `number` | No | `Infinity` | Maximum pixel radius clamp applied to computed data-label halo radius. |
| `getColor` | `Accessor<Color>` | No | `(x) => x.color || [255, 255, 255, 255]` | Text color accessor/value. |
| `getLabel` | `Accessor<string>` | No | `(x) => x.label` | Label accessor/value. |
| `getWeight` | `Accessor<number>` | No | `(x) => x.weight || 1` | Weight accessor/value. |
| `getPosition` | `Accessor<[number, number, number?]>` | No | `(x) => x.position` | Position accessor/value. |
| `parameters` | `object` | No | `{ depthCompare: 'always', cullMode: 'none' }` | GPU render-state overrides. |
| `id` | `string` | No | deck.gl generated layer id | Standard layer id override. |

Requirement rules:

1. `cityList` is always required.
2. Each city should include `name`, `lat`, and `lon`.
3. For stable progressive disclosure ranking, include numeric `population` (or numeric population strings).
4. If `dataLabels` is provided, include `data` and `readoutFunction`. `readoutOptions`
5. If `isTiming` is true, provide both `initDate` and `settings`.

## Notes

- City labels use RBush progressive disclosure to reduce overlap by zoom level.
- Disclosure spacing uses `cityBaseScale`, viewport scale, and precomputed `dys` thresholds.
- Labels are filtered to visible globe hemisphere using camera/view checks.
- If `dataLabels` is enabled, value labels are rendered in a second text layer and positioned above city names.
- City names and data labels now support halo rendering using multiple pixel-offset passes around the same glyph layout, which avoids SDF clipping and keeps long labels aligned.
- By default halo thickness scales with rendered text size, so changing `cityBaseScale` preserves visual outline proportion.
- `CitiesLayer` no longer assumes any projection shape internally for readout values; pass required grid/projection context through `dataLabels.readoutOptions`.
- City list trees are cached and rebuilt when city list length changes.
