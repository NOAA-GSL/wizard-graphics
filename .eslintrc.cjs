module.exports = {
    root: true,
    env: { browser: true, es2020: true },
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    extends: [
        // 'eslint:recommended',
        // 'plugin:react/recommended',
        // 'plugin:react/jsx-runtime',
        // 'plugin:react-hooks/recommended',
        'airbnb',
        'airbnb/hooks',
        'prettier',
        'plugin:react/jsx-runtime', // Disallow missing React import when using JSX
    ],
    plugins: ['react-refresh', 'prettier'],
    rules: {
        'no-console': 'off',
        'no-restricted-syntax': ['error', 'WithStatement', "BinaryExpression[operator='in']"],
        'guard-for-in': 'off',
        'react/no-array-index-key': 'off',
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        // '*' turns off all files for now.  Can't get it working
        'import/no-unresolved': [2, { ignore: ['\\?url$', 'desi-graphics', 'demo-data'] }], // can't resolve ?url for some reason
        'react/prop-types': [0], // set to disabled
        'import/no-extraneous-dependencies': [
            'error',
            {
                devDependencies: true,
                optionalDependencies: true,
                peerDependencies: true,
                // deck.gl in in our package.json, but it's not in the root of our project
                // so we need to include it for checking dependencies
                packageDir: ['./', './node_modules/deck.gl'],
            },
        ],
    },
    ignorePatterns: ['dist/*'], // <<< ignore all files in dist folder
};
