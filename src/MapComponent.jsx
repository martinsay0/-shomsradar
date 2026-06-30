import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Popup, Tooltip, Circle, useMap, Marker, GeoJSON, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import MarkerClusterGroup from 'react-leaflet-cluster';const HeatmapLayer = ({ points, kdeBandwidth, kdeDecay, opacity }) => {
    const map = useMap();
    
    useEffect(() => {
        if (!map) return;
        
        // Approximate pixel radius from meters based on zoom 15 (heuristic: radius = bandwidth / 5)
        const calculatedRadius = Math.max(10, kdeBandwidth / 5);

        // Gaussian (smooth tail) vs Epanechnikov (sharp cut-off)
        let blur = 15;
        let gradient = { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' };
        
        if (kdeDecay === 'Epanechnikov') {
            // Sharper edges, less blur relative to radius
            blur = calculatedRadius * 0.1; 
            gradient = { 0.1: 'blue', 0.4: 'lime', 0.7: 'yellow', 0.9: 'red' };
        } else {
            // Gaussian
            blur = calculatedRadius * 0.8;
        }

        // Apply alpha to gradient based on opacity prop
        const op = opacity || 0.8;
        const opGradient = {};
        for (const [stop, color] of Object.entries(gradient)) {
            // We use simple CSS colors, Leaflet heat uses canvas. We can't easily inject alpha to named colors 
            // without a parser, but leaflet.heat has a minOpacity option we can tweak.
            // For true canvas opacity we need a custom heat layer, but for now we set minOpacity proportional.
        }

        const heat = L.heatLayer(points, {
            radius: calculatedRadius,
            blur: blur,
            maxZoom: 15,
            gradient: gradient,
            minOpacity: (opacity || 0.8) * 0.1 // Rough approximation for visibility tuning
        }).addTo(map);
        
        return () => {
            map.removeLayer(heat);
        };
    }, [map, points, kdeBandwidth, kdeDecay, opacity]);
    
    return null;
};

const MapComponent = ({ data, isNightMode, showHeatmap, showRiskZones, kdeBandwidth, kdeDecay, kdeWeight, kdeLayerType, searchPolygon, searchReport, showNearRepeats, nearRepeatData, showLisa, lisaData, layerOpacity }) => {
    // Center roughly on Bariga
    const center = [6.54, 3.39];

    // Different tile styles for Day vs Night
    // Night: Dark Matter (CartoDB)
    // Day: Positron (CartoDB) or OpenStreetMap
    const tileUrl = isNightMode
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    return (
        <div className="h-full w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 relative z-0">
            <MapContainer
                center={center}
                zoom={15}
                scrollWheelZoom={true}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url={tileUrl}
                    crossOrigin="anonymous"
                />

                {showHeatmap && (() => {
                    // Filter points for Heatmap based on kdeLayerType
                    let heatmapData = data;
                    if (kdeLayerType === 'Dark Spots Only') {
                        heatmapData = data.filter(p => p.observed_environment.has_streetlight === 'No');
                    } else if (kdeLayerType === 'Broken Windows Only') {
                        heatmapData = data.filter(p => p.observed_environment.visible_disorder.length > 0);
                    }

                    // Map points and assign intensities based on kdeWeight
                    const heatPoints = heatmapData.map(p => {
                        let intensity = 0.5; // default unweighted
                        if (kdeWeight === 'Fear Score') {
                            intensity = (p.fear_indicators.fear_robbery_street || p.fear_indicators.safety_night || 0) / 5;
                        } else if (kdeWeight === 'Environmental Severity') {
                            let severity = 0;
                            if (p.observed_environment.has_streetlight === 'No') severity += 0.5;
                            if (p.observed_environment.visible_disorder.length > 0) severity += 0.5;
                            intensity = severity || 0.1;
                        }
                        return [...p.coordinates, intensity];
                    }).filter(p => p[2] > 0);

                    return (
                        <HeatmapLayer 
                            points={heatPoints} 
                            kdeBandwidth={kdeBandwidth}
                            kdeDecay={kdeDecay}
                            opacity={layerOpacity?.heatmap || 0.8}
                        />
                    );
                })()}

                {showRiskZones && data.filter(p => p.future_risk_score > 60).map(p => (
                    <Circle
                        key={`risk-${p.id}`}
                        center={p.coordinates}
                        radius={150}
                        pathOptions={{
                            color: '#eab308',
                            fillColor: '#ef4444',
                            fillOpacity: layerOpacity?.riskZones || 0.1,
                            opacity: (layerOpacity?.riskZones || 0.1) * 5,
                            weight: 1,
                            dashArray: "5, 5"
                        }}
                    >
                        <Tooltip>Future Risk Zone: High Probability Area</Tooltip>
                    </Circle>
                ))}

                {searchPolygon && searchReport && (
                    <GeoJSON 
                        key={searchPolygon.geometry.coordinates.toString()} 
                        data={searchPolygon} 
                        style={{
                            color: searchReport.verdictColorHex || '#ef4444',
                            fillColor: searchReport.verdictColorHex || '#ef4444',
                            fillOpacity: 0.2,
                            weight: 2,
                            dashArray: "4, 4"
                        }} 
                    />
                )}

                {showNearRepeats && nearRepeatData?.propagationZones?.features.map((feature, idx) => (
                    <Polygon 
                        key={`nr-poly-${idx}`} 
                        positions={feature.geometry.coordinates[0].map(c => [c[1], c[0]])}
                        pathOptions={{ 
                            color: '#ef4444', 
                            fillColor: '#ef4444', 
                            fillOpacity: (layerOpacity?.nearRepeat || 0.8) * 0.2, 
                            weight: 1,
                            opacity: layerOpacity?.nearRepeat || 0.8
                        }}
                    >
                        <Popup>Contagious Risk Zone</Popup>
                    </Polygon>
                ))}

                {showNearRepeats && nearRepeatData?.linkLines.map((line, idx) => (
                    <Polyline 
                        key={`nr-line-${idx}`} 
                        positions={line} 
                        pathOptions={{ 
                            color: '#ef4444', 
                            weight: 2, 
                            dashArray: "4, 4", 
                            opacity: layerOpacity?.nearRepeat || 0.8 
                        }} 
                    />
                ))}

                {showLisa && lisaData?.grid && (
                    <GeoJSON
                        key={`lisa-grid-${lisaData.grid.features.length}`}
                        data={lisaData.grid}
                        style={(feature) => ({
                            color: feature.properties.fillColor,
                            fillColor: feature.properties.fillColor,
                            fillOpacity: feature.properties.classification !== "Not Significant" ? (layerOpacity?.lisa || 0.5) : 0.05,
                            weight: feature.properties.classification !== "Not Significant" ? 1.5 : 0.5,
                            opacity: feature.properties.classification !== "Not Significant" ? (layerOpacity?.lisa || 0.5) + 0.3 : 0.2
                        })}
                        onEachFeature={(feature, layer) => {
                            if (feature.properties.classification !== "Not Significant") {
                                layer.bindTooltip(`
                                    <div class="text-xs text-slate-800">
                                        <div class="font-bold mb-1">${feature.properties.classification}</div>
                                        <div>Z-Score: ${feature.properties.zScore}</div>
                                        <div>Avg Fear: ${feature.properties.avgFear.toFixed(2)}</div>
                                        <div>Points: ${feature.properties.pointCount}</div>
                                    </div>
                                `);
                            }
                        }}
                    />
                )}

                <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
                    {data.map((point) => {
                        const score = isNightMode
                            ? point.fear_indicators.safety_night
                            : point.fear_indicators.safety_day;
                        
                        const displayScore = score !== undefined ? score : point.fear_indicators.fear_robbery_street;
                        const isSafe = score >= 3;
                        const color = isSafe ? '#22c55e' : '#ef4444';

                        const iconHtml = `<div class="w-3 h-3 rounded-full shadow border border-white" style="background-color: ${color};"></div>`;
                        const customIcon = new L.divIcon({
                            html: iconHtml,
                            className: 'custom-radar-marker ' + ((isNightMode && !isSafe) ? 'radar-blip' : ''),
                            iconSize: [12, 12]
                        });

                        return (
                            <Marker
                                key={point.id}
                                position={point.coordinates}
                                icon={customIcon}
                            >
                                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                                    <div className="text-sm font-semibold">
                                        {isNightMode ? "Night Radar Score" : "Day Radar Score"}: <span className={!isSafe ? "text-red-500" : "text-green-500"}>{score}</span>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {point.observed_environment.has_streetlight === "No" ? "No Streetlights" : "Has Streetlights"}
                                    </div>
                                </Tooltip>
                                <Popup>
                                    <div className="p-1 min-w-[200px]">
                                        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                                            <h3 className="font-bold text-slate-800">ShomsRadar Report</h3>
                                            <div className="w-6 h-6 bg-slate-900 rounded-full relative radar-scanner-animation flex items-center justify-center shadow-sm">
                                                <div className="w-1 h-1 bg-green-500 rounded-full z-10"></div>
                                            </div>
                                        </div>

                                        <div className="text-sm text-slate-600 space-y-1">
                                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded mb-2">
                                                <span className="font-medium">Radar Score</span>
                                                <span className={`font-bold px-2 py-0.5 rounded text-white ${isSafe ? 'bg-green-500' : 'bg-red-500'}`}>{score}/5</span>
                                            </div>
                                            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mt-2">Environment</p>
                                            <p>Type: <span className="font-medium text-slate-800">{point.observed_environment.street_type}</span></p>
                                            <p>Lights: <span className="font-medium text-slate-800">{point.observed_environment.has_streetlight}</span></p>

                                            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mt-2">Social Shield</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>Vigilante: <span className="font-medium text-slate-800">{point.social?.vigilante_proximity ? "Yes" : "No"}</span></div>
                                                <div>Cohesion: <span className="font-medium text-slate-800">{point.social?.social_cohesion}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
};

export default MapComponent;
