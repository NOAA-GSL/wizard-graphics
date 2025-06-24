import { useCallback, useEffect, useRef, useState } from 'react';
import { some } from 'lodash';
import deckUtilities from '../../utilities/deckUtilities';
import gUtilities from '../../utilities/graphicsUtilities';
import './Readout.css';

export default function Readout({ mapContainer, overlayRef, title, displayNum = 0 }) {
    const [readoutDivDisplay, setReadoutDivDisplay] = useState('none');
    const [rightClickMenu, setRightClickMenu] = useState({
        isOpen: false,
        readoutChecked: true,
        readoutLatLonChecked: false,
        top: '0px',
        left: '0px',
    });
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // eslint-disable-next-line no-underscore-dangle
    const layers = overlayRef?.current?._props?.layers;
    const rightClickMenuRef = useRef(null);

    // Update the readout data
    const { lon, lat, x, y } = position;
    let content;
    if (!lon || !lat || !x || !y || !layers) {
        content = null;
    } else {
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
            <div className="x4d-readout" style={{ display: readoutDivDisplay }}>
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
                    rightClickMenu.readoutLatLonChecked && <hr />
                }
                {
                    /* Conditional Rendering of lat/lon readoutDiv */
                    rightClickMenu.readoutLatLonChecked && (
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
        content = div;
    }

    const mouseOffset = {
        x: 5,
        y: 5,
    };

    const stopMouseMovePropagation = (event) => {
        event.stopPropagation();
    };

    const handleMouseMove = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            const viewport = deckUtilities.getViewport(overlayRef, displayNum);
            if (!viewport || rightClickMenu.isOpen) return null;

            const { offsetX, offsetY } = e;
            const [newLon, newLat] = viewport.unproject([offsetX, offsetY]);
            setPosition({ x: offsetX, y: offsetY, lon: newLon, lat: newLat });
            setReadoutDivDisplay('block');
            return null;
        },
        [displayNum, overlayRef, rightClickMenu.isOpen],
    );

    const rightClickMenuClose = () => {
        setTimeout(() => {
            setRightClickMenu((prevState) => ({ ...prevState, isOpen: false }));
            setReadoutDivDisplay('block');
        }, 100);
    };

    useEffect(() => {
        const overlayElement = mapContainer.current;

        const handleMouseLeave = () => {
            setReadoutDivDisplay('none');
        };

        const rightClickMenuOpen = (event) => {
            setRightClickMenu({
                ...rightClickMenu,
                isOpen: true,
                top: `${event.layerY + mouseOffset.y}px`,
                left: `${event.layerX + mouseOffset.x}px`,
            });
        };

        if (overlayElement) {
            overlayElement.addEventListener('contextmenu', rightClickMenuOpen, false);
            overlayElement.addEventListener('click', rightClickMenuClose, false);
            overlayElement.addEventListener('mousemove', handleMouseMove, false);
            overlayElement.addEventListener('mouseleave', handleMouseLeave, false);
        }
        return () => {
            if (overlayElement) {
                overlayElement.removeEventListener('contextmenu', rightClickMenuOpen, false);
                overlayElement.removeEventListener('click', rightClickMenuClose, false);
                overlayElement.removeEventListener('mousemove', handleMouseMove, false);
                overlayElement.removeEventListener('mouseleave', handleMouseLeave, false);
            }
        };
    }, [
        mapContainer,
        overlayRef,
        displayNum,
        rightClickMenu,
        mouseOffset.y,
        mouseOffset.x,
        handleMouseMove,
    ]);

    return (
        <div onMouseMove={stopMouseMovePropagation}>
            {/* Right Click Menu */}
            {rightClickMenu.isOpen && (
                <div
                    id="x4d-right-click-menu"
                    ref={rightClickMenuRef}
                    style={{
                        position: 'absolute',
                        top: rightClickMenu.top,
                        left: rightClickMenu.left,
                        display: 'block',
                        minWidth: '150px',
                    }}
                >
                    <div className="x4d-right-click-menu-div">
                        <label className="x4d-right-click-menu-label" htmlFor="x4d_data_readout">
                            <input
                                type="checkbox"
                                id="x4d_data_readout"
                                onChange={() => {
                                    setRightClickMenu({
                                        ...rightClickMenu,
                                        readoutChecked: !rightClickMenu.readoutChecked,
                                    });
                                }}
                                checked={rightClickMenu.readoutChecked}
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
                                    setRightClickMenu({
                                        ...rightClickMenu,
                                        readoutLatLonChecked: !rightClickMenu.readoutLatLonChecked,
                                    });
                                }}
                                checked={rightClickMenu.readoutLatLonChecked}
                            />
                            Lat/Lon Readout
                        </label>
                    </div>
                </div>
            )}
            {/* Readout */}
            {!rightClickMenu.isOpen && rightClickMenu.readoutChecked ? (
                <div
                    style={{
                        position: 'absolute',
                        top: position.y,
                        left: position.x,
                        pointerEvents: 'none',
                    }}
                >
                    {content}
                </div>
            ) : null}
        </div>
    );
}
