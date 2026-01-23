import React from 'react';
import { Shield, AlertTriangle, AlertOctagon, X, MapPin } from 'lucide-react';

const SafetyCard = ({ report, onClose }) => {
    if (!report) return null;

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

    const { verdict, badgeColor, details, victimRate, avgFear } = report;

    return (
        <div className="absolute bottom-4 left-4 right-4 md:left-[50%] md:translate-x-[-50%] md:bottom-8 z-30 max-w-md mx-auto animate-in slide-in-from-bottom-4 fade-in">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                {/* Header - The Verdict */}
                <div className="p-5 border-b border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Safety Verdict</p>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${badgeColor}`}>
                                {verdict === 'HIGH RISK' && <AlertOctagon className="w-4 h-4" />}
                                {verdict === 'CAUTION' && <AlertTriangle className="w-4 h-4" />}
                                {verdict === 'SAFE' && <Shield className="w-4 h-4" />}
                                <span className="font-bold text-sm">{verdict}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body - The Details */}
                <div className="p-5 space-y-4">
                    <div className="space-y-3">
                        {/* Lighting */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-base">💡</span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Lighting Status</p>
                                <p className={`text-sm font-semibold ${details.lighting.includes('Dark') ? 'text-slate-800' : 'text-slate-800'}`}>
                                    {details.lighting}
                                </p>
                            </div>
                        </div>

                        {/* Disorder */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-base">⚠️</span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Disorder Alert</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {details.disorder}
                                </p>
                            </div>
                        </div>

                        {/* Protection */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-base">🛡️</span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Community Protection</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {details.protection}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Victimization Stat */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            <span className="font-bold text-slate-900">{victimRate}%</span> of residents nearby have reported theft in the last year.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SafetyCard;
