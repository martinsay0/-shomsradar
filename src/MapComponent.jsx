import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MapComponent = ({ data, isNightMode }) => {
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
                />
                {data.map((point) => {
                    // Logic: Day Mode -> safety_day, Night Mode -> safety_night
                    // Safety Scores: 1 (Unsafe) to 5 (Safe)
                    // Color: Green = Safe (High Score), Red = Unsafe (Low Score)

                    const score = isNightMode
                        ? point.fear_indicators.safety_night
                        : point.fear_indicators.safety_day;

                    // Allow fallback if new fields are missing (e.g. using old realData)
                    const displayScore = score !== undefined ? score : point.fear_indicators.fear_robbery_street;

                    // If using fear_robbery_street (old data), High = Bad.
                    // If using safety_day/night (new data), High = Good.
                    // We need to differentiate or assume new mockData structure.
                    // Assuming new data structure is present based on task.

                    // Threshold: Score < 3 is Unsafe (Red), >= 3 is Safe (Green)
                    // Note: If using fear score (1-5), usually 5 is High Fear.
                    // Let's rely on the explicit fields if available.

                    const isSafe = score >= 3;
                    const color = isSafe ? '#22c55e' : '#ef4444'; // green-500 : red-500

                    return (
                        <CircleMarker
                            key={point.id}
                            center={point.coordinates}
                            pathOptions={{
                                color: color,
                                fillColor: color,
                                fillOpacity: 0.7,
                                weight: 2,
                                className: (isNightMode && !isSafe) ? "radar-blip" : ""
                            }}
                            radius={8}
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
                                    {/* Radar Scanner Header */}
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
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default MapComponent;
