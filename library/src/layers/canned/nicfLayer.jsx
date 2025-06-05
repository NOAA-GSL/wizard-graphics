import { CompositeLayer, GeoJsonLayer } from 'deck.gl';
import FireIcon from './icons/FireIcon.svg';

const getIconSize = (d) => {
    const { IncidentSize } = d.properties;
    let scale = 25;
    if (IncidentSize > 100000) scale = 50;
    else if (IncidentSize > 10000) scale = 40;
    else if (IncidentSize > 5000) scale = 30;
    else if (IncidentSize > 0) scale = 25;
    return scale;
};

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const formatNumber = (value) =>
    Number.isNaN(parseInt(value, 10)) ? null : numberWithCommas(parseInt(value, 10));

const defaultProps = {
    incidents: 'active',
    pointType: 'icon+text',
    iconAtlas: FireIcon,
    iconMapping: {
        marker: { x: 0, y: 0, width: 100, height: 136, anchorY: 0 },
    },
    getIconSize,
    getIcon: () => 'marker',
    pickingFunction: (d) => {
        if (d.object) {
            const {
                IncidentName,
                IncidentSize,
                IncidentTypeCategory,
                PercentContained,
                EstimatedCostToDate,
                TotalIncidentPersonnel,
            } = d.object.properties;

            // Initialize an array to store available rows
            const readout = [];

            // Conditionally add each variable to the tooltip
            if (IncidentName)
                readout.push(
                    <div key="name">
                        <strong>Incident Name:</strong> {IncidentName}
                        <br />
                    </div>,
                );
            const incidentSize = formatNumber(IncidentSize);
            if (incidentSize)
                readout.push(
                    <div key="size">
                        <strong>Incident Size:</strong> {incidentSize} acres
                        <br />
                    </div>,
                );

            const percentContained = formatNumber(PercentContained);
            if (percentContained)
                readout.push(
                    <div key="contained">
                        <strong>Percent Contained:</strong> {percentContained}
                        <br />
                    </div>,
                );

            if (IncidentTypeCategory)
                readout.push(
                    <div key="type">
                        <strong>Incident Type:</strong> {IncidentTypeCategory}
                        <br />
                    </div>,
                );

            const incidentCost = formatNumber(EstimatedCostToDate);
            if (incidentCost)
                readout.push(
                    <div key="cost">
                        <strong>Estimated Cost:</strong> {incidentCost}
                        <br />
                    </div>,
                );

            const totalPersonnel = formatNumber(TotalIncidentPersonnel);
            if (totalPersonnel)
                readout.push(
                    <div key="personnel">
                        <strong>Total Personnel:</strong> {totalPersonnel}
                        <br />
                    </div>,
                );

            return { readout };
        }
        return { readout: null };
    },
};

class NIFCLayer extends CompositeLayer {
    renderLayers() {
        return new GeoJsonLayer(this.props, {
            id: `${this.props.id}-geojson`,
        });
    }
}
NIFCLayer.defaultProps = defaultProps;
NIFCLayer.layerName = 'NIFCLayer';
export default NIFCLayer;
