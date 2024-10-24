import { useEffect, useRef, useState } from 'react';
import deckUtilities from '../../utilities/deckUtilities';
import gUtilities from '../../utilities/graphicsUtilities';
import './Readout.scss';

export default function Readout({ layers, mapContainer, overlayRef, title, displayNum = 0 }) {
    const [readoutDiv, setReadoutDiv] = useState({
        content: undefined,
    });
    const [readoutMenu, setReadoutMenu] = useState({
        display: 'none',
        readoutChecked: true,
        readoutLatLonChecked: false,
    });
    const rightClickMenuRef = useRef(null);

    useEffect(() => {
        const mouseOffset = {
            x: 5,
            y: 5,
        };

        const handleMouseMove = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const viewport = deckUtilities.getViewport(overlayRef, displayNum);
            if (!viewport) return null;
            const x = e.offsetX;
            const y = e.offsetY;
            const [lon, lat] = viewport.unproject([x, y]);

            console.log('overlayref', overlayRef.current.pickMultipleObjects({ x, y }));

            const readoutArray = [];
            const uniqueArray = [];
            for (const layer of layers) {
                const { projection, readout } = layer.props;
                if (projection && readout) {
                    for (const i in readout) {
                        const { data, prependText, decimals, units, interpolate } = readout[i];
                        let value = gUtilities.getreadoutvalue(
                            lat,
                            lon,
                            projection,
                            data,
                            units,
                            interpolate,
                        );
                        value = value ? `${gUtilities.roundto(value, decimals)}${units}` : 'NaN';
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

            const readoutContent = readoutArray.map((d, i) => {
                const { prependText, value } = d;
                return (
                    <tr key={i}>
                        <td>{`${prependText}: `}</td>
                        <td>{value}</td>
                    </tr>
                );
            });

            const div = (
                <div
                    className="x4d-readout"
                    style={{
                        position: 'relative',
                        left: x + mouseOffset.x,
                        top: y + mouseOffset.y,
                        pointerEvents: 'none',
                    }}
                >
                    {title}
                    {
                        /* Conditional Rendering of extra HR for title */
                        title && <hr />
                    }

                    <table>
                        <tbody>{readoutContent}</tbody>
                    </table>

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
            setReadoutDiv({ ...readoutDiv, content: div });
            // Your logic here
        };

        const handleMouseLeave = () => {
            setReadoutDiv({ ...readoutDiv, content: null });
        };

        const rightClickMenuOpen = (event) => {
            setReadoutMenu({
                ...readoutMenu,
                display: 'block',
                top: `${event.layerY + mouseOffset.y}px`,
                left: `${event.layerX + mouseOffset.x}px`,
            });
            setReadoutDiv({ ...readoutDiv, display: 'none' });
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
    }, [readoutDiv, readoutMenu, mapContainer, overlayRef, displayNum, layers, title]);

    return (
        <>
            <div
                id="x4d-right-click-menu"
                ref={rightClickMenuRef}
                style={{
                    position: 'absolute',
                    display: readoutMenu.display,
                    top: readoutMenu.top,
                    left: readoutMenu.left,
                    width: '150px',
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
            {readoutMenu.display === 'none' && readoutDiv.content}
        </>
    );
}
