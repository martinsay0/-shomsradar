import * as turf from '@turf/turf';

export const calculateRiskScore = (centerLat, centerLng, allData, rtmWeights = { darkSpots: 0.4, brokenWindows: 0.3, escapeRoutes: 0.3 }) => {
    // 100 meters = 0.1 km for the RTM buffer
    const radiusKm = 0.1;
    const centerPoint = turf.point([centerLng, centerLat]); // Turf uses [lng, lat]
    const bufferPolygon = turf.buffer(centerPoint, radiusKm, { units: 'kilometers' });

    // Find points within the buffer
    const nearbyPoints = allData.filter(point => {
        const pt = turf.point([point.coordinates[1], point.coordinates[0]]);
        return turf.booleanPointInPolygon(pt, bufferPolygon);
    });

    if (nearbyPoints.length === 0) {
        return { hasData: false };
    }

    // A. The RTM Engine (Risk Terrain Modeling)
    let darkSpotCount = 0;
    let disorderCount = 0;
    let escapeRouteCount = 0;

    nearbyPoints.forEach(p => {
        if (p.observed_environment.has_streetlight === "No") darkSpotCount++;
        
        const d = p.observed_environment.visible_disorder;
        if (d.includes("Litter") || d.includes("Abandoned/uncompleted buildings")) disorderCount++;

        if (p.observed_environment.street_type === "Alleyway" || p.observed_environment.street_type === "Footpath") escapeRouteCount++;
    });

    const totalPts = nearbyPoints.length;
    const darkSpotRatio = darkSpotCount / totalPts;
    const disorderRatio = disorderCount / totalPts;
    const escapeRouteRatio = escapeRouteCount / totalPts;

    // Perceived Fear Index (Average of fear_robbery_street)
    let totalFear = 0;
    nearbyPoints.forEach(p => {
        totalFear += (p.fear_indicators.fear_robbery_street || 0);
    });
    const perceivedFearIndex = totalPts > 0 ? (totalFear / totalPts).toFixed(1) : 0;

    // Calculate Composite RTM Score (0 to 1)
    const rawRTMScore = 
        (darkSpotRatio * rtmWeights.darkSpots) + 
        (disorderRatio * rtmWeights.brokenWindows) + 
        (escapeRouteRatio * rtmWeights.escapeRoutes);

    // Normalize score based on sum of weights to ensure it scales 0-1
    const maxPossibleWeight = rtmWeights.darkSpots + rtmWeights.brokenWindows + rtmWeights.escapeRoutes;
    const rtmScore = maxPossibleWeight > 0 ? rawRTMScore / maxPossibleWeight : 0;

    // SHAP-like Explanations (Percentage contribution to the raw score)
    let shapLighting = 0, shapDisorder = 0, shapPermeability = 0;
    if (rawRTMScore > 0) {
        shapLighting = Math.round(((darkSpotRatio * rtmWeights.darkSpots) / rawRTMScore) * 100);
        shapDisorder = Math.round(((disorderRatio * rtmWeights.brokenWindows) / rawRTMScore) * 100);
        shapPermeability = Math.round(((escapeRouteRatio * rtmWeights.escapeRoutes) / rawRTMScore) * 100);
    }

    // Simulated Intervention: What if we installed streetlights everywhere in this buffer?
    // Set darkSpotRatio to 0
    const rawSimulatedScore = (0 * rtmWeights.darkSpots) + (disorderRatio * rtmWeights.brokenWindows) + (escapeRouteRatio * rtmWeights.escapeRoutes);
    const simulatedRTMScore = maxPossibleWeight > 0 ? rawSimulatedScore / maxPossibleWeight : 0;

    // Calculate Global Area Average (to compare)
    const globalDarkRatio = allData.filter(p => p.observed_environment.has_streetlight === "No").length / allData.length;
    const globalDisorderRatio = allData.filter(p => p.observed_environment.visible_disorder.length > 0).length / allData.length;
    const globalEscapeRatio = allData.filter(p => p.observed_environment.street_type === "Alleyway").length / allData.length;
    const globalRTMScore = maxPossibleWeight > 0 ? (
        (globalDarkRatio * rtmWeights.darkSpots) + 
        (globalDisorderRatio * rtmWeights.brokenWindows) + 
        (globalEscapeRatio * rtmWeights.escapeRoutes)
    ) / maxPossibleWeight : 0;

    // Classification
    let verdict = 'LOW RISK';
    let verdictColor = 'text-green-500';
    let badgeColor = 'bg-green-100 text-green-700 border-green-200';
    let verdictColorHex = '#22c55e'; // For polygon styling

    if (rtmScore > 0.8) {
        verdict = 'VERY HIGH RISK';
        verdictColor = 'text-red-600';
        badgeColor = 'bg-red-100 text-red-800 border-red-300';
        verdictColorHex = '#dc2626';
    } else if (rtmScore > 0.5) {
        verdict = 'HIGH RISK';
        verdictColor = 'text-orange-500';
        badgeColor = 'bg-orange-100 text-orange-700 border-orange-200';
        verdictColorHex = '#f97316';
    } else if (rtmScore > 0.25) {
        verdict = 'CAUTION';
        verdictColor = 'text-yellow-500';
        badgeColor = 'bg-yellow-100 text-yellow-700 border-yellow-200';
        verdictColorHex = '#eab308';
    }

    // B. The Why (Details for UI)
    const lightingStatus = darkSpotRatio > 0.5 ? "Dark / Unlit" : "Well Lit";
    const disorderAlert = disorderRatio > 0.3 ? "Visible Disorder" : "Clean Environment";
    const permeabilityStatus = escapeRouteRatio > 0.5 ? "High Permeability (Alleys)" : "Standard Layout";

    return {
        hasData: true,
        rtmScore: Math.round(rtmScore * 100),
        simulatedRTMScore: Math.round(simulatedRTMScore * 100),
        globalRTMScore: Math.round(globalRTMScore * 100),
        perceivedFearIndex,
        shap: {
            lighting: shapLighting,
            disorder: shapDisorder,
            permeability: shapPermeability
        },
        verdict,
        verdictColor,
        verdictColorHex,
        badgeColor,
        details: {
            lighting: lightingStatus,
            disorder: disorderAlert,
            permeability: permeabilityStatus
        },
        pointCount: totalPts,
        polygon: bufferPolygon
    };
};
