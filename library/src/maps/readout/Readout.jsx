import { useEffect, useRef, useState } from 'react';
import { some } from 'lodash';
import deckUtilities from '../../utilities/deckUtilities';
import gUtilities from '../../utilities/graphicsUtilities';
import './Readout.css';

export default function Readout({ mapContainer, overlayRef, title, displayNum = 0 }) {
    const [readoutDiv, setReadoutDiv] = useState({
        content: undefined,
    });
    const [readoutMenu, setReadoutMenu] = useState({
        display: 'none',
        readoutChecked: true,
        readoutLatLonChecked: false,
    });
    // eslint-disable-next-line no-underscore-dangle
    const layers = overlayRef?.current?._props?.layers;
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const rightClickMenuRef = useRef(null);

    // Update the readout data
    useEffect(() => {
        const { lon, lat, x, y } = position;
        if (!lon || !lat || !x || !y || !layers) return;

        // Gridded Readout
        const readoutArray = [];
        const uniqueArray = [];
        for (const layer of layers) {
            const { projection, readout } = layer.props;
            if (projection && readout) {
                for (const i in readout) {
                    // added value formatter to allow custom formatting (ie timing/paintball)
                    const { data, prependText, decimals, units, interpolate, valueFormatter } =
                        readout[i];
                    let value = gUtilities.getreadoutvalue(
                        lat,
                        lon,
                        projection,
                        data,
                        units,
                        interpolate,
                    );
                    // needed to add logic because values of 0 were being displayed as NaN
                    if (valueFormatter) {
                        value = valueFormatter(value);
                    } else {
                        value =
                            value !== undefined && value !== null && !Number.isNaN(value)
                                ? `${gUtilities.roundto(value, decimals)}${units}`
                                : 'NaN';
                    }
                    const key = `${prependText}-${value}-${interpolate}`;
                    if (!uniqueArray.includes(key)) {
                        uniqueArray.push(key);
                        readoutArray.push({ prependText, value });
                    }
                }
            }
        }

        // Sort by prependText
        readoutArray.sort((a, b) => a.prependText.localeCompare(b.prependText));
        const griddedReadout = readoutArray.map((d, i) => {
            const { prependText, value } = d;
            return (
                <tr key={i}>
                    <td>{`${prependText}: `}</td>
                    <td>{value}</td>
                </tr>
            );
        });
        // Done Gridded Readout

        // Pickable Readout
        const pickingArr = [];
        const objects = overlayRef.current.pickMultipleObjects({ x, y });
        for (const o in objects) {
            const object = objects[o];
            const pickingFunction = object.sourceLayer?.props?.pickingFunction;
            if (pickingFunction) {
                const { readout } = pickingFunction(object);
                // Don't allow duplicates
                if (!some(pickingArr, readout)) {
                    pickingArr.push(readout);
                }
            }
        }
        // Done Pickable Readout

        const div = (
            <div className="x4d-readout">
                {title}
                {
                    /* Conditional Rendering of extra HR for title */
                    title && <hr />
                }

                <table>
                    <tbody>{griddedReadout}</tbody>
                </table>

                {pickingArr.map((item, index) => (
                    <div key={index}>
                        <div>{item}</div>
                        {index < pickingArr.length - 1 && <br />}
                    </div>
                ))}

                {
                    /* Conditional Rendering of extra HR line */
                    readoutMenu.readoutLatLonChecked && <hr />
                }
                {
                    /* Conditional Rendering of lat/lon readoutDiv */
                    readoutMenu.readoutLatLonChecked && (
                        <table>
                            <tbody>
                                <tr>
                                    <td>{`Lat/Lon: ${lat.toFixed(2)}, ${lon.toFixed(2)}`}</td>
                                </tr>
                            </tbody>
                        </table>
                    )
                }
            </div>
        );
        setReadoutDiv((prevState) => ({ ...prevState, content: div }));
    }, [layers, overlayRef, position, readoutMenu.readoutLatLonChecked, title]);

    // Update the mouse position and display block/none
    // - before I had it query the readout data in here but the readout div was slow to move since
    // picking was being done.  Now the readout div is smooth and the data updates when it can
    useEffect(() => {
        const mouseOffset = {
            x: 5,
            y: 5,
        };

        // Update
        const handleMouseMove = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const viewport = deckUtilities.getViewport(overlayRef, displayNum);
            if (!viewport) return null;
            const x = e.offsetX;
            const y = e.offsetY;
            const [lon, lat] = viewport.unproject([x, y]);
            setPosition({ x, y, lon, lat });
            return null;
        };

        const handleMouseLeave = () => {
            setReadoutDiv((prevState) => ({ ...prevState, content: null }));
        };

        const rightClickMenuOpen = (event) => {
            setReadoutMenu({
                ...readoutMenu,
                display: 'block',
                top: `${event.layerY + mouseOffset.y}px`,
                left: `${event.layerX + mouseOffset.x}px`,
            });
            setReadoutDiv((prevState) => ({ ...prevState, display: 'none' }));
        };

        const rightClickMenuClose = () => {
            setTimeout(() => {
                setReadoutMenu((prevState) => ({ ...prevState, display: 'none' }));
                setReadoutDiv((prevState) => ({ ...prevState, display: 'block' }));
            }, 100);
        };

        const stopMouseMovePropagation = (event) => {
            event.stopPropagation();
        };

        const overlayElement = mapContainer.current;
        const rightClickMenuElement = rightClickMenuRef.current;

        if (overlayElement) {
            overlayElement.addEventListener('contextmenu', rightClickMenuOpen, false);
            overlayElement.addEventListener('click', rightClickMenuClose, false);
            overlayElement.addEventListener('mousemove', handleMouseMove, false);
            overlayElement.addEventListener('mouseleave', handleMouseLeave, false);
        }

        if (rightClickMenuElement) {
            rightClickMenuElement.addEventListener('mousemove', stopMouseMovePropagation);
        }

        return () => {
            if (overlayElement) {
                overlayElement.removeEventListener('contextmenu', rightClickMenuOpen);
                overlayElement.removeEventListener('click', rightClickMenuClose);
                overlayElement.removeEventListener('mousemove', handleMouseMove, false);
                overlayElement.removeEventListener('mouseleave', handleMouseLeave, false);
            }
            if (rightClickMenuElement) {
                rightClickMenuElement.removeEventListener('mousemove', stopMouseMovePropagation);
            }
        };
    }, [readoutMenu, mapContainer, overlayRef, displayNum]);

    return (
        <>
            {/* Right Click Menu */}
            <div
                id="x4d-right-click-menu"
                ref={rightClickMenuRef}
                style={{
                    position: 'absolute',
                    top: readoutMenu.top,
                    left: readoutMenu.left,
                    display: readoutMenu.display,
                    minWidth: '150px',
                }}
            >
                <div className="x4d-right-click-menu-div">
                    <label className="x4d-right-click-menu-label" htmlFor="x4d_data_readout">
                        <input
                            type="checkbox"
                            id="x4d_data_readout"
                            onChange={() => {
                                setReadoutMenu({
                                    ...readoutMenu,
                                    readoutChecked: !readoutMenu.readoutChecked,
                                });
                            }}
                            checked={readoutMenu.readoutChecked}
                        />
                        Sample
                    </label>
                </div>
                <div className="x4d-right-click-menu-div">
                    <label className="x4d-right-click-menu-label" htmlFor="x4d_latlon_readout">
                        <input
                            type="checkbox"
                            id="x4d_latlon_readout"
                            onChange={() => {
                                setReadoutMenu({
                                    ...readoutMenu,
                                    readoutLatLonChecked: !readoutMenu.readoutLatLonChecked,
                                });
                            }}
                            checked={readoutMenu.readoutLatLonChecked}
                        />
                        Lat/Lon Readout
                    </label>
                </div>
            </div>

            {/* Readout Div */}
            <div
                style={{
                    position: 'absolute',
                    top: position.y,
                    left: position.x,
                    pointerEvents: 'none',
                }}
            >
                {readoutMenu.display === 'none' && readoutDiv.content}
            </div>
        </>
    );
}
