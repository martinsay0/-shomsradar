import React, { useState, useMemo } from 'react';
import MapComponent from './MapComponent';
import Dashboard from './Dashboard';
import { mockData } from './mockData';
import DayNightToggle from './DayNightToggle';
import SearchBar from './SearchBar';
import SafetyCard from './SafetyCard';
import { calculateRiskScore } from './utils/riskAnalysis';
import {
    Radar,
    AlertTriangle,
    Lightbulb,
    Footprints,
    LayoutDashboard,
    Menu
} from 'lucide-react';

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isNightMode, setIsNightMode] = useState(false);
    const [filters, setFilters] = useState({
        brokenWindows: false,
        darkSpots: false,
        escapeRoutes: false,
    });

    // Search & Report State
    const [searchReport, setSearchReport] = useState(null);

    const toggleFilter = (key) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSearch = (query) => {
        // Simple client-side search simulation
        // In a real app, this would use a Geocoding API
        // Here, we search our mockData for street names
        const found = mockData.find(p => p.street_name && p.street_name.toLowerCase().includes(query.toLowerCase()));

        if (found) {
            const report = calculateRiskScore(found.coordinates[0], found.coordinates[1], mockData);
            setSearchReport(report);
            // Ideally we would also pan the map to 'found.coordinates'
        } else {
            // No match found
            setSearchReport({ hasData: false });
        }
    };

    const handleUseLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                // Since we are mocking, and the user is likely NOT in Shomolu, 
                // this might return 0 results unless we fake the coords to be in Shomolu
                // For demo purposes, we will pick a random valid location from MockData to simulate "User is here"
                const randomPoint = mockData[Math.floor(Math.random() * mockData.length)];
                const report = calculateRiskScore(randomPoint.coordinates[0], randomPoint.coordinates[1], mockData);
                setSearchReport(report);
            }, (error) => {
                console.error("Error getting location:", error);
                alert("Could not get your location.");
            });
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    };

    const filteredData = useMemo(() => {
        return mockData.filter(item => {
            // If a filter is active, the item must match the criteria.
            // If multiple filters are active, it must match ALL (AND logic).

            if (filters.brokenWindows) {
                // disorder contains "Abandoned..." or "Graffiti"
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
        });
    }, [filters]);

    return (
        <div className="flex h-screen w-full bg-slate-900 text-slate-100 overflow-hidden font-sans">

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-8 group cursor-default">
                        <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-110">
                            <Radar className="w-6 h-6 text-white group-hover:animate-spin-slow" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight tracking-tight">Shoms<br /><span className="text-indigo-400">Radar</span></h1>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">Decoding the Fear of Crime in Shomolu</p>
                        </div>
                    </div>

                    <div className="space-y-6 flex-1">

                        <div className="space-y-2">
                            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Analysis Modes</h2>

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

                        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                <LayoutDashboard className="w-4 h-4 text-indigo-400" /> Status
                            </h3>
                            <div className="text-sm text-slate-400 flex justify-between">
                                <span>Visible Points:</span>
                                <span className="text-white font-mono">{filteredData.length} / {mockData.length}</span>
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
                {/* Mobile Header */}
                <div className="lg:hidden p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between z-30">
                    <h1 className="font-bold text-lg">ShomsRadar</h1>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-300">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="ml-auto mr-4">
                        <DayNightToggle isNightMode={isNightMode} onToggle={() => setIsNightMode(!isNightMode)} />
                    </div>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">

                    {/* Map Section - Takes 2/3 on desktop */}
                    <div className="flex-1 h-[50vh] lg:h-full p-4 lg:p-6 relative">
                        <SearchBar onSearch={handleSearch} onUseLocation={handleUseLocation} />

                        {searchReport && (
                            <SafetyCard
                                report={searchReport}
                                onClose={() => setSearchReport(null)}
                            />
                        )}

                        <div className="absolute top-6 left-6 z-10 bg-slate-900/90 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 shadow-xl pointer-events-none mt-16 md:mt-0">
                            <h2 className="text-sm font-semibold text-slate-200">Live Radar Map</h2>
                            <div className="flex items-center gap-3 mt-1 text-xs">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Safe (≥3)</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Unsafe (&lt;3)</span>
                            </div>
                        </div>

                        <div className="absolute top-6 right-6 z-10 hidden lg:block">
                            <DayNightToggle isNightMode={isNightMode} onToggle={() => setIsNightMode(!isNightMode)} />
                        </div>

                        <MapComponent data={filteredData} isNightMode={isNightMode} />
                    </div>

                    {/* Dashboard Sidebar - Takes 1/3 on desktop, scrollable */}
                    <div className="h-[50vh] lg:h-full lg:w-[400px] xl:w-[450px] bg-slate-900 border-l border-slate-800 overflow-y-auto">
                        <div className="p-4 lg:p-6">
                            <h2 className="text-xl font-bold mb-6 text-slate-100 flex items-center gap-2">
                                Analytics
                                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-normal">Real-time</span>
                            </h2>
                            <Dashboard data={filteredData} />
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

export default App;
