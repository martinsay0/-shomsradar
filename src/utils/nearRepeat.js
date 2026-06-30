import * as turf from '@turf/turf';

export const calculateNearRepeats = (allData, distanceBandMeters = 200) => {
    // 1. Identify High-Fear / Incident Points
    const highFearPoints = allData.filter(p => 
        (p.fear_indicators && p.fear_indicators.fear_robbery_street >= 2) || 
        (p.victimization && p.victimization.stolen_from === 'Yes') ||
        (p.future_risk_score > 30)
    );

    const distanceKm = distanceBandMeters / 1000;
    const linkLines = [];
    const connectedComponents = []; // Array of sets of point IDs
    const pointToComponent = new Map();

    // 2. Build Adjacency and Connected Components
    for (let i = 0; i < highFearPoints.length; i++) {
        const p1 = highFearPoints[i];
        const pt1 = turf.point([p1.coordinates[1], p1.coordinates[0]]); // [lng, lat]
        
        let myComponent = pointToComponent.get(p1.id);
        if (!myComponent) {
            myComponent = new Set([p1.id]);
            connectedComponents.push(myComponent);
            pointToComponent.set(p1.id, myComponent);
        }

        for (let j = i + 1; j < highFearPoints.length; j++) {
            const p2 = highFearPoints[j];
            const pt2 = turf.point([p2.coordinates[1], p2.coordinates[0]]);
            
            const dist = turf.distance(pt1, pt2, { units: 'kilometers' });
            if (dist <= distanceKm) {
                // Link them
                linkLines.push([p1.coordinates, p2.coordinates]); // [lat, lng] for Leaflet Polyline

                // Merge components
                let otherComponent = pointToComponent.get(p2.id);
                if (otherComponent && otherComponent !== myComponent) {
                    // Merge other into myComponent
                    otherComponent.forEach(id => {
                        myComponent.add(id);
                        pointToComponent.set(id, myComponent);
                    });
                    otherComponent.clear(); // Empty it out
                } else if (!otherComponent) {
                    myComponent.add(p2.id);
                    pointToComponent.set(p2.id, myComponent);
                }
            }
        }
    }

    // 3. Generate Propagation Zones (Convex Hulls + Buffer)
    const propagationZones = [];
    let clusteredCount = 0;

    connectedComponents.forEach(component => {
        if (component.size > 1) {
            clusteredCount += component.size;
            
            // Get coordinates for all points in this cluster
            const coords = Array.from(component).map(id => {
                const p = highFearPoints.find(point => point.id === id);
                return [p.coordinates[1], p.coordinates[0]]; // [lng, lat] for Turf
            });

            const pointsFeature = turf.featureCollection(coords.map(c => turf.point(c)));
            
            let zoneGeometry;
            if (coords.length > 2) {
                // Convex hull requires at least 3 points
                const hull = turf.convex(pointsFeature);
                // Buffer the hull slightly to make it look like a zone
                zoneGeometry = turf.buffer(hull, 0.05, { units: 'kilometers' });
            } else {
                // Just 2 points, buffer a line between them
                const line = turf.lineString(coords);
                zoneGeometry = turf.buffer(line, 0.05, { units: 'kilometers' });
            }

            if (zoneGeometry) {
                propagationZones.push(zoneGeometry);
            }
        }
    });

    // 4. Calculate Statistics
    const totalHighFear = highFearPoints.length;
    const isolatedCount = totalHighFear - clusteredCount;
    const clusteringRate = totalHighFear > 0 ? (clusteredCount / totalHighFear) * 100 : 0;

    return {
        linkLines,
        propagationZones,
        stats: {
            totalHighFear,
            clusteredCount,
            isolatedCount,
            clusteringRate: Math.round(clusteringRate)
        }
    };
};
