import js from '@eslint/js';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-plugin-prettier/recommended';
import { defineConfig, globalIgnores } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

const sharedRules = {
    'react/react-in-jsx-scope': 'off',
    'react/jsx-no-target-blank': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/no-array-index-key': 'warn',
    'react/prop-types': 'off',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'no-console': ['warn', { allow: ['debug', 'error'] }],
    'no-unused-expressions': ['error', { allowTernary: true }],
    camelcase: 'off',
    'import/no-unresolved': ['error', { caseSensitive: true }],
};

const sharedSettings = {
    react: {
        version: 'detect',
    },
    'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
    'import/resolver': {
        typescript: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'] },
        alias: {
            map: [['demo-data', path.join(workspaceRoot, 'demo/examples/demo-data')]],
            extensions: ['.js', '.jsx', '.json'],
        },
    },
};

export default defineConfig([
    globalIgnores(['**/dist', '**/node_modules', '**/vite.config*.js']),
    {
        files: ['**/*.{js,jsx}'],
        extends: [
            js.configs.recommended,
            react.configs.flat.recommended,
            reactHooks.configs['recommended-latest'],
            reactRefresh.configs.vite,
            prettierConfig,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: { ...globals.browser, process: 'readonly' },
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        rules: sharedRules,
        plugins: {
            import: importPlugin,
        },
        settings: sharedSettings,
    },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            react.configs.flat.recommended,
            reactHooks.configs['recommended-latest'],
            reactRefresh.configs.vite,
            prettierConfig,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        rules: {
            ...sharedRules,
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'error',
        },
        plugins: {
            import: importPlugin,
        },
        settings: sharedSettings,
    },
]);
