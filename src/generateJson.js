// generateJson.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = {
    hello: 'world',
    timestamp: new Date().toISOString(),
};

const outputPath = path.resolve(__dirname, 'generated.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`JSON file generated at ${outputPath}`);
