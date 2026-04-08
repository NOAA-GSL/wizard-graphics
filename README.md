# Wizard Graphics

An extension of of deck.gl along with other mapping tools.

## Getting Started

This is a monorepo setup using NPM Workspaces. The `/library` directory contains the `wizard-graphics` package and the `/demo` directory contains the examples, which can be run with [Vite](https://vitejs.dev/).

In order for the basemaps to load in the examples, you need an [ESRI API key](https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/tutorials/migrate-to-api-key-credentials/). You can either set an environment variable:

```bash
export mapToken=<ESRI_API_KEY>
```

Or set `TOKEN` directly in `main.jsx`. However, this is not recommended.

### To install dependencies:

_**Note:** Following commands are all from the root directory_

1. Install `npm` packages

    ```bash
    npm install
    ```

2. Build the `wizard-graphics` package

    ```bash
    npm run build
    ```

    - This only needs to be done once after cloning the repo. But if any changes are made to files in `/library` that need to be reflected in the demo project, a new build must be created. Alternatively, run the command below to build after every save

    ```bash
    npm run build:dev
    ```

### To run the Vite dev server with examples:

```bash
# root directory or /demo
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

# NPM Notes for Creating and Managing Packages

- Here are the steps needed to create an NPM package and push from the console. This is the manual process, but it can be automated from GitHub or wherever the repo is managed. This assumes using Vite in [Library Mode](https://vite.dev/guide/build#library-mode)

1. Build the `/dist` folder with Vite using `npm run build`
2. Login to account with `npm login`
    - Can also use `npm adduser` and login with browser
3. Can double-check with `npm whoami`
4. Make sure the version number is changing from the previously published version
    - Instead of doing a manual version update to the patch number:

    ```bash
    # this will bump the patch version by 1 in the package.json and package-lock.json
    # run from /library
    npm version patch
    ```

5. Run
    ```bash
    # run from /library
    npm publish
    ```

## Testing locally

1. Using `npm link` in the library and consuming projects as discussed above
    - This can be a pain in the butt because of dependency conflicts. Since `wizard-graphics` installs it's own packages for the demo examples, this can conflict with the consuming repo
2. Using `npm yalc` or `Verdaccio` which serve as local npm deployments
    - The `yalc` approach:
        1. `npm install -g yalc`
        2. `npm run build` in the the library project
        3. `yalc publish` in the library, which creates a tarball of the project in the yalc store
        4. `yalc add wizard-graphics` in the consuming project and then run `npm install`
        5. To update,
            - option 1 `npm run build`, `yalc publish`, `yalc update wizard-graphics`
            - option 2: `yalc publish --push` will publish the package to the store and propagate all changes to existing `yalc` package installations.
            - Then restart `npm run dev` on Wizard Graphics and reload the webpage with 'empty cache and hard reload'
        6. To remove:
            ```bash
            yalc remove wizard-graphics
            npm install
            ```
