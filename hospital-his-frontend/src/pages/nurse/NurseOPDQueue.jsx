import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getQueue, resetOPD } from '../../features/opd/opdSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Clock, CheckCircle, Activity, FileText, Heart, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_RES_URL = 'http://localhost:5001/api/v1/';
const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

// NEWS2 Risk Level Badge
const RiskBadge = ({ level, score }) => {
    const config = {
        low: { bg: 'bg-green-100', text: 'text-green-700', label: 'Low Risk' },
        low_medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Low-Medium' },
        medium: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Medium Risk' },
        high: { bg: 'bg-red-100', text: 'text-red-700', label: 'High Risk' },
    };
    const c = config[level] || config.low;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
            {level === 'high' && <AlertTriangle size={12} />}
            {c.label} (NEWS2: {score})
        </span>
    );
};

// Vitals Entry Modal
const VitalsModal = ({ appointment, onClose, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        respiratoryRate: '',
        spo2: '',
        supplementalOxygen: false,
        systolicBP: '',
        diastolicBP: '',
        heartRate: '',
        temperature: '',
        avpuScore: 'alert',
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(
                `${API_RES_URL}opd/appointments/${appointment._id}/vitals`,
                {
                    respiratoryRate: parseInt(formData.respiratoryRate),
                    spo2: parseInt(formData.spo2),
                    supplementalOxygen: formData.supplementalOxygen,
                    systolicBP: parseInt(formData.systolicBP),
                    diastolicBP: parseInt(formData.diastolicBP),
                    heartRate: parseInt(formData.heartRate),
                    temperature: parseFloat(formData.temperature),
                    avpuScore: formData.avpuScore,
                },
                getConfig()
            );
            toast.success('Vitals recorded successfully!');
            onSave(response.data.data);
            onClose();
        } catch (error) {
            console.error('Error saving vitals:', error);
            toast.error(error.response?.data?.error || 'Failed to save vitals');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
                <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Heart className="text-red-500" size={24} />
                        Record Vitals (NEWS2)
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 bg-blue-50 border-b border-blue-100">
                    <p className="text-blue-800 font-medium">
                        {appointment.patient.firstName} {appointment.patient.lastName}
                    </p>
                    <p className="text-blue-600 text-sm">{appointment.patient.patientId}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Respiratory Rate */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Respiratory Rate (breaths/min) *
                        </label>
                        <input
                            type="number"
                            name="respiratoryRate"
                            value={formData.respiratoryRate}
                            onChange={handleChange}
                            required
                            min="1"
                            max="60"
                            placeholder="12-20 normal"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* SpO2 and Supplemental O2 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                SpO₂ (%) *
                            </label>
                            <input
                                type="number"
                                name="spo2"
                                value={formData.spo2}
                                onChange={handleChange}
                                required
                                min="70"
                                max="100"
                                placeholder="≥96 normal"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer w-full">
                                <input
                                    type="checkbox"
                                    name="supplementalOxygen"
                                    checked={formData.supplementalOxygen}
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-700">On Supplemental O₂</span>
                            </label>
                        </div>
                    </div>

                    {/* Blood Pressure */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Systolic BP (mmHg) *
                            </label>
                            <input
                                type="number"
                                name="systolicBP"
                                value={formData.systolicBP}
                                onChange={handleChange}
                                required
                                min="50"
                                max="250"
                                placeholder="111-219 normal"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Diastolic BP (mmHg)
                            </label>
                            <input
                                type="number"
                                name="diastolicBP"
                                value={formData.diastolicBP}
                                onChange={handleChange}
                                min="30"
                                max="150"
                                placeholder="60-80 normal"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </div>
                    </div>

                    {/* Heart Rate */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Heart Rate / Pulse (bpm) *
                        </label>
                        <input
                            type="number"
                            name="heartRate"
                            value={formData.heartRate}
                            onChange={handleChange}
                            required
                            min="30"
                            max="200"
                            placeholder="51-90 normal"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* Temperature */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Body Temperature (°C) *
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            name="temperature"
                            value={formData.temperature}
                            onChange={handleChange}
                            required
                            min="30"
                            max="45"
                            placeholder="36.1-38.0 normal"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* AVPU */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Level of Consciousness (AVPU) *
                        </label>
                        <select
                            name="avpuScore"
                            value={formData.avpuScore}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="alert">Alert</option>
                            <option value="voice">Responds to Voice</option>
                            <option value="pain">Responds to Pain</option>
                            <option value="unresponsive">Unresponsive</option>
                            <option value="new_confusion">New Confusion</option>
                        </select>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Heart size={18} />}
                            {loading ? 'Saving...' : 'Save Vitals'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const NurseOPDQueue = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { queue, isLoading, isError, message } = useSelector((state) => state.opd);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [vitalsMap, setVitalsMap] = useState({});

    useEffect(() => {
        dispatch(getQueue());
        const interval = setInterval(() => {
            dispatch(getQueue());
        }, 30000);

        return () => {
            clearInterval(interval);
            dispatch(resetOPD());
        };
    }, [dispatch]);

    // Fetch vitals for all appointments
    useEffect(() => {
        const fetchVitals = async () => {
            if (!queue || queue.length === 0) return;
            const newVitalsMap = {};
            for (const apt of queue) {
                try {
                    const res = await axios.get(`${API_RES_URL}opd/appointments/${apt._id}/vitals`, getConfig());
                    if (res.data.data) {
                        newVitalsMap[apt._id] = res.data.data;
                    }
                } catch (e) {
                    // No vitals - that's fine
                }
            }
            setVitalsMap(newVitalsMap);
        };
        fetchVitals();
    }, [queue]);

    const handleVitalsSave = (vitals) => {
        setVitalsMap(prev => ({ ...prev, [vitals.appointment]: vitals }));
    };

    if (isLoading && (!queue || queue.length === 0)) {
        return <div className="p-12 text-center text-gray-500">Loading queue...</div>;
    }

    if (isError) {
        return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg m-4">Error loading queue: {message}</div>;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="text-primary" /> Nurse OPD Queue
                    </h1>
                    <p className="text-gray-500 text-sm">Record patient vitals before consultation</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-medium text-slate-600 border border-gray-100">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            <div className="space-y-4">
                {queue && queue.length > 0 ? queue.map((appointment, index) => {
                    const vitals = vitalsMap[appointment._id];
                    return (
                        <motion.div
                            key={appointment._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative p-6 rounded-2xl border transition-all ${index === 0
                                ? 'bg-white border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                                : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                                }`}
                        >
                            {index === 0 && (
                                <div className="absolute top-0 right-0 bg-primary text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                                    Next Patient
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    {/* Token Number */}
                                    <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl font-bold border-2 ${index === 0 ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-400 border-slate-100'
                                        }`}>
                                        <span className="text-xs uppercase opacity-70">Token</span>
                                        <span className="text-3xl">{appointment.tokenNumber || index + 1}</span>
                                    </div>

                                    {/* Patient Info */}
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">
                                            {appointment.patient.firstName} {appointment.patient.lastName}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                            <span className="flex items-center gap-1"><User size={14} /> {appointment.patient.patientId}</span>
                                            <span className="flex items-center gap-1"><Clock size={14} /> {new Date(appointment.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        {/* Vitals Status */}
                                        <div className="mt-2 flex items-center gap-2">
                                            {vitals ? (
                                                <RiskBadge level={vitals.news2RiskLevel} score={vitals.news2Score} />
                                            ) : (
                                                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md font-medium">
                                                    No vitals recorded
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {vitals ? (
                                        <span className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-green-100 text-green-700">
                                            <CheckCircle size={18} />
                                            Vitals Recorded
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => setSelectedAppointment(appointment)}
                                            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all bg-red-500 text-white hover:bg-red-600 shadow-md"
                                        >
                                            <Heart size={18} />
                                            Enter Vitals
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                }) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <CheckCircle size={64} className="mx-auto text-green-100 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">All Cleared!</h3>
                        <p className="text-gray-400">No patients waiting in queue.</p>
                    </div>
                )}
            </div>

            {/* Vitals Modal */}
            <AnimatePresence>
                {selectedAppointment && (
                    <VitalsModal
                        appointment={selectedAppointment}
                        onClose={() => setSelectedAppointment(null)}
                        onSave={handleVitalsSave}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default NurseOPDQueue;
