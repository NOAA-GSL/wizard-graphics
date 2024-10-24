import React from 'react';
import { createRoot } from 'react-dom/client';
import './main.scss';
function App() {
    const { mapToken } = process.env;
    return (
        <div>
            <h1> Welcome to DESI Graphics!</h1>
            {!mapToken && (
                <div>
                    <p>
                        To run this example, you need a{' '}
                        <a href="https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/tutorials/migrate-to-api-key-credentials/">
                            ESRI API key (legacy)
                        </a>
                        . Then set as an environment variable:
                    </p>
                    <pre>
                        <code>export mapToken=&lt;ESRI_API_KEY&gt;</code>
                    </pre>
                </div>
            )}
            <ul>
                <li>
                    <a href="examples/basemap/index.html">Basemap Example</a>
                </li>
                <li>
                    <a href="examples/griddedLayers/index.html">Gridded Layers Examples</a>
                </li>
                <li>
                    <a href="examples/otherLayers/index.html">Other Layers Examples</a>
                </li>
            </ul>
        </div>
    );
}

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<App />);
