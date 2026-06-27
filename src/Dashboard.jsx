import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ScatterChart, Scatter, PieChart, Pie } from 'recharts';
import { Activity } from 'lucide-react';

const Dashboard = ({ data, showNearRepeats, nearRepeatData }) => {
    // Metric: Infrastructure Gap (Nighttime Safety Drop)
    // Filter: No Streetlights
    const noLightPoints = data.filter(p => p.observed_environment.has_streetlight === "No");
    const gapStats = noLightPoints.reduce((acc, curr) => {
        const day = curr.fear_indicators.safety_day || 0;
        const night = curr.fear_indicators.safety_night || 0;
        acc.daySum += day;
        acc.nightSum += night;
        acc.count += 1;
        return acc;
    }, { daySum: 0, nightSum: 0, count: 0 });

    let dropPercentage = 0;
    if (gapStats.count > 0) {
        const avgDay = gapStats.daySum / gapStats.count;
        const avgNight = gapStats.nightSum / gapStats.count;
        if (avgDay > 0) {
            dropPercentage = ((avgDay - avgNight) / avgDay) * 100;
        }
    }

    // Chart 1: Fear Score by Streetlight (Yes vs No)
    const fearByLight = data.reduce((acc, curr) => {
        const hasLight = curr.observed_environment.has_streetlight === "Yes";
        const score = curr.fear_indicators.fear_robbery_street;

        if (hasLight) {
            acc.yes.total += score;
            acc.yes.count += 1;
        } else {
            acc.no.total += score;
            acc.no.count += 1;
        }
        return acc;
    }, { yes: { total: 0, count: 0 }, no: { total: 0, count: 0 } });

    const chart1Data = [
        { name: 'With Lights', score: fearByLight.yes.count ? (fearByLight.yes.total / fearByLight.yes.count).toFixed(2) : 0 },
        { name: 'No Lights', score: fearByLight.no.count ? (fearByLight.no.total / fearByLight.no.count).toFixed(2) : 0 },
    ];

    // Chart 2: Victimization Rate by Street Type
    const victimByStreet = data.reduce((acc, curr) => {
        const type = curr.observed_environment.street_type;
        const isVictim = curr.victimization.stolen_from === "Yes";

        if (!acc[type]) acc[type] = { total: 0, victims: 0 };
        acc[type].total += 1;
        if (isVictim) acc[type].victims += 1;

        return acc;
    }, {});

    const chart2Data = Object.keys(victimByStreet).map(type => ({
        name: type,
        rate: Math.round((victimByStreet[type].victims / victimByStreet[type].total) * 100)
    }));

    const scatterData = data.map(p => ({
        x: p.social?.social_cohesion || 0,
        y: p.fear_indicators.fear_robbery_street,
        name: `Loc ${p.id}`
    })).filter(p => p.x > 0); // Filter out points without social data if any

    // Top 3 Risk Interventions
    const topRisks = [...data]
        .sort((a, b) => (b.future_risk_score || 0) - (a.future_risk_score || 0))
        .slice(0, 3);

    const getRecommendation = (p) => {
        const recs = [];
        if (p.observed_environment.has_streetlight === "No") recs.push("Streetlight Installation");
        const hasDebris = p.observed_environment.visible_disorder.some(d => d.includes("Abandoned") || d.includes("Litter"));
        if (hasDebris) recs.push("Debris Clearing");
        if (p.observed_environment.street_type === "Alleyway") recs.push("Increased Patrols");
        
        if (recs.length === 0) return "General Monitoring";
        return `High priority for ${recs.join(" and ")}`;
    };

    return (
        <div className="grid grid-cols-1 gap-6 p-4 pb-20">
            {/* Metrics Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <p className="text-slate-400 text-sm">Total Points</p>
                    <p className="text-2xl font-bold text-white">{data.length}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <p className="text-slate-400 text-sm">Infrastructure Gap</p>
                    <p className="text-2xl font-bold text-red-400">
                        {dropPercentage.toFixed(0)}% <span className="text-xs text-slate-500 font-normal">Radar Score Drop (No Lights)</span>
                    </p>
                </div>
            </div>

            {/* Recommended Interventions Panel */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                    Recommended Interventions
                </h3>
                <div className="space-y-3">
                    {topRisks.map((p, idx) => (
                        <div key={`risk-rec-${p.id}`} className="bg-slate-900 p-3 rounded-lg border border-slate-700/50">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-mono text-slate-400">
                                    Coordinate [{p.coordinates[0].toFixed(2)}, {p.coordinates[1].toFixed(2)}]
                                </span>
                                <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                                    Risk: {p.future_risk_score}
                                </span>
                            </div>
                            <p className="text-sm text-slate-200">
                                {getRecommendation(p)}
                            </p>
                        </div>
                    ))}
                    {topRisks.length === 0 && (
                        <p className="text-xs text-slate-400">No high risk zones detected.</p>
                    )}
                </div>
            </div>

            {/* Chart 3: Social Shield */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-64 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">The "Social Shield": Cohesion vs Fear</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" dataKey="x" name="Social Cohesion" stroke="#94a3b8" fontSize={12} domain={[0, 5]} label={{ value: 'Social Cohesion', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }} />
                        <YAxis type="number" dataKey="y" name="Fear Level" stroke="#94a3b8" fontSize={12} domain={[0, 5]} label={{ value: 'Fear', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
                        <Scatter name="Locations" data={scatterData} fill="#f43f5e" />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            {/* Near-Repeat Contagion Chart */}
            {showNearRepeats && nearRepeatData?.stats && (
                <div className="bg-slate-800 p-4 rounded-xl border border-red-500/30 h-64 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <h3 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Near-Repeat Risk Contagion
                    </h3>
                    <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Clustered Risks', value: nearRepeatData.stats.clusteredCount || 0 },
                                    { name: 'Isolated Incidents', value: nearRepeatData.stats.isolatedCount || 0 }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                <Cell key="cell-0" fill="#ef4444" />
                                <Cell key="cell-1" fill="#475569" />
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Chart 1 */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-64 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Avg Fear Score vs. Lighting</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart1Data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 5]} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }}
                            cursor={{ fill: '#334155', opacity: 0.4 }}
                        />
                        <Bar dataKey="score" fill="#8884d8" radius={[4, 4, 0, 0]}>
                            {chart1Data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.name === 'No Lights' ? '#ef4444' : '#3b82f6'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Chart 2 */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-64 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Victimization Rate by Street Type (%)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart2Data} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} domain={[0, 100]} unit="%" />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }}
                            cursor={{ fill: '#334155', opacity: 0.4 }}
                        />
                        <Bar dataKey="rate" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Dashboard;
