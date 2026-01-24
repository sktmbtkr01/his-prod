import React, { useState, useEffect, useCallback } from 'react';
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
import { getGovernanceDashboard } from '../../services/admin.service';
import './AdminGovernanceDashboard.css';

/**
 * Admin Governance Dashboard
 * Mission Control for Hospital Operations
 * 
 * Design Principle: Patterns, not Patients
 * All data is aggregated - no patient-identifiable information
 */

const CHART_COLORS = {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    pharmacy: '#10b981',
    laboratory: '#8b5cf6',
    radiology: '#f59e0b',
    consultation: '#3b82f6'
};

// Animated KPI Card Component
const KPICard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="kpi-card"
        style={{ '--accent-color': color }}
    >
        <div className="kpi-icon-wrapper" style={{ background: `${color}15` }}>
            <Icon size={24} style={{ color }} />
        </div>
        <div className="kpi-content">
            <span className="kpi-title">{title}</span>
            <span className="kpi-value">{value}</span>
            {subtitle && <span className="kpi-subtitle">{subtitle}</span>}
        </div>
        {trend && (
            <div className={`kpi-trend ${trend}`}>
                {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{trendValue}%</span>
            </div>
        )}
    </motion.div>
);

// Section Card Component
const SectionCard = ({ title, icon: Icon, children, className = '' }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={`section-card ${className}`}
    >
        <div className="section-header">
            <div className="section-title">
                <Icon size={20} />
                <h3>{title}</h3>
            </div>
        </div>
        <div className="section-content">
            {children}
        </div>
    </motion.div>
);

// Compliance Gauge Component
const ComplianceGauge = ({ score, status }) => {
    const getStatusColor = () => {
        if (score >= 80) return CHART_COLORS.success;
        if (score >= 60) return CHART_COLORS.warning;
        return CHART_COLORS.danger;
    };

    return (
        <div className="compliance-gauge">
            <svg viewBox="0 0 120 120" className="gauge-svg">
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
                    className="gauge-progress"
                />
            </svg>
            <div className="gauge-center">
                <span className="gauge-value">{score}</span>
                <span className="gauge-label">Score</span>
            </div>
        </div>
    );
};

// System Health Indicator
const SystemHealthIndicator = ({ name, status }) => {
    const getStatusIcon = () => {
        switch (status) {
            case 'healthy': return <CheckCircle2 size={16} className="status-healthy" />;
            case 'degraded': return <AlertCircle size={16} className="status-warning" />;
            default: return <XCircle size={16} className="status-danger" />;
        }
    };

    return (
        <div className="health-indicator">
            {getStatusIcon()}
            <span className="health-name">{name}</span>
            <span className={`health-status ${status}`}>{status}</span>
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
            className="insight-card"
            style={{ background: styles.bg, borderColor: styles.border }}
        >
            <div className="insight-icon" style={{ color: styles.color }}>
                {insight.icon || <IconComponent size={20} />}
            </div>
            <div className="insight-content">
                <p className="insight-message">{insight.message}</p>
                {insight.action && (
                    <span className="insight-action">{insight.action}</span>
                )}
            </div>
        </motion.div>
    );
};

// Main Dashboard Component
const AdminGovernanceDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadDashboard = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const response = await getGovernanceDashboard();
            setData(response.data);
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="governance-dashboard loading">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading Mission Control...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="governance-dashboard error">
                <div className="error-container">
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

    return (
        <div className="governance-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>
                        <Target size={28} />
                        Admin Governance Dashboard
                    </h1>
                    <span className="header-tagline">Mission Control • Patterns, not Patients</span>
                </div>
                <div className="header-right">
                    <button
                        className="refresh-btn"
                        onClick={() => loadDashboard(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    {lastUpdated && (
                        <span className="last-updated">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </header>

            {/* Smart Insights Panel */}
            {insights && insights.length > 0 && (
                <section className="insights-section">
                    <h2><Zap size={20} /> Smart Insights</h2>
                    <div className="insights-grid">
                        {insights.map((insight, idx) => (
                            <InsightCard key={idx} insight={insight} />
                        ))}
                    </div>
                </section>
            )}

            {/* KPI Overview Row */}
            <section className="kpi-section">
                <KPICard
                    title="Monthly Revenue"
                    value={formatCurrency(revenue?.month?.revenue)}
                    trend={revenue?.growth?.trend}
                    trendValue={Math.abs(revenue?.growth?.percentage || 0)}
                    icon={DollarSign}
                    color={CHART_COLORS.success}
                    delay={0}
                />
                <KPICard
                    title="Today's Collections"
                    value={formatCurrency(revenue?.today?.collections)}
                    subtitle={`of ${formatCurrency(revenue?.today?.revenue)}`}
                    icon={BarChart3}
                    color={CHART_COLORS.primary}
                    delay={0.1}
                />
                <KPICard
                    title="OPD Today"
                    value={patients?.opd?.today || 0}
                    trend={parseFloat(patients?.opd?.change) >= 0 ? 'up' : 'down'}
                    trendValue={Math.abs(parseFloat(patients?.opd?.change) || 0)}
                    icon={Users}
                    color={CHART_COLORS.info}
                    delay={0.2}
                />
                <KPICard
                    title="IPD Admissions"
                    value={patients?.ipd?.current || 0}
                    subtitle={`${patients?.ipd?.admissionsToday || 0} new today`}
                    icon={Bed}
                    color={CHART_COLORS.secondary}
                    delay={0.3}
                />
                <KPICard
                    title="Bed Occupancy"
                    value={`${beds?.summary?.occupancyRate || 0}%`}
                    subtitle={`${beds?.summary?.available || 0} available`}
                    icon={Activity}
                    color={CHART_COLORS.warning}
                    delay={0.4}
                />
                <KPICard
                    title="Compliance Score"
                    value={`${compliance?.score || 0}/100`}
                    subtitle={compliance?.status}
                    icon={Shield}
                    color={compliance?.score >= 80 ? CHART_COLORS.success : CHART_COLORS.warning}
                    delay={0.5}
                />
            </section>

            {/* Main Dashboard Grid */}
            <div className="dashboard-grid">
                {/* Revenue Analytics */}
                <SectionCard title="Revenue Trend (14 Days)" icon={TrendingUp} className="span-2">
                    <ResponsiveContainer width="100%" height={280}>
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
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
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
                    <ResponsiveContainer width="100%" height={280}>
                        <RePieChart>
                            <Pie
                                data={departmentRevenueData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
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

                {/* Patient Traffic Heatmap */}
                <SectionCard title="Hourly Traffic" icon={Clock} className="span-2">
                    <div className="heatmap-container">
                        {patients?.hourlyHeatmap?.map((hour, idx) => (
                            <div
                                key={idx}
                                className={`heatmap-cell intensity-${hour.intensity}`}
                                title={`${hour.hour}: ${hour.patients} patients`}
                            >
                                <span className="heatmap-hour">{hour.hour}</span>
                                <span className="heatmap-value">{hour.patients}</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* Bed Utilization */}
                <SectionCard title="Ward Occupancy" icon={Bed}>
                    <div className="ward-list">
                        {beds?.byWard?.slice(0, 5).map((ward, idx) => (
                            <div key={idx} className="ward-item">
                                <span className="ward-name">{ward.ward}</span>
                                <div className="ward-bar">
                                    <div
                                        className="ward-fill"
                                        style={{
                                            width: `${ward.occupancyRate}%`,
                                            background: parseFloat(ward.occupancyRate) > 85 ? CHART_COLORS.danger :
                                                parseFloat(ward.occupancyRate) > 70 ? CHART_COLORS.warning : CHART_COLORS.success
                                        }}
                                    />
                                </div>
                                <span className="ward-rate">{ward.occupancyRate}%</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* Staff Productivity */}
                <SectionCard title="Department Productivity" icon={Target}>
                    <ResponsiveContainer width="100%" height={280}>
                        <RadarChart data={productivityRadarData}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                            <Radar name="Score" dataKey="score" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.4} />
                        </RadarChart>
                    </ResponsiveContainer>
                </SectionCard>

                {/* Today's Activity */}
                <SectionCard title="Today's Activity" icon={Activity}>
                    <div className="activity-metrics">
                        <div className="activity-item">
                            <Stethoscope size={20} />
                            <div className="activity-info">
                                <span className="activity-value">{staff?.productivity?.consultations || 0}</span>
                                <span className="activity-label">Consultations</span>
                            </div>
                        </div>
                        <div className="activity-item">
                            <FlaskConical size={20} />
                            <div className="activity-info">
                                <span className="activity-value">{staff?.productivity?.labTests || 0}</span>
                                <span className="activity-label">Lab Tests</span>
                            </div>
                        </div>
                        <div className="activity-item">
                            <Radio size={20} />
                            <div className="activity-info">
                                <span className="activity-value">{staff?.productivity?.radiologyTests || 0}</span>
                                <span className="activity-label">Radiology</span>
                            </div>
                        </div>
                        <div className="activity-item">
                            <Pill size={20} />
                            <div className="activity-info">
                                <span className="activity-value">{staff?.productivity?.prescriptions || 0}</span>
                                <span className="activity-label">Prescriptions</span>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* Compliance Status */}
                <SectionCard title="Compliance & Governance" icon={Shield}>
                    <div className="compliance-container">
                        <ComplianceGauge score={compliance?.score || 0} status={compliance?.status} />
                        <div className="compliance-areas">
                            {compliance?.areas?.map((area, idx) => (
                                <div key={idx} className={`compliance-area ${area.status}`}>
                                    <span className="area-name">{area.name}</span>
                                    <span className={`area-status ${area.status}`}>
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
                    <div className="system-health">
                        <div className="health-summary">
                            <div className={`health-badge ${system?.status}`}>
                                {system?.status === 'healthy' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                                <span>{system?.status?.toUpperCase()}</span>
                            </div>
                            <div className="health-stats">
                                <div className="health-stat">
                                    <span className="stat-label">Uptime</span>
                                    <span className="stat-value">{system?.uptime?.formatted}</span>
                                </div>
                                <div className="health-stat">
                                    <span className="stat-label">Memory</span>
                                    <span className="stat-value">{system?.memory?.percentage}%</span>
                                </div>
                                <div className="health-stat">
                                    <span className="stat-label">Latency</span>
                                    <span className="stat-value">{system?.apiLatency}ms</span>
                                </div>
                            </div>
                        </div>
                        <div className="services-list">
                            {system?.services?.map((service, idx) => (
                                <SystemHealthIndicator key={idx} name={service.name} status={service.status} />
                            ))}
                        </div>
                    </div>
                </SectionCard>

                {/* Payment Status */}
                <SectionCard title="Payment Distribution" icon={DollarSign}>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={paymentBreakdownData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <YAxis dataKey="name" type="category" width={60} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {paymentBreakdownData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </SectionCard>
            </div>

            {/* Footer */}
            <footer className="dashboard-footer">
                <p>
                    <Shield size={14} />
                    <strong>Governance Mode:</strong> This dashboard shows aggregate operational metrics only.
                    Patient-identifiable information is not accessible from Admin role.
                </p>
            </footer>
        </div>
    );
};

export default AdminGovernanceDashboard;
