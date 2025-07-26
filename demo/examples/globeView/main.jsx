import React, { StrictMode, useMemo, useRef, useCallback, useReducer } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import {
  mapStyles,
  Maps,
  DeckGLOverlay,
  Readout,
  Legend,
  Projection,
  ContourLayer,
  ShadedLayer,
  VectorLayer,
  ParticleLayer,
  configFields,
} from 'desi-graphics';
import projDict from 'demo-data/projection';
import temperatures from 'demo-data/temp';
import wdir from 'demo-data/wdir';
import wmag from 'demo-data/wmag';
import { TerrainLayer } from 'deck.gl';
import { _TerrainExtension as TerrainExtension } from '@deck.gl/extensions';
import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'desi-graphics/desi-graphics.css';

const resLevel = 4;
const checkboxConfig = [
  { key: 'contourCheckbox', label: 'Contour Layer' },
  { key: 'contourLabels', label: 'Contour Labels', parent: 'contourCheckbox' },
  { key: 'shadedCheckbox', label: 'Shaded Layer' },
  { key: 'shadedInterpolateCheckbox', label: 'Interpolate Data', parent: 'shadedCheckbox' },
  { key: 'vectorCheckbox', label: 'Vector Layer' },
  { key: 'particleCheckbox', label: 'Particle Layer' },
  { key: 'terrainCheckbox', label: 'Terrain Layer' },
  { key: 'isGlobeView', label: 'Globe View' },
];

function MapContainer() {
  const { mapToken } = process.env;
  const style = useMemo(() => Object.keys(mapStyles)[0], []);
  const mapStyle = useMemo(() => Maps.loadMapStyle(style, mapToken), [style, mapToken]);

  const [state, dispatch] = useReducer(
    (s, { key, value }) => ({ ...s, [key]: value }),
    {
      contourCheckbox: true,
      contourLabels: true,
      shadedCheckbox: true,
      shadedInterpolateCheckbox: true,
      vectorCheckbox: false,
      particleCheckbox: false,
      terrainCheckbox: false,
      isGlobeView: true,
    }
  );

  const toggle = useCallback(
    (key) => (e) => dispatch({ key, value: e.target.checked }),
    []
  );

  const overlayRef = useRef();
  const mapContainer = useRef();
  const mapRef = useRef();

  const projection = useMemo(() => {
    const p = new Projection(projDict, resLevel);
    p.makeLonLatGrid();
    p.isGlobe = state.isGlobeView;
    return p;
  }, [state.isGlobeView]);

  const field = 't2';
  const { colors, colorLevels, contourLevels, colorType } = configFields[field].colorBars.default;

  const data = useMemo(
    () =>
      new Float32Array(
        Object.values(temperatures).map((v) => (v == null ? NaN : v))
      ),
    []
  );

  const terrainLayer = useMemo(
    () =>
      new TerrainLayer({
        id: 'terrain-layer',
        //texture: 'https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png',
        elevationData: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
        elevationDecoder: { rScaler: 256, gScaler: 1, bScaler: 0.00390625, offset: -32768 },
        visible: state.terrainCheckbox,
        //wireframe: true,
        strategy:'no-overlap',
        color: [255, 255, 255, 170],
        operation: 'terrain+draw',
        parameters: { depthTest: true },
        //onTileLoad: (tile) => console.log('Terrain tile loaded:', tile),
        //onTileError: (err) => console.error('Terrain tile error:', err),
      }),
    [state.terrainCheckbox]
  );

  const particleLayer = useMemo(() => {
  if (!state.particleCheckbox) return null;
  return new ParticleLayer({
    id: `particleLayer-${state.isGlobeView ? 'globe' : 'mercator'}`,
    //beforeId: mapStyles[style].beforeId,
    dataDir: wdir,
    dataMag: wmag,
    color: [0, 0, 0, 255],
    width: 1,
    numParticles: 10000,
    maxAge: 100,
    speedFactor: 2,
    animate: true,
    projection,
    //isGlobe: state.isGlobeView ? 1 : 0,
    parameters: { depthTest: true, depthCompare: 'always', cullMode: 'front' },
    readout: [
      { data: wmag, prependText: 'Wind Speed', units: 'mph', interpolate: true, decimals: 0 },
      { data: wdir, prependText: 'Wind Direction', units: '°', interpolate: true, decimals: 0 }
    ],
  });
}, [
  state.particleCheckbox,
  state.isGlobeView,
  projection,
  wdir,
  wmag,
  style
]);

  const layers = useMemo(() => {
    const result = [];
    if (state.terrainCheckbox) result.push(terrainLayer);
    if (state.shadedCheckbox)
      result.push(
        new ShadedLayer({
          id: `shadedLayer-${state.isGlobeView ? 'globe' : 'mercator'}-${state.shadedInterpolateCheckbox ? 'interp' : 'nointerp'}`,
          beforeId: mapStyles[style].beforeId,
          data,
          colors,
          colorLevels,
          colorType,
          projection,
          elevation:0,
          //extensions: [new TerrainExtension()],
          //terrainDrawMode:'drape',
          interpolateData: state.shadedInterpolateCheckbox,
          parameters: { depthTest:false, depthCompare: 'always', cullMode: 'back' },
          readout: [{ data, prependText: 'Mean Temperature', decimals: 0, units: '°F', interpolate: true }],
          legend: { type: 'staticBar', title: 'Temperature', units: '°F' },
        })
      );
    if (state.contourCheckbox)
      result.push(
        new ContourLayer({
          id: `contourLayer-${state.isGlobeView ? 'globe' : 'mercator'}`,
          beforeId: mapStyles[style].beforeId,
          data,
          colors,
          colorLevels,
          colorType,
          contourLevels,
          projection,
          elevation:0,
          //extensions: [new TerrainExtension()],
          //terrainDrawMode: 'drape',
          parameters: { depthTest:true, depthCompare: 'always', cullMode: 'back' },
          labels: { enabled: state.contourLabels, getSize: 14 },
          readout: [{ data, prependText: 'Mean Temperature', decimals: 0, units: '°F', interpolate: true }],
          legend: { type: 'staticBar', title: 'Temperature', units: '°F' },
        })
      );
    if (state.vectorCheckbox)
      result.push(
        new VectorLayer({
          id: `vectorLayer-${state.isGlobeView ? 'globe' : 'mercator'}`,
          beforeId: mapStyles[style].beforeId,
          dataDir: wdir,
          dataMag: wmag,
          projection,
          angleOffset: state.isGlobeView ? 180 : 0,
          parameters: { depthTest:false, depthCompare: 'always', cullMode: 'front' },
          readout: [
            { data: wmag, prependText: 'Wind Speed', decimals: 0, units: 'mph', interpolate: true },
            { data: wdir, prependText: 'Wind Direction', decimals: 0, units: '°', interpolate: true },
          ],
        })
      );
    if (state.particleCheckbox) result.push(particleLayer);

    return result;
  }, [
    state.terrainCheckbox,
    state.shadedCheckbox,
    state.shadedInterpolateCheckbox,
    state.contourCheckbox,
    state.contourLabels,
    state.vectorCheckbox,
    state.particleCheckbox,
    terrainLayer,
    particleLayer,
    data,
    colors,
    colorLevels,
    contourLevels,
    colorType,
    projection,
    style,
  ]);

  return (
    <>
      {checkboxConfig.map(({ key, label, parent }) =>
        !parent || state[parent] ? (
          <label key={key} htmlFor={key} className='checkbox-label'>
            <input id={key} type='checkbox' checked={state[key]} onChange={toggle(key)} />
            {label}
          </label>
        ) : null
      )}
      <div ref={mapContainer} id='mapContainer'>
        <Map
          //key={state.isGlobeView ? 'globe' : 'mercator'}
          initialViewState={{ longitude: -100.4, latitude: 37.8, zoom: 3 }}
          ref={mapRef}
          antialias
          mapStyle={mapStyle}
          projection={state.isGlobeView ? 'globe' : 'mercator'}
        >
          <DeckGLOverlay overlayRef={overlayRef} layers={layers} interleaved />
          <Readout mapContainer={mapContainer} overlayRef={overlayRef} title='Wed 06:00 am PST, Oct 21' />
          <Legend overlayRef={overlayRef} />
        </Map>
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MapContainer />
  </StrictMode>
);
