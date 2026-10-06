# ContourLayer

`ContourLayer` renders scalar contour isolines and optional contour labels.

## Data Contract

For generated contours, the layer uses scalar `data` and grid geometry from `lonlatGrid` (or `projection.lonlatGrid` when `lonlatGrid` is omitted).

Supported `lonlatGrid` layouts:

1. Flattened structured grid (preferred):
    - `lonlatGrid`: 1D array of `[lon, lat]`
    - `shape`: `[rows, cols]` (required for `marchingSquares` on flattened grids)
    - `data`: 1D array of scalar values in row-major/index-aligned order
    - Works with `algorithm` `marchingTriangles` or `marchingSquares` but `marchingSquares` is much faster

2. Unstructured point list:
    - `lonlatGrid`: 1D array of `[lon, lat]`
    - `data`: 1D array of scalar values aligned by index
    - Works with `algorithm` `marchingTriangles`

Color ramp contract:

- `colors`: either an array of `rgb(...)`/`rgba(...)` strings, or a single color string.
- `colorLevels`: numeric breakpoints.
- `colorType`: `scaleLinear` or `scaleThreshold`.
- `contourLevels` controls isoline values and defaults to `colorLevels` when omitted.

## ContourLayer Props

In addition to inherited layer props, `ContourLayer` supports:

| Prop             | Type                                                                        | Required    | Default                                        | Notes                                                                                                       |
| ---------------- | --------------------------------------------------------------------------- | ----------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `data`           | `ArrayLike<number>`                                                         | Conditional | None                                           | Required when `lines` is not provided. Scalar field values used for contour generation.                     |
| `lonlatGrid`     | `Array<[number, number]> \| Array<Array<[number, number]>>`                 | Conditional | Uses `projection.lonlatGrid` when available    | Required when `lines` is not provided and no projection grid is supplied.                                   |
| `projection`     | `{ lonlatGrid: Array<[number, number]> \| Array<Array<[number, number]>> }` | Conditional | None                                           | Optional fallback grid source when `lonlatGrid` is omitted.                                                 |
| `colors`         | `string[] \| string`                                                        | Yes         | None                                           | Multi-color ramp or a single constant contour color.                                                        |
| `colorLevels`    | `number[]`                                                                  | Conditional | None                                           | Required for multi-color ramps, and also used as default contourLevels when contourLevels is omitted.       |
| `colorType`      | `'scaleLinear' \| 'scaleThreshold'`                                         | Conditional | None                                           | Required for multi-color ramps. Ignored in single-color mode.                                               |
| `contourLevels`  | `number[]`                                                                  | No          | `colorLevels`                                  | Isoline values to generate.                                                                                 |
| `lines`          | `FeatureCollection`                                                         | No          | None                                           | Optional precomputed contour lines. If provided, generation from `data` is skipped.                         |
| `algorithm`      | `'marchingTriangles' \| 'marchingSquares'`                                  | No          | `'marchingTriangles'`                          | Contour generation algorithm.                                                                               |
| `shape`          | `[number, number]`                                                          | Conditional | None                                           | Required for `marchingSquares` when using flattened 1D `lonlatGrid`.                                        |
| `labels`         | `{ enabled?: boolean, ...labelProps }`                                      | No          | Disabled                                       | Enables contour labels when `labels.enabled` is truthy. Additional fields are forwarded to `ContourLabels`. |
| `elevation`      | `number`                                                                    | No          | `0`                                            | Z elevation applied to contour vertices and labels.                                                         |
| `widthUnits`     | `'meters' \| 'common' \| 'pixels'`                                          | No          | `'meters'`                                     | Inherited path-layer width units. Use `'pixels'` for screen-space stroke widths.                            |
| `widthScale`     | `number`                                                                    | No          | `30`                                           | Line width scale for rendered contours.                                                                     |
| `widthMinPixels` | `number`                                                                    | No          | `2`                                            | Minimum line width in pixels.                                                                               |
| `getWidth`       | `number \| Accessor<number>`                                                | No          | `10`                                           | Base line width accessor/value.                                                                             |
| `pickable`       | `boolean`                                                                   | No          | `false`                                        | Picking on contour paths (disabled by default for performance).                                             |
| `parameters`     | `object`                                                                    | No          | `{ depthCompare: 'always', cullMode: 'back' }` | GPU render-state overrides.                                                                                 |
| `id`             | `string`                                                                    | No          | deck.gl generated layer id                     | Standard layer id override.                                                                                 |

Requirement rules:

1. `colors` is required.
2. For multi-color ramps, provide `colorLevels` and `colorType`.
3. For single-color mode, provide `contourLevels` (or `colorLevels`) to define the contour values.
4. Provide either `lines`, or provide generated contour inputs (`data` plus grid source via `lonlatGrid` or `projection.lonlatGrid`).
5. If using `marchingSquares` with flattened 1D `lonlatGrid`, provide `shape` as `[rows, cols]`.
6. If `contourLevels` is omitted, `colorLevels` is used as the contour level set.

## Performance

- Use `algorithm: 'marchingSquares'` for structured grids; `marchingTriangles` is intended for unstructured points and adds Delaunay triangulation work.
- Contour extraction is cached in the layer state. It reruns when `data`, the effective grid, `shape`, `algorithm`, or contour level values change, or deck.gl reports a data change.
- Changing labels, line widths, visibility, readout, or legend props reuses both extracted lines and styled paths. Changing colors, color scale settings, or elevation rebuilds styled paths without rerunning extraction. When `contourLevels` is omitted, changing `colorLevels` also changes the extracted contours.
- Keep a stable `id` for the same logical layer so deck.gl can transfer cached state between layer instances. Keep `data` and `lonlatGrid` references stable when their contents are unchanged. Treat these inputs as immutable and replace them when their contents change.
- Equivalent `shape`, `contourLevels`, `colorLevels`, and `colors` arrays do not invalidate the cache just because a new array was created.
- Marching squares scans the grid for every contour level. Fewer `contourLevels` or a coarser input grid reduce extraction time, at the cost of contour density or spatial detail.

## Notes

- `marchingTriangles` uses Delaunay-based triangulation for contour extraction and is much slower than `marchingSquares`.
- `marchingSquares` uses grid contouring and expects resolvable grid dimensions.
- The rendered line geometry is emitted as `PathLayer` paths built from contour `MultiLineString` coordinates.
- Label rendering is optional and handled by a `ContourLabels` sublayer when enabled.
