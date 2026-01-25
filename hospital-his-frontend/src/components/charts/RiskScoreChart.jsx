import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, TrendingUp, Shield } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1/';
const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

/**
 * RiskScoreChart - Displays risk score history as an area chart
 * Shows timeline of risk score changes from vitals, lab, and radiology inputs
 */
const RiskScoreChart = ({ appointmentId, patientId }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (patientId) {
            fetchRiskHistory();
        }
    }, [patientId]);

    const fetchRiskHistory = async () => {
        try {
            setLoading(true);
            console.log('🔍 Fetching risk history for patient:', patientId);
            const response = await axios.get(
                `${API_URL}opd/patients/${patientId}/risk-history`,
                getConfig()
            );
            console.log('📊 Risk history response:', response.data);

            // Transform data for chart - reverse so oldest first
            const chartData = (response.data.data || []).reverse().map((entry, index) => ({
                id: entry._id,
                index: index + 1,
                time: new Date(entry.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                date: new Date(entry.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short'
                }),
                score: entry.newFinalRiskScore,
                category: entry.newCategory,
                source: entry.source,
                riskLevel: entry.selectedRiskLevel,
                news2: entry.news2Points,
                updatedBy: entry.updatedBy?.profile?.firstName || 'System'
            }));

            console.log('📈 Chart data:', chartData);
            setHistory(chartData);
        } catch (err) {
            console.error('Error fetching risk history:', err);
            setError('Failed to load risk history');
        } finally {
            setLoading(false);
        }
    };

    const getSourceLabel = (source) => {
        switch (source) {
            case 'VITALS': return '📊 Vitals';
            case 'LAB_RISK': return '🧪 Lab';
            case 'RADIOLOGY_RISK': return '📷 Radiology';
            default: return source;
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'HIGH': return '#ef4444';
            case 'MEDIUM': return '#f59e0b';
            case 'LOW': return '#22c55e';
            default: return '#6b7280';
        }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-bold text-slate-800">Score: {data.score}</p>
                    <p className="text-sm text-gray-500">{data.date} at {data.time}</p>
                    <p className="text-sm mt-1">
                        <span className="font-medium">{getSourceLabel(data.source)}</span>
                    </p>
                    {data.riskLevel && (
                        <p className="text-xs text-gray-500">Risk Level: {data.riskLevel}</p>
                    )}
                    {data.news2 !== undefined && data.news2 !== null && (
                        <p className="text-xs text-gray-500">NEWS2: {data.news2}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">By: {data.updatedBy}</p>
                </div>
            );
        }
        return null;
    };

    // Get current risk score
    const currentScore = history.length > 0 ? history[history.length - 1] : null;

    if (!appointmentId) {
        return (
            <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500">
                No appointment selected
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6 bg-white rounded-xl border border-gray-100">
                <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                    <div className="h-4 bg-gray-200 rounded w-40"></div>
                </div>
                <div className="mt-4 h-48 bg-gray-100 rounded-lg"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 rounded-xl text-red-600 text-center">
                {error}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Risk Score Timeline</h3>
                        <p className="text-xs text-gray-500">Combined NEWS2 + Lab + Radiology Risk</p>
                    </div>
                </div>

                {currentScore && (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-2xl font-bold text-slate-800">{currentScore.score}</p>
                            <p className="text-xs text-gray-500">Current Score</p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${currentScore.category === 'HIGH' ? 'bg-red-100 text-red-700' :
                            currentScore.category === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                'bg-green-100 text-green-700'
                            }`}>
                            {currentScore.category}
                        </div>
                    </div>
                )}
            </div>

            {/* Chart */}
            {history.length > 0 ? (
                <div className="p-4">
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                axisLine={{ stroke: '#e5e7eb' }}
                                tickLine={false}
                            />
                            <YAxis
                                domain={[0, 'auto']}
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            {/* Risk thresholds */}
                            <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'High', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                            <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Med', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                            <Area
                                type="monotone"
                                dataKey="score"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fill="url(#riskGradient)"
                                dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2, fill: '#fff' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>

                    {/* Legend */}
                    <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span> Low (0-4)
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-amber-500"></span> Medium (5-6)
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-red-500"></span> High (≥7)
                        </span>
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center">
                    <Activity size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No risk score history yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Score will update when vitals are recorded or risk levels are set
                    </p>
                </div>
            )}

            {/* History timeline */}
            {history.length > 0 && (
                <div className="border-t border-gray-100 p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Shield size={14} /> Change History (Latest First)
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {[...history].reverse().slice(0, 10).map((entry, idx) => (
                            <div key={entry.id || idx} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${entry.category === 'HIGH' ? 'bg-red-500' :
                                        entry.category === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500'
                                        }`}></span>
                                    <span className="font-medium text-slate-700">Score: {entry.score}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-500">{getSourceLabel(entry.source)}</span>
                                </div>
                                <span className="text-gray-400">{entry.date} {entry.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RiskScoreChart;
