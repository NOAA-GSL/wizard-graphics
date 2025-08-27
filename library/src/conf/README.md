# Notes about the configuration files

The `index.js` file merges information from `configFieldsDefault.js` and `configFields.json` to create a master `configFields` object that can be consumed in other projects.

### 2025-8-20

- `configFields.js` was converted to a JSON file for continuity with DESI. This has no impact on the `desi-graphcis` library, but it allows Python files in the DESI backend to consume the same `configFields.json` file. This file gets copied over from DESI after extracting the DESI specific properties. It allows us to maintain one master config file that gets separated out for DESI and for desi-graphics.
- In the future, we could optionally keep all the configs in desi-graphics and copy the JSON files to the `/dist` folder for use by DESI.
