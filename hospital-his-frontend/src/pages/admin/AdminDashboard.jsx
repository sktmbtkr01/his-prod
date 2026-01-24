import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, TrendingDown, DollarSign, Users, Activity, Bed,
    Clock, AlertTriangle, Shield, Server, RefreshCw, ChevronRight,
    Zap, Target, BarChart3, PieChart, Stethoscope, Pill, FlaskConical,
    Radio, Calendar, Heart, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { getGovernanceDashboard, getAlerts, acknowledgeAlert } from '../../services/admin.service';
import './AdminDashboard.css';

/**
 * Admin Governance Dashboard
 * Mission Control for Hospital Operations
 * 
 * Design Principle: Patterns, not Patients
 * All data is aggregated - no patient-identifiable information
 */

const CHART_COLORS = {
    primary: '#7c3aed',      // Vibrant Purple
    secondary: '#a855f7',    // Light Purple
    success: '#22c55e',      // Bright Green
    warning: '#f97316',      // Bright Orange
    danger: '#ef4444',       // Bright Red
    info: '#0ea5e9',         // Sky Blue
    teal: '#14b8a6',         // Teal
    pink: '#ec4899',         // Pink
    pharmacy: '#22c55e',     // Green
    laboratory: '#a855f7',   // Purple
    radiology: '#f97316',    // Orange
    consultation: '#0ea5e9'  // Blue
};

// Animated KPI Card Component
const KPICard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="gov-kpi-card"
        style={{ '--accent-color': color }}
    >
        <div className="gov-kpi-icon-wrapper" style={{ background: `${color}15` }}>
            <Icon size={24} style={{ color }} />
        </div>
        <div className="gov-kpi-content">
            <span className="gov-kpi-title">{title}</span>
            <span className="gov-kpi-value">{value}</span>
            {subtitle && <span className="gov-kpi-subtitle">{subtitle}</span>}
        </div>
        {trend && (
            <div className={`gov-kpi-trend ${trend}`}>
                {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{trendValue}%</span>
            </div>
        )}
    </motion.div>
);

// Section Card Component
const SectionCard = ({ title, icon: Icon, children, className = '', action }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={`gov-section-card ${className}`}
    >
        <div className="gov-section-header">
            <div className="gov-section-title">
                <Icon size={20} />
                <h3>{title}</h3>
            </div>
            {action}
        </div>
        <div className="gov-section-content">
            {children}
        </div>
    </motion.div>
);

// Compliance Gauge Component
const ComplianceGauge = ({ score }) => {
    const getStatusColor = () => {
        if (score >= 80) return CHART_COLORS.success;
        if (score >= 60) return CHART_COLORS.warning;
        return CHART_COLORS.danger;
    };

    return (
        <div className="gov-compliance-gauge">
            <svg viewBox="0 0 120 120" className="gov-gauge-svg">
                <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="10"
                />
                <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke={getStatusColor()}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${score * 3.14} 314`}
                    transform="rotate(-90 60 60)"
                    className="gov-gauge-progress"
                />
            </svg>
            <div className="gov-gauge-center">
                <span className="gov-gauge-value">{score}</span>
                <span className="gov-gauge-label">Score</span>
            </div>
        </div>
    );
};

// System Health Indicator
const SystemHealthIndicator = ({ name, status }) => {
    const getStatusIcon = () => {
        switch (status) {
            case 'healthy': return <CheckCircle2 size={16} className="gov-status-healthy" />;
            case 'degraded': return <AlertCircle size={16} className="gov-status-warning" />;
            default: return <XCircle size={16} className="gov-status-danger" />;
        }
    };

    return (
        <div className="gov-health-indicator">
            {getStatusIcon()}
            <span className="gov-health-name">{name}</span>
            <span className={`gov-health-status ${status}`}>{status}</span>
        </div>
    );
};

// Smart Insight Component
const InsightCard = ({ insight }) => {
    const getTypeStyles = () => {
        switch (insight.type) {
            case 'critical': return { bg: '#fef2f2', border: '#fecaca', icon: AlertTriangle, color: '#ef4444' };
            case 'warning': return { bg: '#fffbeb', border: '#fde68a', icon: AlertCircle, color: '#f59e0b' };
            case 'success': return { bg: '#ecfdf5', border: '#a7f3d0', icon: CheckCircle2, color: '#10b981' };
            default: return { bg: '#eff6ff', border: '#bfdbfe', icon: Zap, color: '#3b82f6' };
        }
    };

    const styles = getTypeStyles();
    const IconComponent = styles.icon;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="gov-insight-card"
            style={{ background: styles.bg, borderColor: styles.border }}
        >
            <div className="gov-insight-icon" style={{ color: styles.color }}>
                <IconComponent size={20} />
            </div>
            <div className="gov-insight-content">
                <p className="gov-insight-message">{insight.message}</p>
                {insight.action && (
                    <span className="gov-insight-action">{insight.action}</span>
                )}
            </div>
        </motion.div>
    );
};

// Quick Action Button
const QuickActionButton = ({ icon: Icon, label, onClick }) => (
    <button className="gov-quick-action" onClick={onClick}>
        <Icon size={24} />
        <span>{label}</span>
    </button>
);

// Main Dashboard Component
const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadDashboard = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const [dashResponse, alertsResponse] = await Promise.all([
                getGovernanceDashboard(),
                getAlerts().catch(() => ({ data: { alerts: [] } }))
            ]);

            setData(dashResponse.data);
            setAlerts(alertsResponse.data?.alerts || []);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error('Dashboard load error:', err);
            setError(err.response?.data?.error || 'Failed to load dashboard');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
        // Auto-refresh every 5 minutes
        const interval = setInterval(() => loadDashboard(true), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [loadDashboard]);

    const handleAcknowledge = async (alertType) => {
        try {
            await acknowledgeAlert(alertType, 'Acknowledged from dashboard');
            loadDashboard(true);
        } catch (err) {
            console.error('Failed to acknowledge alert:', err);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="gov-dashboard gov-loading">
                <div className="gov-loading-container">
                    <div className="gov-loading-spinner"></div>
                    <p>Loading Mission Control...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="gov-dashboard gov-error">
                <div className="gov-error-container">
                    <AlertTriangle size={48} />
                    <h2>Dashboard Error</h2>
                    <p>{error}</p>
                    <button onClick={() => loadDashboard()}>Retry</button>
                </div>
            </div>
        );
    }

    const { revenue, patients, beds, staff, compliance, system, insights } = data || {};

    // Prepare chart data
    const departmentRevenueData = [
        { name: 'Pharmacy', value: revenue?.byDepartment?.pharmacy || 0, color: CHART_COLORS.pharmacy },
        { name: 'Laboratory', value: revenue?.byDepartment?.laboratory || 0, color: CHART_COLORS.laboratory },
        { name: 'Radiology', value: revenue?.byDepartment?.radiology || 0, color: CHART_COLORS.radiology },
        { name: 'Consultation', value: revenue?.byDepartment?.consultation || 0, color: CHART_COLORS.consultation }
    ];

    const paymentBreakdownData = [
        { name: 'Paid', value: revenue?.paymentBreakdown?.paid || 0, color: CHART_COLORS.success },
        { name: 'Partial', value: revenue?.paymentBreakdown?.partial || 0, color: CHART_COLORS.warning },
        { name: 'Pending', value: revenue?.paymentBreakdown?.pending || 0, color: CHART_COLORS.danger }
    ];

    const productivityRadarData = staff?.departmentScores?.map(d => ({
        subject: d.name,
        score: d.score,
        fullMark: 100
    })) || [];

    // Department patient distribution for pie chart
    const departmentPatientData = staff?.departmentDistribution || [
        { name: 'General Med', patients: 145, color: '#22c55e' },
        { name: 'Gynae & Obs', patients: 98, color: '#ec4899' },
        { name: 'Orthopedics', patients: 87, color: '#f97316' },
        { name: 'Pediatrics', patients: 76, color: '#a855f7' },
        { name: 'Cardiology', patients: 65, color: '#ef4444' },
        { name: 'ENT', patients: 54, color: '#0ea5e9' },
        { name: 'Dermatology', patients: 48, color: '#14b8a6' },
        { name: 'Ophthalmology', patients: 42, color: '#f59e0b' },
        { name: 'Neurology', patients: 38, color: '#6366f1' },
        { name: 'Emergency', patients: 125, color: '#dc2626' }
    ];

    return (
        <div className="gov-dashboard">
            {/* Header */}
            <header className="gov-dashboard-header">
                <div className="gov-header-left">
                    <h1>
                        <Shield size={28} />
                        Admin Governance Dashboard
                    </h1>
                    <span className="gov-header-tagline">Patterns, not Patients</span>
                </div>
                <div className="gov-header-right">
                    <button
                        className="gov-refresh-btn"
                        onClick={() => loadDashboard(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw size={18} className={refreshing ? 'gov-spinning' : ''} />
                        Refresh
                    </button>
                    {lastUpdated && (
                        <span className="gov-last-updated">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </header>

            {/* Alerts Banner */}
            {alerts.length > 0 && (
                <div className="gov-alerts-banner">
                    <h3>🔔 Active Alerts ({alerts.length})</h3>
                    <div className="gov-alerts-list">
                        {alerts.slice(0, 3).map((alert, idx) => (
                            <div key={idx} className={`gov-alert-item severity-${alert.severity}`}>
                                <span className="gov-alert-icon">
                                    {alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🟢'}
                                </span>
                                <span className="gov-alert-message">{alert.message}</span>
                                <button onClick={() => handleAcknowledge(alert.type)}>Acknowledge</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Smart Insights Panel */}
            {insights && insights.length > 0 && (
                <section className="gov-insights-section">
                    <h2><Zap size={20} /> Smart Insights</h2>
                    <div className="gov-insights-grid">
                        {insights.map((insight, idx) => (
                            <InsightCard key={idx} insight={insight} />
                        ))}
                    </div>
                </section>
            )}

            {/* KPI Overview Row */}
            <section className="gov-kpi-section">
                <KPICard
                    title="MONTHLY REVENUE"
                    value={formatCurrency(revenue?.month?.revenue)}
                    trend={revenue?.growth?.trend}
                    trendValue={Math.abs(revenue?.growth?.percentage || 0)}
                    icon={DollarSign}
                    color={CHART_COLORS.success}
                    delay={0}
                />
                <KPICard
                    title="BED OCCUPANCY"
                    value={`${beds?.summary?.occupancyRate || 0}%`}
                    subtitle={`${beds?.summary?.available || 0} available`}
                    icon={Bed}
                    color={CHART_COLORS.secondary}
                    delay={0.1}
                />
                <KPICard
                    title="ER WAIT TIME"
                    value={`${patients?.emergency?.avgWaitTime || 0} min`}
                    subtitle="NORMAL"
                    icon={Clock}
                    color={CHART_COLORS.warning}
                    delay={0.2}
                />
                <KPICard
                    title="COMPLIANCE SCORE"
                    value={`${compliance?.score || 0}/100`}
                    subtitle={compliance?.status?.toUpperCase()}
                    icon={Shield}
                    color={compliance?.score >= 80 ? CHART_COLORS.success : CHART_COLORS.warning}
                    delay={0.3}
                />
                <KPICard
                    title="PENDING COLLECTION"
                    value={formatCurrency(revenue?.month?.pending)}
                    subtitle={`${revenue?.pendingBillCount || 0} bills`}
                    icon={BarChart3}
                    color={CHART_COLORS.danger}
                    delay={0.4}
                />
                <KPICard
                    title="ACTIVE USERS (24H)"
                    value={staff?.activeStaff24h || 0}
                    subtitle={`${staff?.byRole?.locked || 0} locked`}
                    icon={Users}
                    color={CHART_COLORS.info}
                    delay={0.5}
                />
            </section>

            {/* Quick Actions */}
            <section className="gov-quick-actions-section">
                <h3>Quick Actions</h3>
                <div className="gov-quick-actions-grid">
                    <QuickActionButton icon={Users} label="User Management" onClick={() => navigate('/admin/users')} />
                    <QuickActionButton icon={Shield} label="Break-Glass" onClick={() => navigate('/admin/break-glass')} />
                    <QuickActionButton icon={TrendingUp} label="Revenue Anomalies" onClick={() => navigate('/admin/revenue-anomalies')} />
                    <QuickActionButton icon={BarChart3} label="Audit Logs" onClick={() => navigate('/admin/audit-logs')} />
                    <QuickActionButton icon={Target} label="Master Data" onClick={() => navigate('/admin/master-data')} />
                    <QuickActionButton icon={Server} label="System Health" onClick={() => navigate('/admin/system')} />
                </div>
            </section>

            {/* Main Dashboard Grid */}
            <div className="gov-dashboard-grid">
                {/* Revenue Analytics */}
                <SectionCard title="Revenue Trend (14 Days)" icon={TrendingUp} className="gov-span-2">
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={revenue?.dailyTrend || []}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCollections" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v?.slice(5) || ''} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                formatter={(value) => [formatCurrency(value), '']}
                            />
                            <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                            <Area type="monotone" dataKey="collections" stroke={CHART_COLORS.success} fillOpacity={1} fill="url(#colorCollections)" name="Collections" />
                        </AreaChart>
                    </ResponsiveContainer>
                </SectionCard>

                {/* Department Revenue */}
                <SectionCard title="Department Revenue" icon={PieChart}>
                    <ResponsiveContainer width="100%" height={250}>
                        <RePieChart>
                            <Pie
                                data={departmentRevenueData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {departmentRevenueData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                        </RePieChart>
                    </ResponsiveContainer>
                </SectionCard>

                {/* Incidents & Safety */}
                <SectionCard
                    title="Incidents & Safety"
                    icon={AlertTriangle}
                    action={<button className="gov-view-all" onClick={() => navigate('/admin/incidents')}>View All →</button>}
                >
                    <div className="gov-stat-list">
                        <div className="gov-stat-row">
                            <span>Total Incidents (MTD)</span>
                            <span className="gov-stat-value">{compliance?.metrics?.incidents || 0}</span>
                        </div>
                        <div className="gov-stat-row">
                            <span>Break-Glass Usage</span>
                            <span className="gov-stat-value">{compliance?.metrics?.breakGlassUsage || 0}</span>
                        </div>
                        <div className="gov-stat-row">
                            <span>Policy Violations</span>
                            <span className="gov-stat-value">{compliance?.metrics?.policyViolations || 0}</span>
                        </div>
                        <div className="gov-stat-row">
                            <span>Audit Logs (MTD)</span>
                            <span className="gov-stat-value">{compliance?.metrics?.auditLogs || 0}</span>
                        </div>
                    </div>
                </SectionCard>

                {/* Compliance Status */}
                <SectionCard title="Compliance Status" icon={CheckCircle2}>
                    <div className="gov-compliance-container">
                        <ComplianceGauge score={compliance?.score || 0} />
                        <div className="gov-compliance-areas">
                            {compliance?.areas?.map((area, idx) => (
                                <div key={idx} className={`gov-compliance-area ${area.status}`}>
                                    <span className="gov-area-name">{area.name}</span>
                                    <span className={`gov-area-status ${area.status}`}>
                                        {area.status === 'compliant' ? <CheckCircle2 size={14} /> :
                                            area.status === 'warning' ? <AlertCircle size={14} /> : <XCircle size={14} />}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </SectionCard>

                {/* System Health */}
                <SectionCard title="System Health" icon={Server}>
                    <div className="gov-system-health">
                        <div className="gov-health-summary">
                            <div className={`gov-health-badge ${system?.status}`}>
                                {system?.status === 'healthy' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                                <span>{system?.status?.toUpperCase()}</span>
                            </div>
                            <div className="gov-health-stats">
                                <div className="gov-health-stat">
                                    <span className="gov-stat-label">Uptime</span>
                                    <span className="gov-stat-value">{system?.uptime?.formatted || '0d 0h 0m'}</span>
                                </div>
                                <div className="gov-health-stat">
                                    <span className="gov-stat-label">Memory</span>
                                    <span className="gov-stat-value">{system?.memory?.used || 0} / {system?.memory?.total || 0} MB</span>
                                </div>
                            </div>
                        </div>
                        <div className="gov-services-list">
                            {system?.services?.map((service, idx) => (
                                <SystemHealthIndicator key={idx} name={service.name} status={service.status} />
                            ))}
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Department Volume" icon={Target} className="gov-span-2">
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <div style={{ flex: 1, height: 280 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={departmentPatientData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="patients"
                                        nameKey="name"
                                    >
                                        {departmentPatientData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={1} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [`${value} Patients`, 'Volume']}
                                        itemStyle={{ color: '#1f2937' }}
                                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ flex: 1, paddingLeft: 20, maxHeight: 280, overflowY: 'auto' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#6b7280' }}>Patient Distribution</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {departmentPatientData.map((entry, index) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }}></div>
                                            <span style={{ fontWeight: 500, color: '#374151' }}>{entry.fullName || entry.name}</span>
                                        </div>
                                        <span style={{ fontWeight: 600, color: '#111827' }}>{entry.patients}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* Footer */}
            <footer className="gov-dashboard-footer">
                <p>
                    <Shield size={14} />
                    <strong>Governance Mode:</strong> This dashboard shows aggregate operational metrics only.
                    Patient-identifiable information is not accessible from Admin role.
                </p>
            </footer>
        </div>
    );
};

export default AdminDashboard;
