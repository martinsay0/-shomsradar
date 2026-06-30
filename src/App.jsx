import React, { useState, useMemo, useEffect } from 'react';
import MapComponent from './MapComponent';
import Dashboard from './Dashboard';
import realData from './realData.json';
import DayNightToggle from './DayNightToggle';
import SearchBar from './SearchBar';
import SafetyCard from './SafetyCard';
import { calculateRiskScore } from './utils/riskAnalysis';
import { calculateNearRepeats } from './utils/nearRepeat';
import { calculateLISAHotspots } from './utils/hotspotAnalysis';
import { exportToPDF, exportGeoJSON } from './utils/exportManager';
import ExportControls from './ExportControls';
import {
    Radar,
    AlertTriangle,
    Shield,
    X,
    Activity,
    Hexagon,
    Lightbulb,
    Footprints,
    LayoutDashboard,
    Menu,
    Flame,
    Target,
    Download,
    Camera,
    Play
} from 'lucide-react';

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isNightMode, setIsNightMode] = useState(false);
    const [rightTab, setRightTab] = useState('advanced');
    const [isExporting, setIsExporting] = useState(false);
    const [filters, setFilters] = useState({
        brokenWindows: false,
        darkSpots: false,
        escapeRoutes: false,
    });

    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showRiskZones, setShowRiskZones] = useState(false);

    // Layer Opacity State
    const [layerOpacity, setLayerOpacity] = useState({
        heatmap: 0.8,
        riskZones: 0.1,
        nearRepeat: 0.8,
        lisa: 0.5
    });

    // Advanced KDE State
    const [kdeBandwidth, setKdeBandwidth] = useState(150); // 50m - 500m
    const [kdeDecay, setKdeDecay] = useState('Gaussian');
    const [kdeWeight, setKdeWeight] = useState('Fear Score');
    const [kdeLayerType, setKdeLayerType] = useState('Overall Fear');

    // RTM Weights State
    const [rtmWeights, setRtmWeights] = useState({
        darkSpots: 0.4,
        brokenWindows: 0.3,
        escapeRoutes: 0.3
    });

    // Near-Repeat State
    const [showNearRepeats, setShowNearRepeats] = useState(false);
    const [nearRepeatBand, setNearRepeatBand] = useState(200); // 100m to 400m
    const [nearRepeatData, setNearRepeatData] = useState({ linkLines: [], propagationZones: [], stats: {} });

    useEffect(() => {
        if (showNearRepeats) {
            setNearRepeatData(calculateNearRepeats(filteredData, nearRepeatBand));
        }
    }, [showNearRepeats, nearRepeatBand, filteredData]);

    const filteredData = useMemo(() => {
        return realData.filter(item => {
            if (filters.brokenWindows) {
                const hasBadDisorder = item.observed_environment.visible_disorder.some(d =>
                    d.includes("Abandoned") || d === "Graffiti"
                );
                if (!hasBadDisorder) return false;
            }
            if (filters.darkSpots) {
                if (item.observed_environment.has_streetlight !== "No") return false;
            }
            if (filters.escapeRoutes) {
                const type = item.observed_environment.street_type;
                if (type !== "Alleyway" && type !== "Footpath") return false;
            }
            return true;
        }).map(item => {
            let future_risk_score = 0;
            if (item.observed_environment.has_streetlight === "No") future_risk_score += 30;
            const hasBadDisorder = item.observed_environment.visible_disorder.some(d =>
                d.includes("Abandoned") || d.includes("Litter")
            );
            if (hasBadDisorder) future_risk_score += 40;
            if (item.observed_environment.street_type === "Alleyway") future_risk_score += 20;
            
            return { ...item, future_risk_score };
        });
    }, [filters]);

    // LISA Hotspot State
    const [showLisa, setShowLisa] = useState(false);
    const [lisaResolution, setLisaResolution] = useState(150);
    const [lisaData, setLisaData] = useState({ grid: null, stats: {} });

    // Recalculate LISA on filter or resolution change
    useEffect(() => {
        if (showLisa) {
            setLisaData(calculateLISAHotspots(filteredData, lisaResolution));
        }
    }, [showLisa, lisaResolution, filteredData]);

    // Search & Report State
    const [searchReport, setSearchReport] = useState(null);
    const [searchPolygon, setSearchPolygon] = useState(null);

    const toggleFilter = (key) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleStoryPreset = (preset) => {
        // Reset all
        setFilters({ brokenWindows: false, darkSpots: false, escapeRoutes: false });
        setShowHeatmap(false); setShowRiskZones(false); setShowNearRepeats(false); setShowLisa(false);
        setIsNightMode(false);
        
        setTimeout(() => {
            if (preset === 'Nighttime Fear') {
                setIsNightMode(true);
                setFilters(prev => ({...prev, darkSpots: true}));
                setShowHeatmap(true);
                setKdeLayerType('Dark Spots Only');
                setRightTab('advanced');
            } else if (preset === 'Broken Windows') {
                setFilters(prev => ({...prev, brokenWindows: true}));
                setShowRiskZones(true);
                setRightTab('advanced');
            } else if (preset === 'Contagion') {
                setShowNearRepeats(true);
                setShowLisa(true);
                setRightTab('advanced');
            }
        }, 100);
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        const success = await exportToPDF('map-export-container', 'analytics-panel');
        setIsExporting(false);
    };

    const handleSearch = (query) => {
        // Simple client-side search simulation
        const found = realData.find(p => p.street_name && p.street_name.toLowerCase().includes(query.toLowerCase()));

        if (found) {
            const report = calculateRiskScore(found.coordinates[0], found.coordinates[1], realData, rtmWeights);
            setSearchReport(report);
            setSearchPolygon(report.polygon || null);
        } else {
            // No match found
            setSearchReport({ hasData: false });
            setSearchPolygon(null);
        }
    };

    const handleUseLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                // Since we are mocking, and the user is likely NOT in Shomolu, 
                // this might return 0 results unless we fake the coords to be in Shomolu
                // For demo purposes, we will pick a random valid location from realData to simulate "User is here"
                const randomPoint = realData[Math.floor(Math.random() * realData.length)];
                const report = calculateRiskScore(randomPoint.coordinates[0], randomPoint.coordinates[1], realData, rtmWeights);
                setSearchReport(report);
                setSearchPolygon(report.polygon || null);
            }, (error) => {
                console.error("Error getting location:", error);
                alert("Could not get your location.");
            });
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-slate-900 text-slate-100 overflow-hidden font-sans">
            {/* Top Navbar */}
            <header className="h-[72px] bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 z-50 shrink-0">
                <div className="flex items-center gap-3 group cursor-default w-72">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 border border-indigo-500/30 flex items-center justify-center bg-slate-900">
                        <img src="/logo.png" alt="ShomsRadar Logo" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight tracking-tight flex items-center gap-1">Shoms<span className="text-indigo-400">Radar</span></h1>
                        <p className="text-[10px] text-slate-400 mt-1 leading-none hidden md:block">Decoding the Fear of Crime in Shomolu</p>
                    </div>
                </div>

                <div className="flex-1 flex justify-center px-4 max-w-xl">
                    <SearchBar onSearch={handleSearch} onUseLocation={handleUseLocation} />
                </div>

                <div className="flex items-center gap-4 justify-end">
                    <div className="hidden lg:block">
                        <DayNightToggle isNightMode={isNightMode} onToggle={() => setIsNightMode(!isNightMode)} />
                    </div>
                    <ExportControls 
                        filteredData={filteredData}
                        filtersText={Object.entries(filters).filter(([k,v])=>v).map(([k])=>k).join(', ') || 'None'}
                        activeLayersText={[showHeatmap&&'Heatmap', showRiskZones&&'RTM', showNearRepeats&&'Near-Repeat', showLisa&&'LISA'].filter(Boolean).join(', ') || 'Base'}
                        mapElementId="map-export-container"
                        statsElementId="analytics-panel"
                    />
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 text-slate-300">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Left Sidebar */}
            <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-72 bg-slate-950 border-r border-slate-800 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div className="p-6 h-full flex flex-col overflow-y-auto">

                    <div className="mb-8 space-y-2">
                        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Story Presets</h2>
                        <button onClick={() => handleStoryPreset('Nighttime Fear')} className="w-full flex items-center gap-3 p-3 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500 transition-all text-left">
                            <Play className="w-4 h-4 text-indigo-400" />
                            <div className="text-sm font-medium">Nighttime Fear Hotspots</div>
                        </button>
                        <button onClick={() => handleStoryPreset('Broken Windows')} className="w-full flex items-center gap-3 p-3 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 hover:border-purple-500 transition-all text-left">
                            <Play className="w-4 h-4 text-purple-400" />
                            <div className="text-sm font-medium">Broken Windows Predictive Zones</div>
                        </button>
                        <button onClick={() => handleStoryPreset('Contagion')} className="w-full flex items-center gap-3 p-3 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 hover:border-red-500 transition-all text-left">
                            <Play className="w-4 h-4 text-red-400" />
                            <div className="text-sm font-medium">Risk Contagion & LISA</div>
                        </button>
                    </div>

                    <div className="space-y-6 flex-1">

                        <div className="space-y-2">
                            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Data Filters</h2>

                            {/* Filter 1: Broken Windows */}
                            <button
                                onClick={() => toggleFilter('brokenWindows')}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group
                  ${filters.brokenWindows
                                        ? 'bg-red-500/10 border-red-500/50 text-red-400'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800'}
                `}
                            >
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="font-medium">Broken Windows</span>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${filters.brokenWindows ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-slate-700'}`} />
                            </button>

                            {/* Filter 2: Dark Spots */}
                            <button
                                onClick={() => toggleFilter('darkSpots')}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group
                  ${filters.darkSpots
                                        ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800'}
                `}
                            >
                                <div className="flex items-center gap-3">
                                    <Lightbulb className="w-5 h-5" />
                                    <span className="font-medium">Dark Spots</span>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${filters.darkSpots ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 'bg-slate-700'}`} />
                            </button>

                            {/* Filter 3: Escape Routes */}
                            <button
                                onClick={() => toggleFilter('escapeRoutes')}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group
                  ${filters.escapeRoutes
                                        ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800'}
                `}
                            >
                                <div className="flex items-center gap-3">
                                    <Footprints className="w-5 h-5" />
                                    <span className="font-medium">Escape Routes</span>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${filters.escapeRoutes ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-slate-700'}`} />
                            </button>

                        </div>

                        <div className="space-y-2 mt-6">
                            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">RTM Weights Engine</h2>
                            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 flex justify-between">
                                        <span>Dark Spots</span>
                                        <span>{Math.round(rtmWeights.darkSpots * 100)}%</span>
                                    </label>
                                    <input type="range" min="0" max="1" step="0.1" value={rtmWeights.darkSpots} onChange={(e) => setRtmWeights({...rtmWeights, darkSpots: Number(e.target.value)})} className="w-full accent-yellow-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 flex justify-between">
                                        <span>Broken Windows</span>
                                        <span>{Math.round(rtmWeights.brokenWindows * 100)}%</span>
                                    </label>
                                    <input type="range" min="0" max="1" step="0.1" value={rtmWeights.brokenWindows} onChange={(e) => setRtmWeights({...rtmWeights, brokenWindows: Number(e.target.value)})} className="w-full accent-red-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 flex justify-between">
                                        <span>Escape Routes</span>
                                        <span>{Math.round(rtmWeights.escapeRoutes * 100)}%</span>
                                    </label>
                                    <input type="range" min="0" max="1" step="0.1" value={rtmWeights.escapeRoutes} onChange={(e) => setRtmWeights({...rtmWeights, escapeRoutes: Number(e.target.value)})} className="w-full accent-blue-500" />
                                </div>
                                <p className="text-[10px] text-slate-500 leading-tight">Weights adjust predictive Risk Terrain Modeling (RTM) severity when querying locations.</p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 mt-6">
                            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                <LayoutDashboard className="w-4 h-4 text-indigo-400" /> Status
                            </h3>
                            <div className="text-sm text-slate-400 flex justify-between">
                                <span>Visible Points:</span>
                                <span className="text-white font-mono">{filteredData.length} / {realData.length}</span>
                            </div>
                            {filteredData.length === 0 && (
                                <p className="text-xs text-red-400 mt-2">No areas match all selected criteria.</p>
                            )}
                        </div>

                    </div>

                    <div className="text-xs text-slate-600 mt-auto pt-6 border-t border-slate-800">
                        Data Source: Field Survey 2025<br />Shomolu & Bariga
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden">
                <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
                    {/* Map Section */}
                    <div id="map-export-container" className="flex-1 h-[50vh] lg:h-full relative border-r border-slate-800 bg-black">
                        {searchReport && (
                            <SafetyCard
                                report={searchReport}
                                onClose={() => {
                                    setSearchReport(null);
                                    setSearchPolygon(null);
                                }}
                            />
                        )}

                        <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 shadow-xl pointer-events-none">
                            <h2 className="text-sm font-semibold text-slate-200">Live Radar Map</h2>
                            <div className="flex items-center gap-3 mt-1 text-xs">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Safe (≥3)</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Unsafe (&lt;3)</span>
                            </div>
                        </div>

                        <MapComponent 
                            data={filteredData} 
                            isNightMode={isNightMode} 
                            showHeatmap={showHeatmap} 
                            showRiskZones={showRiskZones}
                            kdeBandwidth={kdeBandwidth}
                            kdeDecay={kdeDecay}
                            kdeWeight={kdeWeight}
                            kdeLayerType={kdeLayerType}
                            searchPolygon={searchPolygon}
                            searchReport={searchReport}
                            showNearRepeats={showNearRepeats}
                            nearRepeatData={nearRepeatData}
                            showLisa={showLisa}
                            lisaData={lisaData}
                            layerOpacity={layerOpacity}
                        />
                    </div>

                    {/* Dashboard Sidebar - Takes 1/3 on desktop, scrollable */}
                    <div id="analytics-panel" className="h-[50vh] lg:h-full lg:w-[400px] xl:w-[450px] bg-slate-900 border-l border-slate-800 overflow-y-auto flex flex-col">
                        <div className="p-4 lg:p-6 flex-1">
                            <div className="flex border-b border-slate-800 mb-6 gap-6">
                                <button onClick={() => setRightTab('metrics')} className={`pb-2 text-sm font-semibold transition-colors ${rightTab === 'metrics' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>Metrics Overview</button>
                                <button onClick={() => setRightTab('advanced')} className={`pb-2 text-sm font-semibold transition-colors ${rightTab === 'advanced' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>Advanced Analytics</button>
                            </div>

                            {rightTab === 'metrics' ? (
                                <Dashboard data={filteredData} showNearRepeats={showNearRepeats} nearRepeatData={nearRepeatData} showLisa={showLisa} lisaData={lisaData} />
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                    {/* Layer Manager */}
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-100 mb-4">GIS Layer Manager</h3>
                                        
                                        <div className="space-y-4">
                                            {/* KDE Heatmap */}
                                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative overflow-hidden">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <Flame className={`w-5 h-5 ${showHeatmap ? 'text-orange-500' : 'text-slate-500'}`} />
                                                        <div>
                                                            <div className="font-semibold text-sm text-slate-200">KDE Heatmap</div>
                                                            <div className="text-[10px] text-slate-400" title="Kernel Density Estimation visualizes continuous hotspots.">Density estimation • {kdeBandwidth}m</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setShowHeatmap(!showHeatmap)} className={`w-12 h-6 rounded-full transition-colors relative ${showHeatmap ? 'bg-orange-500' : 'bg-slate-600'}`}>
                                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${showHeatmap ? 'left-7' : 'left-1'}`} />
                                                    </button>
                                                </div>
                                                {showHeatmap && (
                                                    <div className="space-y-3 pt-3 border-t border-slate-700/50">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400">Opacity</span>
                                                            <input type="range" min="0.1" max="1" step="0.1" value={layerOpacity.heatmap} onChange={e => setLayerOpacity({...layerOpacity, heatmap: Number(e.target.value)})} className="w-32 accent-orange-500" />
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400">Radius</span>
                                                            <input type="range" min="50" max="500" step="10" value={kdeBandwidth} onChange={e => setKdeBandwidth(Number(e.target.value))} className="w-32 accent-orange-500" />
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400">Weight</span>
                                                            <select value={kdeWeight} onChange={e => setKdeWeight(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-1 text-slate-300">
                                                                <option>None</option><option>Fear Score</option><option>Environmental Severity</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Predictive Risk Zones */}
                                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <Target className={`w-5 h-5 ${showRiskZones ? 'text-purple-500' : 'text-slate-500'}`} />
                                                        <div>
                                                            <div className="font-semibold text-sm text-slate-200">Predictive Risk Zones</div>
                                                            <div className="text-[10px] text-slate-400" title="RTM surfaces generated from environmental risk factors.">RTM surfaces • 150m buffer</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setShowRiskZones(!showRiskZones)} className={`w-12 h-6 rounded-full transition-colors relative ${showRiskZones ? 'bg-purple-500' : 'bg-slate-600'}`}>
                                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${showRiskZones ? 'left-7' : 'left-1'}`} />
                                                    </button>
                                                </div>
                                                {showRiskZones && (
                                                    <div className="space-y-3 pt-4 mt-3 border-t border-slate-700/50">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400">Opacity</span>
                                                            <input type="range" min="0.05" max="0.5" step="0.05" value={layerOpacity.riskZones} onChange={e => setLayerOpacity({...layerOpacity, riskZones: Number(e.target.value)})} className="w-32 accent-purple-500" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* LISA Hotspots */}
                                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <Hexagon className={`w-5 h-5 ${showLisa ? 'text-blue-500' : 'text-slate-500'}`} />
                                                        <div>
                                                            <div className="font-semibold text-sm text-slate-200">LISA Hotspots</div>
                                                            <div className="text-[10px] text-slate-400" title="Getis-Ord Gi* local indicator of spatial association.">Hex-grid statistics • {lisaResolution}m</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setShowLisa(!showLisa)} className={`w-12 h-6 rounded-full transition-colors relative ${showLisa ? 'bg-blue-500' : 'bg-slate-600'}`}>
                                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${showLisa ? 'left-7' : 'left-1'}`} />
                                                    </button>
                                                </div>
                                                {showLisa && (
                                                    <div className="space-y-3 pt-3 border-t border-slate-700/50">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400">Opacity</span>
                                                            <input type="range" min="0.1" max="1" step="0.1" value={layerOpacity.lisa} onChange={e => setLayerOpacity({...layerOpacity, lisa: Number(e.target.value)})} className="w-32 accent-blue-500" />
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400">Resolution</span>
                                                            <input type="range" min="50" max="250" step="25" value={lisaResolution} onChange={e => setLisaResolution(Number(e.target.value))} className="w-32 accent-blue-500" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Near-Repeat */}
                                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <Activity className={`w-5 h-5 ${showNearRepeats ? 'text-red-500' : 'text-slate-500'}`} />
                                                        <div>
                                                            <div className="font-semibold text-sm text-slate-200">Near-Repeat Linkages</div>
                                                            <div className="text-[10px] text-slate-400" title="Spatially contagious risk propagation zones.">Contagion zones • {nearRepeatBand}m</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setShowNearRepeats(!showNearRepeats)} className={`w-12 h-6 rounded-full transition-colors relative ${showNearRepeats ? 'bg-red-500' : 'bg-slate-600'}`}>
                                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${showNearRepeats ? 'left-7' : 'left-1'}`} />
                                                    </button>
                                                </div>
                                                {showNearRepeats && (
                                                    <div className="space-y-3 pt-3 border-t border-slate-700/50">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400">Opacity</span>
                                                            <input type="range" min="0.1" max="1" step="0.1" value={layerOpacity.nearRepeat} onChange={e => setLayerOpacity({...layerOpacity, nearRepeat: Number(e.target.value)})} className="w-32 accent-red-500" />
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400">Spatial Band</span>
                                                            <input type="range" min="100" max="400" step="50" value={nearRepeatBand} onChange={e => setNearRepeatBand(Number(e.target.value))} className="w-32 accent-red-500" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            </div>
        </div>
    );
}

export default App;
