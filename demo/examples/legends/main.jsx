/* eslint-disable react/no-unescaped-entities */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LegendStaticBar } from 'desi-graphics';

import './style.css';
import 'desi-graphics/desi-graphics.css';

function LegendContainer() {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'start',
                gap: '40px',
                margin: '40px',
            }}
        >
            <div className="legend-row">
                <LegendStaticBar
                    options={{
                        colors: ['#34a3aa00', '#eaaaba', '#af3013'],
                        colorLevels: [1, 2, 3],
                        colorType: 'scaleLinear',
                        title: 'Temperature',
                        units: '°F',
                        orient: 'horizontal',
                        barLength: 600,
                        thickness: 80,
                        axisStrokeWidth: 5,
                        tickStrokeWidth: 3,
                        ticks: 'linear',
                        tickAngle: -45,
                        tickLength: -20,
                        tickFontSize: 16,
                        tickFontWeight: 700,
                        tickPadding: 6,
                        isLeftCap: false,
                        isRightCap: false,
                        hideOuterTicks: true,
                        titleFontFamily: 'Helvetica, sans-serif',
                        titleFontSize: 24,
                        titleFontColor: 'pink',
                        titleJustify: 'left',
                        containerSx: {
                            border: '2px solid skyblue',
                            padding: '40px',
                            borderRadius: '10px',
                        },
                    }}
                />
                <ul>
                    <li>Left justified title (`titleJustify: 'left'`)</li>
                    <li>Remove outer ticks (`hideOuterTicks: true`)</li>
                    <li>
                        Add negative ticks (`tickLength: -20`) to create ticks <br /> inside the bar
                    </li>
                    <li>Increased `axisStrokeWidth` and `tickStrokeWidth`</li>
                    <li>Customized `tickFontWeight` and `tickFontSize`</li>
                    <li>Customized `containerSx` styles</li>
                </ul>
            </div>
            <div className="legend-row">
                <LegendStaticBar
                    options={{
                        colors: ['#34a3aa', '#eaaaba', '#af3013'],
                        colorLevels: [1, 2, 3],
                        colorType: 'scaleLinear',
                        title: 'Temperature',
                        units: '°F',
                        orient: 'vertical',
                        barLength: 400,
                        thickness: 40,
                        axisStrokeWidth: 0,
                        ticks: 'linear',
                        tickAngle: 0,
                        tickLength: 0,
                        tickPadding: 2,
                        titleFontFamily: 'Tahoma',
                        titleFontSize: 20,
                        titleFontWeight: 700,
                        titleFontColor: '#fefefe',
                        titleJustify: 'center',
                    }}
                />
                <ul>
                    <li>Vertical orientation</li>
                    <li>No axis line (`axisStrokeWidth: 0`) or ticks (`tickLength: 0`)</li>
                    <li>Customized `titleFontWeight`</li>
                </ul>
            </div>
            <div className="legend-row">
                <LegendStaticBar
                    options={{
                        colors: ['#d5d5d5ff', '#a090bbff', '#ab5eb0ff'],
                        colorLevels: [1, 2],
                        colorType: 'scaleThreshold',
                        orient: 'horizontal',
                        barLength: 400,
                        thickness: 60,
                        ticks: 'byColorLevels',
                        tickAngle: 45,
                        tickPadding: 10,
                        tickValues: ['hello', 'world'],
                        isLeftCap: true,
                        isRightCap: true,
                        titleFontFamily: 'Arial',
                        titleFontSize: 30,
                        titleFontColor: '#6ce4e4ff',
                        tickFontColor: '#f69782ff',
                        tickLength: 20,
                        tickFontSize: 24,
                        containerClassName: 'legend-class',
                    }}
                />
                <ul>
                    <li>No title</li>
                    <li>Custom tick values with angle (`tickValues: ['hello', 'world']`)</li>
                    <li>
                        Note: a `tickAngle` of 45 degrees will create the greatest visual gap <br />
                        between the text and the SVG boundary. This is because the text size <br />
                        measurement has to account for ascenders and descenders in the font.
                    </li>
                    <li>Added end caps (`isLeftCap: true`, `isRightCap: true`)</li>
                    <li>Customized `tickFontColor` and `tickFontSize`</li>
                    <li>Added `containerClassName` for custom CSS hover/click styles</li>
                </ul>
            </div>
        </div>
    );
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <LegendContainer />
    </StrictMode>,
);
