## NPM Notes for Creating and Managing Packages

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
        1. `cd wizard-graphics/library`
        2. `npm install -g yalc`
        3. `npm run build` in the the library project
        4. `yalc publish` in the library, which creates a tarball of the project in the yalc store
        5. `yalc add wizard-graphics` in the consuming project and then run `npm install`
        6. To update,
            - option 1 `npm run build`, `yalc publish`, `yalc update wizard-graphics`
            - option 2: `yalc publish --push` will publish the package to the store and propagate all changes to existing `yalc` package installations.
            - Then restart `npm run dev` on DESI and reload the webpage with 'empty cache and hard reload'
        7. To remove:
            ```bash
            yalc remove wizard-graphics
            npm install
            ```
