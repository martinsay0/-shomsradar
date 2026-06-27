import * as turf from '@turf/turf';

export const calculateLISAHotspots = (allData, cellSideMeters = 150) => {
    if (allData.length === 0) return { grid: null, stats: {} };

    const cellSideKm = cellSideMeters / 1000;

    // 1. Create Turf Points and find Bounding Box
    const points = allData.map(p => turf.point([p.coordinates[1], p.coordinates[0]], { 
        fear: p.fear_indicators.fear_robbery_street || 0,
        hasNoLight: p.observed_environment.has_streetlight === "No" ? 1 : 0
    }));
    
    const featureCollection = turf.featureCollection(points);
    const bbox = turf.bbox(featureCollection);

    // 2. Generate Hexagonal Grid
    // Pad the bbox slightly so edge points fit well inside hexagons
    const paddedBbox = [bbox[0] - 0.005, bbox[1] - 0.005, bbox[2] + 0.005, bbox[3] + 0.005];
    const hexGrid = turf.hexGrid(paddedBbox, cellSideKm, { units: 'kilometers' });

    // 3. Aggregate Data into Hexagons
    let totalScore = 0;
    let activeHexCount = 0;
    const activeHexes = [];

    hexGrid.features.forEach((hex, index) => {
        const ptsWithin = turf.pointsWithinPolygon(featureCollection, hex);
        
        if (ptsWithin.features.length > 0) {
            const sumFear = ptsWithin.features.reduce((sum, pt) => sum + pt.properties.fear, 0);
            const sumDark = ptsWithin.features.reduce((sum, pt) => sum + pt.properties.hasNoLight, 0);
            
            const avgFear = sumFear / ptsWithin.features.length;
            
            hex.properties = {
                id: index,
                pointCount: ptsWithin.features.length,
                avgFear: avgFear,
                darkSpotRatio: sumDark / ptsWithin.features.length,
                center: turf.center(hex).geometry.coordinates // [lng, lat]
            };
            
            totalScore += avgFear;
            activeHexCount++;
            activeHexes.push(hex);
        }
    });

    if (activeHexCount === 0) return { grid: null, stats: {} };

    // 4. Calculate Global Mean and Standard Deviation
    const globalMean = totalScore / activeHexCount;
    const variance = activeHexes.reduce((sum, hex) => sum + Math.pow(hex.properties.avgFear - globalMean, 2), 0) / activeHexCount;
    const stdDev = Math.sqrt(variance);

    // 5. LISA / Gi* Heuristic Classification (Spatial Lag)
    let hotspotCount = 0;
    let coldspotCount = 0;
    let totalDarkInHotspots = 0;
    let totalPtsInHotspots = 0;

    activeHexes.forEach(hex => {
        // Find spatial neighbors (hexagons whose centers are within ~2 cell widths)
        const neighborRadius = cellSideKm * 2; 
        const neighbors = activeHexes.filter(otherHex => {
            if (otherHex.properties.id === hex.properties.id) return true; // include self
            const dist = turf.distance(hex.properties.center, otherHex.properties.center, { units: 'kilometers' });
            return dist <= neighborRadius;
        });

        // Calculate Spatial Lag (local neighborhood average)
        const lagSum = neighbors.reduce((sum, n) => sum + n.properties.avgFear, 0);
        const spatialLag = lagSum / neighbors.length;

        // Classification based on Z-score heuristic
        const zScore = stdDev > 0 ? (spatialLag - globalMean) / stdDev : 0;
        
        let classification = "Not Significant";
        let color = "transparent";

        if (zScore > 1.2) {
            // High-High (Hotspot)
            classification = "Hotspot";
            color = "#dc2626"; // Red-600
            hotspotCount++;
            
            totalDarkInHotspots += hex.properties.darkSpotRatio * hex.properties.pointCount;
            totalPtsInHotspots += hex.properties.pointCount;
        } else if (zScore < -1.2) {
            // Low-Low (Coldspot)
            classification = "Coldspot";
            color = "#2563eb"; // Blue-600
            coldspotCount++;
        }

        hex.properties.classification = classification;
        hex.properties.zScore = zScore.toFixed(2);
        hex.properties.fillColor = color;
    });

    const finalGrid = turf.featureCollection(activeHexes);
    const darkSpotPercentageInHotspots = totalPtsInHotspots > 0 ? (totalDarkInHotspots / totalPtsInHotspots) * 100 : 0;

    return {
        grid: finalGrid,
        stats: {
            hotspotCount,
            coldspotCount,
            globalMean: globalMean.toFixed(2),
            darkSpotPercentageInHotspots: Math.round(darkSpotPercentageInHotspots)
        }
    };
};
