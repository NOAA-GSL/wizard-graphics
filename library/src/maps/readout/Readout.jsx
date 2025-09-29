/* eslint-disable no-underscore-dangle */
import { useCallback, useEffect, useRef, useState } from 'react';
import { some } from 'lodash';
import gUtilities from '../../utilities/graphicsUtilities';
import './Readout.css';

const MOUSE_OFFSET = { x: 10, y: 10 };
const CIRCLE_RADIUS = 5;

// note about `views` prop:
// this is only used for the length of the array to match the readout with the correct viewport
export default function Readout({ mapContainer, overlayRef, title, views = ['placeholder'] }) {
    const [readoutDivDisplay, setReadoutDivDisplay] = useState('none');
    const [rightClickMenu, setRightClickMenu] = useState({
        isOpen: false,
        readoutChecked: true,
        readoutLatLonChecked: false,
        top: '0px',
        left: '0px',
    });

    // position & picking results that drive what we render
    const [position, setPosition] = useState({ x: 0, y: 0, lon: 0, lat: 0 });
    const [pickResults, setPickResults] = useState([]); // results from pickMultipleObjects

    // Refs for stable access inside handler
    const rafRef = useRef(null);
    const lastMouseRef = useRef({ x: null, y: null });

    const buildGriddedReadout = (lon, lat, displayNum, layers) => {
        if (lon == null || lat == null || !layers) return [];
        const readoutArray = [];
        const uniqueArray = [];
        for (const layer of layers) {
            const { projection, readout, displaynum } = layer.props || {};
            if (
                projection &&
                readout &&
                // if displaynum is empty array or undefined, show on all displays
                (!displaynum || displaynum.includes(displayNum))
            ) {
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
        readoutArray.sort((a, b) => a.prependText.localeCompare(b.prependText));
        return readoutArray;
    };

    // Single stable mouse handler using raf to throttle
    const handleMouseMove = useCallback(
        (evt) => {
            // schedule a single rAF; if already scheduled, update lastMouseRef and exit
            lastMouseRef.current = evt;
            if (rafRef.current) return;

            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                const event = lastMouseRef.current;
                if (!event) return;

                // if right-click menu open, skip updates
                if (rightClickMenu.current?.isOpen) return;

                const overlay = overlayRef?.current;
                const deck =
                    overlay?._deck || overlay?._deckInstance || overlay?._deckGL || overlay?._deck;
                if (!deck) return;

                // canvas rect and mouse in CSS pixels
                const canvas = deck.canvas || deck._canvas;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;

                // Ask Deck for viewports and use viewManager.getViewports if available.
                const { viewManager } = deck;
                let viewports = [];
                if (viewManager?.getViewports) {
                    viewports = viewManager.getViewports();
                } else if (deck.getViewports) {
                    viewports = deck.getViewports();
                }

                if (!viewports || viewports.length === 0) return;

                // find the viewport under the mouse. Prefer containsPoint if available.
                const vp = viewports.find((v) =>
                    typeof v.containsPoint === 'function'
                        ? v.containsPoint([mouseX, mouseY])
                        : mouseX >= v.x &&
                          mouseX < v.x + v.width &&
                          mouseY >= v.y &&
                          mouseY < v.y + v.height,
                );
                if (!vp) return;

                // compute lon/lat from viewport-local coords
                const localX = mouseX - vp.x;
                const localY = mouseY - vp.y;
                const [lon, lat] = vp.unproject([localX, localY]);

                // pick objects only when needed
                let picks = [];
                try {
                    // pickMultipleObjects expects pixel coords relative to deck canvas (CSS px)
                    // call on overlay (MapboxOverlay) if available, else call deck.pickMultipleObjects
                    if (typeof overlay.pickMultipleObjects === 'function') {
                        picks = overlay.pickMultipleObjects({ x: mouseX, y: mouseY }) || [];
                    } else if (typeof deck.pickMultipleObjects === 'function') {
                        picks = deck.pickMultipleObjects({ x: mouseX, y: mouseY }) || [];
                    }
                } catch (err) {
                    picks = [];
                }

                // transform picks into readout strings via pickingFunction
                const pickingArr = [];
                for (const object of picks) {
                    const pickingFunction = object?.sourceLayer?.props?.pickingFunction;
                    if (typeof pickingFunction === 'function') {
                        const { readout } = pickingFunction(object) || {};
                        // Don't allow duplicates
                        if (readout && !some(pickingArr, readout)) {
                            pickingArr.push(readout);
                        }
                    }
                }

                // update state once per frame
                setPosition({
                    x: localX + MOUSE_OFFSET.x,
                    y: localY + MOUSE_OFFSET.y,
                    lon,
                    lat,
                });
                setPickResults(pickingArr);
                setReadoutDivDisplay('block');
            });
        },
        [overlayRef, rightClickMenu],
    );

    const stopMouseMovePropagation = (event) => {
        event.stopPropagation();
    };

    useEffect(() => {
        const overlayElement = mapContainer?.current;
        if (!overlayElement) return;

        // Right click and hold vs. right click menu logic
        let rightClickTimer = null;
        let rightClickStart = null;
        let rightClickMoved = false;
        const RIGHT_CLICK_HOLD_MS = 250;
        const MOVE_THRESHOLD = 5;

        // Open right-click menu only if not a drag/hold
        const rightClickMenuOpen = (event) => {
            const rect = overlayElement.getBoundingClientRect();
            const left = event.clientX - rect.left;
            const top = event.clientY - rect.top;
            setRightClickMenu((prev) => ({
                ...prev,
                isOpen: true,
                top: `${top + MOUSE_OFFSET.y}px`,
                left: `${left + MOUSE_OFFSET.x}px`,
            }));
            event.preventDefault();
            event.stopPropagation();
        };

        const onMouseDown = (event) => {
            if (event.button === 2) {
                // right mouse button
                rightClickStart = { x: event.clientX, y: event.clientY };
                rightClickMoved = false;
                rightClickTimer = setTimeout(() => {
                    rightClickTimer = null; // timer expired
                }, RIGHT_CLICK_HOLD_MS);
            }
        };

        const onMouseMove = (event) => {
            if (rightClickStart) {
                const dx = event.clientX - rightClickStart.x;
                const dy = event.clientY - rightClickStart.y;
                if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
                    rightClickMoved = true;
                    if (rightClickTimer) {
                        clearTimeout(rightClickTimer);
                        rightClickTimer = null;
                    }
                }
            }
        };

        const onMouseUp = (event) => {
            if (event.button === 2 && rightClickStart) {
                if (rightClickTimer && !rightClickMoved) {
                    // treat as right click (open menu)
                    rightClickMenuOpen(event);
                }
                if (rightClickTimer) {
                    clearTimeout(rightClickTimer);
                    rightClickTimer = null;
                }
                rightClickStart = null;
                rightClickMoved = false;
            }
        };

        // Prevent default context menu if you handle it yourself
        const onContextMenu = (event) => {
            event.preventDefault();
        };

        const hideReadout = () => {
            setReadoutDivDisplay('none');
            setPickResults([]);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };

        // Allow checkbox clicks to complete before closing the menu
        const handleOverlayClick = () => {
            setTimeout(() => {
                setRightClickMenu((prev) => ({ ...prev, isOpen: false }));
            }, 100);
        };

        // Lightweight document-level pointermove that determines if pointer is over overlay
        // If pointer is over the overlay, forward the event to existing handler.
        // Otherwise hide the readout immediately.
        const documentPointerMove = (evt) => {
            // use client coords
            const x = evt.clientX;
            const y = evt.clientY;

            // quick rect test first
            const rect = overlayElement.getBoundingClientRect();
            const inRect = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

            if (!inRect) {
                // pointer outside overlay
                hideReadout();
                return;
            }

            // More robust check: elementFromPoint (handles overlapping siblings/children)
            const el = document.elementFromPoint(x, y);
            if (el && overlayElement.contains(el)) {
                // Pointer is inside overlay. Let existing move handler schedule the rAF work
                try {
                    handleMouseMove(evt);
                } catch (err) {
                    console.warn('handleMouseMove failed', err);
                }
                return;
            }

            // not inside overlay
            hideReadout();
        };

        // overlay-local handlers
        overlayElement.addEventListener('mousedown', onMouseDown, false);
        overlayElement.addEventListener('mousemove', onMouseMove, false);
        overlayElement.addEventListener('mouseup', onMouseUp, false);
        overlayElement.addEventListener('contextmenu', onContextMenu, false);
        overlayElement.addEventListener('click', handleOverlayClick, false);
        overlayElement.addEventListener('mousemove', handleMouseMove, false);

        // using pointerleave + mouseleave for broader browser coverage
        overlayElement.addEventListener('pointerleave', hideReadout, false);
        overlayElement.addEventListener('mouseleave', hideReadout, false);

        // global listener that runs everywhere and decides if pointer is in overlay
        // capture true so it runs early
        document.addEventListener('pointermove', documentPointerMove, true);

        // eslint-disable-next-line consistent-return
        return () => {
            overlayElement.removeEventListener('mousedown', onMouseDown, false);
            overlayElement.removeEventListener('mousemove', onMouseMove, false);
            overlayElement.removeEventListener('mouseup', onMouseUp, false);
            overlayElement.removeEventListener('contextmenu', onContextMenu, false);
            overlayElement.removeEventListener('click', handleOverlayClick);
            overlayElement.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('pointermove', documentPointerMove, true);

            overlayElement.removeEventListener('pointerleave', hideReadout);
            overlayElement.removeEventListener('mouseleave', hideReadout);

            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [handleMouseMove, mapContainer, overlayRef]);

    // Render the readout. For offsets, match viewport by view.id to views array
    // get latest deck for offsets when rendering
    const overlay = overlayRef?.current;
    const deck = overlay?._deck;
    const viewports = deck?.viewManager?.getViewports?.() || deck?.getViewports?.() || [];
    // build mapping from view id -> viewport
    const vpById = new Map(viewports.map((v) => [v.id, v]));

    const makeReadout = (displayNum) => {
        const { lon, lat } = position;
        if (lon == null || lat == null) return null;

        // build gridded readout using current layers from overlay props
        const layers = overlayRef?.current?._props?.layers || [];
        const gridded = buildGriddedReadout(lon, lat, displayNum, layers);

        return (
            <div className="x4d-readout" style={{ display: readoutDivDisplay }}>
                {views.length > 1 && (
                    <span
                        className="x4d-readout-circle"
                        style={{
                            top: `${-MOUSE_OFFSET.y - CIRCLE_RADIUS}px`,
                            left: `${-MOUSE_OFFSET.x - CIRCLE_RADIUS}px`,
                            height: `${CIRCLE_RADIUS * 2}px`,
                            width: `${CIRCLE_RADIUS * 2}px`,
                        }}
                    />
                )}
                {title}
                {title && <hr />}
                <table>
                    <tbody>
                        {gridded.map((d, i) => (
                            <tr key={i}>
                                <td>{`${d.prependText}: `}</td>
                                <td>{d.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {pickResults.map((item, i) => (
                    <div key={i}>
                        <div>{item}</div>
                        {i < pickResults.length - 1 && <br />}
                    </div>
                ))}

                {rightClickMenu.readoutLatLonChecked && (
                    <>
                        <hr />
                        <table>
                            <tbody>
                                <tr>
                                    <td>{`Lat/Lon: ${lat.toFixed(2)}, ${lon.toFixed(2)}`}</td>
                                </tr>
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        );
    };

    return (
        <div onMouseMove={stopMouseMovePropagation}>
            {rightClickMenu.isOpen && (
                <div
                    id="x4d-right-click-menu"
                    style={{
                        position: 'absolute',
                        top: rightClickMenu.top,
                        left: rightClickMenu.left,
                        display: 'block',
                        minWidth: '150px',
                    }}
                >
                    {/* right click content (unchanged) */}
                    <div className="x4d-right-click-menu-div">
                        <label className="x4d-right-click-menu-label" htmlFor="x4d_data_readout">
                            <input
                                type="checkbox"
                                id="x4d_data_readout"
                                onChange={() =>
                                    setRightClickMenu((prev) => ({
                                        ...prev,
                                        readoutChecked: !prev.readoutChecked,
                                    }))
                                }
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
                                onChange={() =>
                                    setRightClickMenu((prev) => ({
                                        ...prev,
                                        readoutLatLonChecked: !prev.readoutLatLonChecked,
                                    }))
                                }
                                checked={rightClickMenu.readoutLatLonChecked}
                            />
                            Lat/Lon Readout
                        </label>
                    </div>
                </div>
            )}

            {!rightClickMenu.isOpen && rightClickMenu.readoutChecked && (
                <>
                    {views.map((view, index) => {
                        const vp = vpById.get(view.id) || viewports[index] || { x: 0, y: 0 };
                        const offsetX = vp.x || 0;
                        const offsetY = vp.y || 0;
                        return (
                            <div
                                key={view.id || index}
                                style={{
                                    position: 'absolute',
                                    top: position.y + offsetY,
                                    left: position.x + offsetX,
                                    pointerEvents: 'none',
                                }}
                            >
                                {/* {views.length > 1 && (
                                    <span
                                        className="x4d-readout-circle"
                                        style={{
                                            top: `${-MOUSE_OFFSET.y - CIRCLE_RADIUS}px`,
                                            left: `${-MOUSE_OFFSET.x - CIRCLE_RADIUS}px`,
                                            height: `${CIRCLE_RADIUS * 2}px`,
                                            width: `${CIRCLE_RADIUS * 2}px`,
                                        }}
                                    />
                                )} */}

                                {makeReadout(index)}
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
}
