# GpuContourLayer

`GpuContourLayer` renders visual contour strokes with WebGL2 and places sparse labels on the CPU. It is separate from `ContourLayer`.

## Usage

```js
import { GpuContourLayer } from '@noaa-gsl/wizard-graphics';

new GpuContourLayer({
    id: 'gpu-temperature-contours',
    data: temperatures,
    lonlatGrid,
    shape: [rows, cols],
    contourLevels: [20, 30, 40, 50, 60, 70, 80],
    colors: 'rgb(255, 255, 255)',
    lineWidth: 2,
    labels: { enabled: true, getSize: 14 },
});
```

## Data And Rendering

- Scalar values and coordinates must be index-aligned. Structured inputs are row-major.
- A flattened structured grid needs `shape: [rows, cols]`. Nested coordinate grids infer their shape; scalar data may also be nested.
- `triangulationMode: 'auto'` selects the existing quad-center mesh for structured grids, or Delaunay for unstructured points. `spherical` is available for periodic radar grids.
- Geometry is cached per layer state in a position texture. Data or contour-level changes update the scalar texture and triangle/threshold instance buffer without rebuilding compatible geometry. Treat data and coordinate inputs as immutable, and retain a stable layer `id`.
- The CPU schedules triangle/threshold pairs; the vertex shader computes their edge crossings from the raw scalar field. Each crossing segment is drawn as an expanded screen-space quad with round, antialiased caps. Stroke width remains in CSS pixels even when the source triangles are smaller than a pixel. Color mapping never changes contour positions.
- This implementation requires WebGL2, not WebGPU. It produces no stitched paths, polygons, or GeoJSON, and does not perform GPU readback.

## Layer Options

| Option              | Default                                        | Description                                                                                                                                                      |
| ------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`              | Required                                       | Array or typed array of scalar values; nested structured scalar arrays are also accepted. Missing/non-finite values mask triangles.                              |
| `lonlatGrid`        | `projection.lonlatGrid`                        | Flattened `[longitude, latitude]` points or a nested structured grid. Required if no projection grid is available.                                               |
| `projection`        | None                                           | Optional object with `lonlatGrid`, used when `lonlatGrid` is omitted.                                                                                            |
| `shape`             | Inferred for nested grids                      | `[rows, cols]`; provide it for flattened structured data. One-dimensional shapes use unstructured triangulation in `auto` mode.                                  |
| `triangulationMode` | `'auto'`                                       | `'auto'`, `'quadkey'`, `'spherical'`, or `'unstructured'`. Cell-constant modes are intentionally not supported.                                                  |
| `contourLevels`     | `colorLevels`                                  | Finite contour thresholds; sorted and deduplicated at Float32 precision. Maximum 2048 unique thresholds. Empty levels draw nothing.                              |
| `colors`            | Required                                       | Constant color string, one-element color array, or multi-color ramp. Uses the same color contract as `ContourLayer`.                                             |
| `colorLevels`       | None                                           | Multi-color ramp breakpoints; also the default contour thresholds. Required for multi-color ramps.                                                               |
| `colorType`         | None                                           | `'scaleLinear'` or `'scaleThreshold'`; required for multi-color ramps. Ignored for constant colors.                                                              |
| `lineWidth`         | `2`                                            | Stroke width in CSS pixels. Zero or negative width disables strokes without disabling labels.                                                                    |
| `elevation`         | `0`                                            | Vertex elevation in meters. Labels are anchored to the interpolated mesh surface.                                                                                |
| `labels`            | `{ enabled: false }`                           | Sparse-label configuration and forwarded `TextLayer` styling, detailed below.                                                                                    |
| `pickable`          | `false`                                        | Surface and text sublayers are non-pickable; use the library's scalar readout instead of path picking.                                                           |
| `parameters`        | `{ depthCompare: 'always', cullMode: 'back' }` | Render-state overrides, inherited by the surface. Back-face culling uses the source triangle's projected winding. Label parameters can be overridden separately. |
| `opacity`           | `1`                                            | Standard deck.gl layer opacity.                                                                                                                                  |
| `visible`           | `true`                                         | Standard deck.gl visibility.                                                                                                                                     |
| `id`                | deck.gl generated id                           | Use a stable logical-layer id to retain caches.                                                                                                                  |
| `beforeId`          | None                                           | MapLibre interleaved insertion position, inherited by sublayers.                                                                                                 |
| `readout`           | None                                           | Wizard Graphics readout entries; provide scalar `data`, `readoutFunction`, and `readoutOptions` as for the other scalar layers.                                  |
| `legend`            | None                                           | Wizard Graphics legend configuration, using the same color ramp as the layer.                                                                                    |

`lines`, `algorithm`, `getWidth`, `widthScale`, and `widthMinPixels` are not GPU-layer options. Use `lineWidth`, not the old path-layer width settings. Standard deck.gl layer props apply where supported by its custom shader pipeline; custom shader extensions require compatibility testing.

## Label Options

Labels do not require complete isolines. At most `maxCandidates` mesh triangles are sampled across the valid field, with one eligible threshold crossing per sampled triangle. Candidates prefer locally horizontal sections, then longer local segments. Their anchors are interpolated in viewport common space, matching the rendered triangle field. Candidate generation is cached until data, geometry, levels, or the candidate budget changes. Placement is refreshed for camera and prop changes.

Same-value and global RBush collision filters operate in screen pixels. This approximates the old sparse style, but does not reproduce its whole-component length priority, 10%-of-path slope smoothing, or per-component spacing. Some small components and levels may receive no label. Candidates are not full paths and are not exported as GeoJSON.

| `labels` Option        | Default                                                               | Description                                                                                                                |
| ---------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `enabled`              | `false`                                                               | Enable sparse CPU placement and `TextLayer` rendering. Disabled labels do no candidate work.                               |
| `maxCandidates`        | `4000`                                                                | Maximum sampled triangles/candidates. Increasing it can improve coverage but increases CPU work. Zero disables candidates. |
| `maxLabels`            | `200`                                                                 | Maximum accepted visible labels. Zero disables labels.                                                                     |
| `spacing`              | `350`                                                                 | Minimum axis-aligned screen separation for labels with the same value, in CSS pixels.                                      |
| `padding`              | `14`                                                                  | Minimum axis-aligned screen separation across all values, in CSS pixels. This is not glyph-bound-aware.                    |
| `getSize`              | `14`                                                                  | Text size; forwarded to `TextLayer`.                                                                                       |
| `getColor`             | `[245, 245, 245]`                                                     | Text color accessor, inherited from the existing contour-label style.                                                      |
| `getBackgroundColor`   | `[255, 255, 255, 150]`                                                | Optional text background color.                                                                                            |
| `getAngle`             | `0`                                                                   | Text angle; labels are upright by default.                                                                                 |
| `billboard`            | `true`                                                                | Face the camera.                                                                                                           |
| `background`           | `false`                                                               | Enable text backgrounds.                                                                                                   |
| `backgroundPadding`    | `[4, 1]`                                                              | Background padding in pixels.                                                                                              |
| `getTextAnchor`        | `'middle'`                                                            | Horizontal alignment.                                                                                                      |
| `getAlignmentBaseline` | `'center'`                                                            | Vertical alignment.                                                                                                        |
| `fontFamily`           | `'Helvetica'`                                                         | Text font.                                                                                                                 |
| `fontWeight`           | `'700'`                                                               | Text font weight.                                                                                                          |
| `fontSettings`         | `{ sdf: true, radius: 12, cutoff: 0.25, buffer: 10, smoothing: 0.2 }` | Font atlas settings, forwarded to `TextLayer`.                                                                             |
| `outlineWidth`         | `4`                                                                   | Text outline width.                                                                                                        |
| `outlineColor`         | `[0, 0, 0, 255]`                                                      | Text outline color.                                                                                                        |
| `parameters`           | `{ depthCompare: 'always', cullMode: 'none' }`                        | Label render-state overrides.                                                                                              |

Other standard `TextLayer` style props may be included in `labels`. The layer owns label `data`, `getPosition`, `getText`, and sublayer ids. Supplying complete contour lines is neither required nor supported.
