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
                // This tells ESLint to look for package.json in both root and subfolders
                packageDir: ['.', './library', './demo'],
            },
        ],
    },
    ignorePatterns: ['dist/*'], // <<< ignore all files in dist folder
};
