import gUtilities from '../../utilities/graphicsUtilities';

export default function LegendStaticItems({ options }) {
    const validTimes = gUtilities.formatValidTime(options);
    if (options.colors.length !== options.labels.length) {
        console.error('Colors and labels must have the same length.');
        // return;
    }

    let legendItems = [];
    if (options.layerType === 'temp') {
        legendItems = options.colors.temp.map((color, index) => ({
            label: options.labels.labels[index],
            color,
        }));
    } else if (options.layerType === 'prcp') {
        legendItems = options.colors.prcp.map((color, index) => ({
            label: options.labels.labels[index],
            color,
        }));
    } else {
        legendItems =
            options.colors.map((color, index) => ({
                label: options.labels[index],
                color,
            })) || [];
    }

    return (
        <div>
            {options.title && validTimes ? (
                <div className="static-legend-title">
                    <div>{options.title}</div>
                    <div>{validTimes}</div>
                </div>
            ) : null}
            <div className="static-legend-container">
                {legendItems.map((item, index) => (
                    <div key={index} className="static-legend-items">
                        {/* Don't want to render the color if showing `Near Normal` */}
                        {item.label !== 'Near Normal' ? (
                            <div
                                className="static-legend-items-color"
                                style={{
                                    backgroundColor: item.color,
                                    border: '1px solid transparent',
                                }}
                            />
                        ) : (
                            <div
                                className="static-legend-items-color"
                                style={{ backgroundColor: item.color, border: '1px solid #000' }}
                            />
                        )}
                        <div>{item.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
