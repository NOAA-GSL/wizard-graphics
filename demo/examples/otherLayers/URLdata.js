const NWSmapservices = 'https://mapservices.weather.noaa.gov/vector/rest/services';
const NWSmapservicesOptions =
    'where=1%3D1&text=&objectIds=&time=&timeRelation=esriTimeRelationOverlaps&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&havingClause=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&returnExtentOnly=false&sqlFormat=none&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=geojson';
const URLdata = {
    // NIFC
    'NIFC-active':
        'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0/query?outFields=*&where=(IncidentSize>50)&geometryPrecision=3&f=geojson',
    'NIFC-last24Hours':
        'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Last24h/FeatureServer/0/query?outFields=*&where=1%3D1&geometryPrecision=3&f=geojson',
    // CPC
    'CPC-day6-10Precip': `${NWSmapservices}/outlooks/cpc_6_10_day_outlk/MapServer/1/query?${NWSmapservicesOptions}`,
    'CPC-day6-10Temp': `${NWSmapservices}/outlooks/cpc_6_10_day_outlk/MapServer/0/query?${NWSmapservicesOptions}`,
    'CPC-day8-14Precip': `${NWSmapservices}/outlooks/cpc_8_14_day_outlk/MapServer/1/query?${NWSmapservicesOptions}`,
    'CPC-day8-14Temp': `${NWSmapservices}/outlooks/cpc_8_14_day_outlk/MapServer/0/query?${NWSmapservicesOptions}`,
    // SPC
    'SPC-day1Outlook': `${NWSmapservices}/outlooks/SPC_wx_outlks/MapServer/1/query?${NWSmapservicesOptions}`,
    'SPC-day2Outlook': `${NWSmapservices}/outlooks/SPC_wx_outlks/MapServer/9/query?${NWSmapservicesOptions}`,
    'SPC-day3Outlook': `${NWSmapservices}/outlooks/SPC_wx_outlks/MapServer/17/query?${NWSmapservicesOptions}`,
    // WPC
    'WPC-day1Outlook': `${NWSmapservices}/hazards/wpc_precip_hazards/MapServer/0/query?${NWSmapservicesOptions}`,
    'WPC-day2Outlook': `${NWSmapservices}/hazards/wpc_precip_hazards/MapServer/1/query?${NWSmapservicesOptions}`,
    'WPC-day3Outlook': `${NWSmapservices}/hazards/wpc_precip_hazards/MapServer/2/query?${NWSmapservicesOptions}`,
    'WPC-day4Outlook': `${NWSmapservices}/hazards/wpc_precip_hazards/MapServer/3/query?${NWSmapservicesOptions}`,
    'WPC-day5Outlook': `${NWSmapservices}/hazards/wpc_precip_hazards/MapServer/4/query?${NWSmapservicesOptions}`,
    // WWA
    WWA: 'https://www.weather.gov/source/crh/allhazard.geojson',
};

/*
const dayMapping = {
    day1outlook: 0,
    day2outlook: 1,
    day3outlook: 2,
    day4outlook: 3,
    day5outlook: 4,
};

// Define the URL base and query parameters
const baseURL =
    'https://mapservices.weather.noaa.gov/vector/rest/services/hazards/wpc_precip_hazards/MapServer/';
const queryParams =
    'where=1%3D1&text=&objectIds=&time=&timeRelation=esriTimeRelationOverlaps&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&havingClause=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&returnExtentOnly=false&sqlFormat=none&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=geojson';

    const dataURL = `${baseURL}${dayNumber}/query?${queryParams}`;
    */

export default URLdata;
