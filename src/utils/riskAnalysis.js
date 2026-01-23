export const haversineDistance = (coords1, coords2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const lat1 = coords1[0];
    const lon1 = coords1[1];
    const lat2 = coords2[0];
    const lon2 = coords2[1];

    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in km
};

export const calculateRiskScore = (centerLat, centerLng, allData) => {
    // 100 meters = 0.1 km
    const radiusKm = 0.1;
    const nearbyPoints = allData.filter(point => {
        const dist = haversineDistance([centerLat, centerLng], point.coordinates);
        return dist <= radiusKm;
    });

    if (nearbyPoints.length === 0) {
        return { hasData: false };
    }

    // A. The Verdict
    // Average Fear Score (D2 -> fear_robbery_street)
    // Logic: > 4 HIGH RISK, 3-4 CAUTION, < 3 SAFE
    const totalFear = nearbyPoints.reduce((sum, p) => sum + p.fear_indicators.fear_robbery_street, 0);
    const avgFear = totalFear / nearbyPoints.length;

    let verdict = 'SAFE';
    let verdictColor = 'text-green-500';
    let badgeColor = 'bg-green-100 text-green-700 border-green-200';

    if (avgFear > 4) {
        verdict = 'HIGH RISK';
        verdictColor = 'text-red-500';
        badgeColor = 'bg-red-100 text-red-700 border-red-200';
    } else if (avgFear >= 3) {
        verdict = 'CAUTION';
        verdictColor = 'text-yellow-500';
        badgeColor = 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }

    // B. The Why
    // Lighting
    const noLightCount = nearbyPoints.filter(p => p.observed_environment.has_streetlight === "No").length;
    const lightingStatus = (noLightCount / nearbyPoints.length) > 0.5 ? "Dark / Unlit" : "Well Lit";

    // Disorder
    const disorderPoints = nearbyPoints.filter(p => {
        const d = p.observed_environment.visible_disorder;
        return d.includes("Litter") || d.includes("Abandoned/uncompleted buildings");
    });
    const disorderAlert = disorderPoints.length > 0 ? "Visible Disorder" : "Clean Environment";

    // Protection
    const vigilanteCount = nearbyPoints.filter(p => p.social.vigilante_proximity).length;
    const communityProtection = (vigilanteCount / nearbyPoints.length) > 0.5 ? "Vigilante Present" : "Low Surveillance";

    // C. Victimization Stat
    const victims = nearbyPoints.filter(p => p.victimization.stolen_from === "Yes").length;
    const victimRate = Math.round((victims / nearbyPoints.length) * 100);

    return {
        hasData: true,
        avgFear: avgFear.toFixed(1),
        verdict,
        verdictColor,
        badgeColor,
        details: {
            lighting: lightingStatus,
            disorder: disorderAlert,
            protection: communityProtection
        },
        victimRate,
        pointCount: nearbyPoints.length
    };
};
