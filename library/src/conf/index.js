import { mergeWith, cloneDeep } from 'lodash';
import defaults from './configFieldsDefault';
import configFields from './configFields';

// Don't merge arrays, just use source value
function customizer(objValue, srcValue) {
    if (Array.isArray(objValue)) {
        return srcValue;
    }
    return undefined;
}

for (const field in configFields) {
    // If 'mergeWith' key available, merge with another field
    const mergeField = configFields[field].defaults;
    const mergeWithDict = mergeField === 'default' ? defaults : configFields[mergeField];
    configFields[field] = mergeWith(cloneDeep(mergeWithDict), configFields[field], customizer);
}

export { configFields, defaults as configFieldsDefaults };
