import React, { useState } from 'react';
import { Shield, AlertTriangle, AlertOctagon, X, MapPin, Zap, TrendingDown, Lightbulb } from 'lucide-react';

const SafetyCard = ({ report, onClose }) => {
    if (!report) return null;

    const [isSimulating, setIsSimulating] = useState(false);

    if (!report.hasData) {
        return (
            <div className="absolute bottom-4 left-4 right-4 md:left-[50%] md:translate-x-[-50%] md:bottom-8 z-30 max-w-md mx-auto animate-in slide-in-from-bottom-4 fade-in">
                <div className="bg-white rounded-xl shadow-2xl p-6 border border-slate-200 relative">
                    <button onClick={onClose} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <MapPin className="w-6 h-6 text-slate-400" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg">Uncharted Territory</h3>
                        <p className="text-slate-600 mt-1 text-sm">No survey data for this location yet. Be the first to report!</p>
                    </div>
                </div>
            </div>
        );
    }

    const { verdict, badgeColor, details, pointCount, rtmScore, simulatedRTMScore, globalRTMScore, perceivedFearIndex, shap } = report;
    const currentScore = isSimulating ? simulatedRTMScore : rtmScore;

    return (
        <div className="absolute bottom-4 left-4 right-4 md:left-[50%] md:translate-x-[-50%] md:bottom-8 z-30 max-w-md mx-auto animate-in slide-in-from-bottom-4 fade-in">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                {/* Header - The Verdict */}
                <div className="p-5 border-b border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Safety Verdict</p>
                                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-mono">Fear Index: {perceivedFearIndex}/5</span>
                            </div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${isSimulating ? 'bg-green-100 text-green-700 border-green-200' : badgeColor}`}>
                                {!isSimulating && verdict === 'HIGH RISK' && <AlertOctagon className="w-4 h-4" />}
                                {!isSimulating && verdict === 'CAUTION' && <AlertTriangle className="w-4 h-4" />}
                                {(isSimulating || verdict === 'SAFE') && <Shield className="w-4 h-4" />}
                                <span className="font-bold text-sm">{isSimulating ? 'SIMULATED POST-INTERVENTION' : verdict}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body - The Details */}
                <div className="p-5 space-y-4">
                    {/* RTM Comparison Bar */}
                    <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">RTM Severity Score</p>
                            {isSimulating && (
                                <span className="text-xs font-bold text-green-600 flex items-center gap-1 bg-green-100 px-2 py-0.5 rounded">
                                    <TrendingDown className="w-3 h-3" />
                                    Drop: {rtmScore - simulatedRTMScore}%
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className={`font-bold ${isSimulating ? 'text-green-700' : 'text-slate-800'}`}>Local Area (100m Buffer)</span>
                                    <span className="font-bold">{currentScore}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden relative">
                                    <div className={`h-full absolute left-0 top-0 transition-all duration-500 ${isSimulating ? 'bg-green-500' : (badgeColor.split(' ')[0] || 'bg-slate-500')}`} style={{ width: `${currentScore}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex-1">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-500">Global Bariga Average</span>
                                    <span className="text-slate-500">{globalRTMScore}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-400" style={{ width: `${globalRTMScore}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Environmental Risk Drivers (SHAP Explanations)</p>
                        {/* Lighting */}
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${isSimulating ? 'bg-green-100' : 'bg-slate-100'} flex items-center justify-center flex-shrink-0`}>
                                <span className="text-base">{isSimulating ? '💡' : '🔦'}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-medium">Lighting Status</span>
                                    <span className="font-bold text-slate-400">{isSimulating ? '0%' : `${shap.lighting}%`} driver</span>
                                </div>
                                <p className={`text-sm font-semibold ${isSimulating ? 'text-green-600 line-through' : 'text-slate-800'}`}>
                                    {details.lighting}
                                </p>
                            </div>
                        </div>

                        {/* Disorder */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-base">⚠️</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-medium">Disorder Alert</span>
                                    <span className="font-bold text-slate-400">{shap.disorder}% driver</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-800">
                                    {details.disorder}
                                </p>
                            </div>
                        </div>

                        {/* Permeability */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-base">🗺️</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-medium">Layout Permeability</span>
                                    <span className="font-bold text-slate-400">{shap.permeability}% driver</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-800">
                                    {details.permeability}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <button 
                            onClick={() => setIsSimulating(!isSimulating)}
                            className={`w-full py-2 px-4 rounded-lg font-bold text-sm flex justify-center items-center gap-2 transition-colors ${isSimulating ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}
                        >
                            {isSimulating ? (
                                <>Cancel Simulation</>
                            ) : (
                                <><Lightbulb className="w-4 h-4" /> Simulate CPTED: Add Streetlights</>
                            )}
                        </button>
                    </div>

                    <div className="mt-2 text-center">
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Based on <span className="font-bold">{pointCount}</span> data points. SHAP values explain % risk contribution.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SafetyCard;
