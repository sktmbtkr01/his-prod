import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import radiologyService from '../../services/radiology.service';
import departmentBillingService from '../../services/departmentBilling.service';
import {
    Scan, Clock, CheckCircle, AlertCircle,
    Calendar, FileText, Eye, Plus, X,
    Activity, Image, Search, Filter, Receipt, Banknote, CreditCard, Loader2, Check, Upload
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import toast from 'react-hot-toast';

// Status badge colors
const STATUS_COLORS = {
    ordered: 'bg-blue-100 text-blue-700 border-blue-200',
    scheduled: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'in-progress': 'bg-purple-100 text-purple-700 border-purple-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
};

// Modality icons/colors
const MODALITY_CONFIG = {
    xray: { label: 'X-Ray', color: '#3B82F6' },
    ct: { label: 'CT Scan', color: '#8B5CF6' },
    mri: { label: 'MRI', color: '#EC4899' },
    ultrasound: { label: 'Ultrasound', color: '#10B981' },
    pet: { label: 'PET Scan', color: '#F59E0B' },
    mammography: { label: 'Mammography', color: '#EF4444' },
    fluoroscopy: { label: 'Fluoroscopy', color: '#06B6D4' },
    ecg: { label: 'ECG', color: '#14B8A6' },
    echo: { label: 'Echo', color: '#0EA5E9' },
    other: { label: 'Other', color: '#6B7280' },
};

// Determine scan category from test name
const getScanCategory = (testName) => {
    if (!testName) return null;
    const name = testName.toLowerCase();
    if (name.includes('x-ray') || name.includes('xray')) return 'xray';
    if (name.includes('ultrasound') || name.includes('usg')) return 'ultrasound';
    if (name.includes('obstetric')) return 'obstetric';
    if (name.includes('ct ') || name.includes('ct scan')) return 'ct';
    if (name.includes('mri')) return 'mri';
    if (name.includes('ecg') || name.includes('echo') || name.includes('electrocardiogram')) return 'ecg';
    return null;
};

// Report Entry Modal Component
const ReportEntryModal = ({ order, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        findings: '',
        impression: '',
        recommendations: '',
        scanImage: null,
        // X-Ray fields
        xrayViewType: '',
        xrayBodyPartConfirmation: '',
        // Ultrasound fields
        ultrasoundPreparation: '',
        ultrasoundIndication: '',
        gestationalAge: '',
        // CT fields
        contrastUsed: false,
        contrastType: '',
        contrastDose: '',
        allergyHistory: false,
        // MRI fields
        metalImplantCheck: false,
        claustrophobia: false,
        sedationRequired: false,
        // ECG/Echo fields
        measurementNotes: '',
        reportSummary: '',
    });
    const [uploading, setUploading] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState('');

    const scanCategory = getScanCategory(order.test?.testName);
    const isObstetric = order.test?.testName?.toLowerCase().includes('obstetric');

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        if (type === 'file') {
            setFormData(prev => ({ ...prev, [name]: files[0] }));
            setUploadedFileName(files[0]?.name || '');
        } else if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Build the report data
        const reportData = {
            findings: formData.findings,
            impression: formData.impression,
            recommendations: formData.recommendations,
        };

        // Add scan-specific fields based on category
        if (scanCategory === 'xray') {
            reportData.xrayViewType = formData.xrayViewType;
            reportData.xrayBodyPartConfirmation = formData.xrayBodyPartConfirmation;
        } else if (scanCategory === 'ultrasound' || scanCategory === 'obstetric') {
            reportData.ultrasoundPreparation = formData.ultrasoundPreparation;
            reportData.ultrasoundIndication = formData.ultrasoundIndication;
            if (isObstetric && formData.gestationalAge) {
                reportData.gestationalAge = parseInt(formData.gestationalAge);
            }
        } else if (scanCategory === 'ct') {
            reportData.contrastUsed = formData.contrastUsed;
            if (formData.contrastUsed) {
                reportData.contrastType = formData.contrastType;
                reportData.contrastDose = formData.contrastDose;
            }
            reportData.allergyHistory = formData.allergyHistory;
        } else if (scanCategory === 'mri') {
            reportData.metalImplantCheck = formData.metalImplantCheck;
            reportData.claustrophobia = formData.claustrophobia;
            reportData.sedationRequired = formData.sedationRequired;
        } else if (scanCategory === 'ecg') {
            reportData.measurementNotes = formData.measurementNotes;
            reportData.reportSummary = formData.reportSummary;
        }

        // Handle file upload if present
        if (formData.scanImage) {
            setUploading(true);
            try {
                const uploadFormData = new FormData();
                uploadFormData.append('scanImage', formData.scanImage);

                // Upload to backend
                const user = JSON.parse(localStorage.getItem('user'));
                const response = await fetch(`http://localhost:5001/api/v1/radiology/upload-scan/${order._id}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user?.token}`
                    },
                    body: uploadFormData
                });

                if (response.ok) {
                    const result = await response.json();
                    reportData.scanImage = result.data?.scanImage;
                }
            } catch (error) {
                console.error('Upload failed:', error);
                toast.error('Failed to upload scan image');
            } finally {
                setUploading(false);
            }
        }

        onSubmit(order._id, reportData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                    <h3 className="text-lg font-bold text-gray-800">Enter Radiology Report</h3>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                        <span className="font-medium">{order.test?.testName}</span> for{' '}
                        <span className="font-medium">{order.patient?.firstName} {order.patient?.lastName}</span>
                    </p>
                    {scanCategory && (
                        <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded"
                            style={{ backgroundColor: MODALITY_CONFIG[scanCategory]?.color + '20', color: MODALITY_CONFIG[scanCategory]?.color }}>
                            {MODALITY_CONFIG[scanCategory]?.label || scanCategory.toUpperCase()}
                        </span>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Common: File Upload */}
                        <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-primary/50 transition-colors">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Upload size={16} className="inline mr-1" /> Upload Scan Image/Report
                            </label>
                            <input
                                type="file"
                                name="scanImage"
                                accept="image/*,.pdf,.dcm"
                                onChange={handleChange}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                            {uploadedFileName && (
                                <p className="mt-2 text-sm text-green-600">Selected: {uploadedFileName}</p>
                            )}
                        </div>

                        {/* X-Ray Specific Fields */}
                        {scanCategory === 'xray' && (
                            <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                                <h4 className="font-medium text-blue-800 text-sm">X-Ray Specific</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">View Type</label>
                                        <select
                                            name="xrayViewType"
                                            value={formData.xrayViewType}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        >
                                            <option value="">Select View</option>
                                            <option value="PA">PA (Posteroanterior)</option>
                                            <option value="AP">AP (Anteroposterior)</option>
                                            <option value="Lateral">Lateral</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Body Part Confirmation</label>
                                        <input
                                            type="text"
                                            name="xrayBodyPartConfirmation"
                                            value={formData.xrayBodyPartConfirmation}
                                            onChange={handleChange}
                                            placeholder="e.g., Chest, Left Hand"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Ultrasound Specific Fields */}
                        {(scanCategory === 'ultrasound' || scanCategory === 'obstetric') && (
                            <div className="p-4 bg-green-50 rounded-lg space-y-3">
                                <h4 className="font-medium text-green-800 text-sm">Ultrasound Specific</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Preparation</label>
                                        <select
                                            name="ultrasoundPreparation"
                                            value={formData.ultrasoundPreparation}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        >
                                            <option value="">Select Preparation</option>
                                            <option value="Fasting">Fasting</option>
                                            <option value="Full Bladder">Full Bladder</option>
                                            <option value="None">None</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Indication/Reason</label>
                                        <input
                                            type="text"
                                            name="ultrasoundIndication"
                                            value={formData.ultrasoundIndication}
                                            onChange={handleChange}
                                            placeholder="Clinical indication"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                </div>
                                {isObstetric && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gestational Age (weeks)</label>
                                        <input
                                            type="number"
                                            name="gestationalAge"
                                            value={formData.gestationalAge}
                                            onChange={handleChange}
                                            min="1"
                                            max="45"
                                            placeholder="Enter weeks"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CT Scan Specific Fields */}
                        {scanCategory === 'ct' && (
                            <div className="p-4 bg-purple-50 rounded-lg space-y-3">
                                <h4 className="font-medium text-purple-800 text-sm">CT Scan Specific</h4>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="contrastUsed"
                                            checked={formData.contrastUsed}
                                            onChange={handleChange}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm text-gray-700">Contrast Used?</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="allergyHistory"
                                            checked={formData.allergyHistory}
                                            onChange={handleChange}
                                            className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                                        />
                                        <span className="text-sm text-gray-700">Allergy History</span>
                                    </label>
                                </div>
                                {formData.contrastUsed && (
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Contrast Type</label>
                                            <input
                                                type="text"
                                                name="contrastType"
                                                value={formData.contrastType}
                                                onChange={handleChange}
                                                placeholder="e.g., Iodinated"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Contrast Dose</label>
                                            <input
                                                type="text"
                                                name="contrastDose"
                                                value={formData.contrastDose}
                                                onChange={handleChange}
                                                placeholder="e.g., 100ml"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MRI Specific Fields */}
                        {scanCategory === 'mri' && (
                            <div className="p-4 bg-pink-50 rounded-lg space-y-3">
                                <h4 className="font-medium text-pink-800 text-sm">MRI Specific</h4>
                                <div className="flex flex-wrap items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="metalImplantCheck"
                                            checked={formData.metalImplantCheck}
                                            onChange={handleChange}
                                            className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                                        />
                                        <span className="text-sm text-gray-700">Metal Implant Present</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="claustrophobia"
                                            checked={formData.claustrophobia}
                                            onChange={handleChange}
                                            className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                                        />
                                        <span className="text-sm text-gray-700">Claustrophobia</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="sedationRequired"
                                            checked={formData.sedationRequired}
                                            onChange={handleChange}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm text-gray-700">Sedation Required</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* ECG/Echo Specific Fields */}
                        {scanCategory === 'ecg' && (
                            <div className="p-4 bg-teal-50 rounded-lg space-y-3">
                                <h4 className="font-medium text-teal-800 text-sm">ECG/Echo Specific</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Notes</label>
                                    <textarea
                                        name="measurementNotes"
                                        rows="3"
                                        value={formData.measurementNotes}
                                        onChange={handleChange}
                                        placeholder="Enter detailed measurements..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Summary</label>
                                    <textarea
                                        name="reportSummary"
                                        rows="2"
                                        value={formData.reportSummary}
                                        onChange={handleChange}
                                        placeholder="Brief summary..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    ></textarea>
                                </div>
                            </div>
                        )}

                        {/* Common: Findings */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Findings *</label>
                            <textarea
                                name="findings"
                                rows="4"
                                required
                                value={formData.findings}
                                onChange={handleChange}
                                placeholder="Enter detailed findings..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            ></textarea>
                        </div>

                        {/* Common: Impression */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Impression *</label>
                            <textarea
                                name="impression"
                                rows="3"
                                required
                                value={formData.impression}
                                onChange={handleChange}
                                placeholder="Enter clinical impression..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            ></textarea>
                        </div>

                        {/* Common: Recommendations */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
                            <textarea
                                name="recommendations"
                                rows="2"
                                value={formData.recommendations}
                                onChange={handleChange}
                                placeholder="Any follow-up recommendations..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            ></textarea>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 sticky bottom-0 bg-white pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                'Submit Report'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Radiology = () => {
    const [activeTab, setActiveTab] = useState('queue');
    const [orders, setOrders] = useState([]);
    const [queue, setQueue] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    // Billing state
    const [unbilledOrders, setUnbilledOrders] = useState([]);
    const [selectedForBilling, setSelectedForBilling] = useState([]);
    const [generatingBill, setGeneratingBill] = useState(false);
    const [paymentModalData, setPaymentModalData] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('cash');
    const [paymentRef, setPaymentRef] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (activeTab === 'billing') {
            fetchUnbilledOrders();
        }
    }, [activeTab]);

    const fetchUnbilledOrders = async () => {
        try {
            const orders = await departmentBillingService.getUnbilledOrders('radiology');
            setUnbilledOrders(orders || []);
        } catch (error) {
            console.error('Error fetching unbilled orders:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, queueRes, dashRes, testsRes] = await Promise.all([
                radiologyService.getOrders(),
                radiologyService.getQueue(),
                radiologyService.getDashboard(),
                radiologyService.getTests()
            ]);
            setOrders(ordersRes.data || []);
            setQueue(queueRes.data || []);
            setDashboard(dashRes.data || {});
            setTests(testsRes.data || []);
        } catch (error) {
            console.error('Failed to load radiology data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Schedule a test
    const handleSchedule = async (orderId, scheduledAt) => {
        try {
            await radiologyService.scheduleTest(orderId, scheduledAt);
            setShowScheduleModal(false);
            setSelectedOrder(null);
            fetchData();
        } catch (error) {
            alert('Failed to schedule: ' + (error.response?.data?.message || error.message));
        }
    };

    // Submit report
    const handleReportSubmit = async (orderId, reportData) => {
        try {
            await radiologyService.enterReport(orderId, reportData);
            setShowReportModal(false);
            setSelectedOrder(null);
            fetchData();
        } catch (error) {
            alert('Failed to submit report: ' + (error.response?.data?.message || error.message));
        }
    };

    // Filter orders
    const filteredOrders = orders.filter(o =>
        statusFilter === 'all' ? true : o.status === statusFilter
    );

    // Generate bill for orders
    const handleGenerateBill = async () => {
        if (selectedForBilling.length === 0) {
            toast.error('Select at least one order');
            return;
        }

        setGeneratingBill(true);
        try {
            const firstOrder = unbilledOrders.find(o => selectedForBilling.includes(o._id));
            const encounterId = firstOrder?.visit;
            const encounterModel = firstOrder?.visitModel || 'Appointment';
            const patientId = firstOrder?.patient?._id;

            const result = await departmentBillingService.generateRadiologyBill(
                selectedForBilling,
                encounterId,
                encounterModel,
                patientId
            );

            const bill = result.data;
            toast.success(`Bill ${bill.billNumber} generated successfully!`);

            setPaymentModalData(bill);
            setPaymentAmount(bill.balanceAmount.toString());

            setSelectedForBilling([]);
            fetchUnbilledOrders();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to generate bill');
        } finally {
            setGeneratingBill(false);
        }
    };

    const handleRecordPayment = async () => {
        if (processingPayment) return;
        if (!paymentModalData || !paymentAmount || parseFloat(paymentAmount) <= 0) {
            toast.error('Enter a valid amount');
            return;
        }

        setProcessingPayment(true);
        try {
            await departmentBillingService.recordPayment(
                paymentModalData._id,
                parseFloat(paymentAmount),
                paymentMode,
                paymentRef
            );

            toast.success('Payment recorded & Receipt generated');
            setPaymentSuccess(true);
            fetchUnbilledOrders();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Payment failed');
        } finally {
            setProcessingPayment(false);
        }
    };

    const closePaymentModal = () => {
        setPaymentModalData(null);
        setPaymentSuccess(false);
        setPaymentAmount('');
        setPaymentRef('');
        setPaymentMode('cash');
    };

    // Prepare modality chart data
    const modalityChartData = dashboard?.modalityBreakdown
        ? Object.entries(dashboard.modalityBreakdown).map(([key, value]) => ({
            name: MODALITY_CONFIG[key]?.label || key,
            value,
            color: MODALITY_CONFIG[key]?.color || '#6B7280'
        }))
        : [];

    if (loading) {
        return <div className="p-12 text-center text-gray-500">Loading Radiology Module...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Scan className="text-primary" />
                        Radiology & Imaging
                    </h1>
                    <p className="text-gray-500 text-sm">Manage imaging orders, scheduling, and reports</p>
                </div>
            </div>

            {/* Dashboard KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Pending Orders</span>
                        <Clock size={16} className="text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-secondary-dark">{dashboard?.pending || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Completed Today</span>
                        <CheckCircle size={16} className="text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">{dashboard?.completedToday || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">In Queue</span>
                        <Activity size={16} className="text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold text-purple-600">{queue.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Available Tests</span>
                        <Image size={16} className="text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{tests.length}</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Orders/Queue List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        {[
                            { id: 'queue', label: 'Work Queue', icon: Activity },
                            { id: 'orders', label: 'All Orders', icon: FileText },
                            { id: 'billing', label: 'Generate Bill', icon: Receipt },
                            { id: 'tests', label: 'Test Catalog', icon: Scan },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Queue Tab */}
                    {activeTab === 'queue' && (
                        <div className="divide-y divide-slate-100">
                            {queue.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    <CheckCircle size={48} className="mx-auto text-green-300 mb-4" />
                                    <p>No pending items in the queue</p>
                                </div>
                            ) : (
                                queue.map(item => (
                                    <div key={item._id} className="p-4 hover:bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold`}
                                                style={{ backgroundColor: MODALITY_CONFIG[item.test?.modality]?.color || '#6B7280' }}>
                                                {item.test?.modality?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-800">
                                                    {item.patient?.firstName} {item.patient?.lastName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {item.test?.testName} • {item.testNumber}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[item.status]}`}>
                                                {item.status?.toUpperCase()}
                                            </span>
                                            {item.status === 'ordered' && (
                                                <button
                                                    onClick={() => { setSelectedOrder(item); setShowScheduleModal(true); }}
                                                    className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600"
                                                >
                                                    Schedule
                                                </button>
                                            )}
                                            {item.status === 'scheduled' && (
                                                <button
                                                    onClick={() => { setSelectedOrder(item); setShowReportModal(true); }}
                                                    className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600"
                                                >
                                                    Enter Report
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* All Orders Tab */}
                    {activeTab === 'orders' && (
                        <>
                            {/* Filter Bar */}
                            <div className="p-4 border-b border-gray-100 flex gap-2">
                                {['all', 'ordered', 'scheduled', 'in-progress', 'completed'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        {status.replace('-', ' ').toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-3 text-gray-600">Test #</th>
                                            <th className="px-4 py-3 text-gray-600">Patient</th>
                                            <th className="px-4 py-3 text-gray-600">Test</th>
                                            <th className="px-4 py-3 text-gray-600">Modality</th>
                                            <th className="px-4 py-3 text-gray-600">Status</th>
                                            <th className="px-4 py-3 text-gray-600">Date</th>
                                            <th className="px-4 py-3 text-gray-600 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                                                    No orders found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredOrders.map(order => (
                                                <tr key={order._id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3 font-mono text-xs">{order.testNumber}</td>
                                                    <td className="px-4 py-3">
                                                        {order.patient?.firstName} {order.patient?.lastName}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">{order.test?.testName}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 rounded text-xs text-white"
                                                            style={{ backgroundColor: MODALITY_CONFIG[order.test?.modality]?.color }}>
                                                            {MODALITY_CONFIG[order.test?.modality]?.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status]}`}>
                                                            {order.status?.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500">
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {order.status === 'completed' && (
                                                            <button
                                                                onClick={() => setSelectedOrder(order)}
                                                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                                                                title="View Report"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Test Catalog Tab */}
                    {activeTab === 'tests' && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tests.map(test => (
                                <div key={test._id} className="p-4 border border-slate-100 rounded-lg hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">{test.testName}</h4>
                                            <p className="text-sm text-gray-500">{test.testCode} • {test.bodyPart}</p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded text-xs text-white"
                                            style={{ backgroundColor: MODALITY_CONFIG[test.modality]?.color }}>
                                            {MODALITY_CONFIG[test.modality]?.label}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex justify-between items-center text-sm">
                                        <span className="text-gray-500">
                                            <Clock size={14} className="inline mr-1" />
                                            {test.duration} min
                                        </span>
                                        <span className="font-bold text-green-600">₹{test.price}</span>
                                    </div>
                                    {test.contrastRequired && (
                                        <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">
                                            <AlertCircle size={12} className="inline mr-1" />
                                            Contrast Required
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && (
                        <div className="p-6">
                            {unbilledOrders.length === 0 ? (
                                <div className="p-12 text-center">
                                    <CheckCircle size={48} className="mx-auto text-green-200 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-400">All Billed</h3>
                                    <p className="text-gray-400">No unbilled radiology orders at the moment.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-medium text-gray-500">
                                            {unbilledOrders.length} unbilled order(s)
                                        </span>
                                        <button
                                            onClick={() => {
                                                if (selectedForBilling.length === unbilledOrders.length) {
                                                    setSelectedForBilling([]);
                                                } else {
                                                    setSelectedForBilling(unbilledOrders.map(o => o._id));
                                                }
                                            }}
                                            className="text-sm text-primary font-medium hover:underline"
                                        >
                                            {selectedForBilling.length === unbilledOrders.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {unbilledOrders.map((order) => {
                                            const isSelected = selectedForBilling.includes(order._id);
                                            return (
                                                <div
                                                    key={order._id}
                                                    onClick={() => {
                                                        setSelectedForBilling(prev =>
                                                            prev.includes(order._id)
                                                                ? prev.filter(id => id !== order._id)
                                                                : [...prev, order._id]
                                                        );
                                                    }}
                                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${isSelected
                                                        ? 'bg-blue-50 border-blue-200'
                                                        : 'bg-white border-gray-100 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                                        {isSelected && <Check size={12} className="text-white" />}
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-sm text-blue-600 font-bold">
                                                                {order.testNumber}
                                                            </span>
                                                            <span className="text-sm text-gray-400">•</span>
                                                            <span className="text-sm text-gray-600">
                                                                {order.patient?.firstName} {order.patient?.lastName}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {order.test?.testName} • {order.test?.modality?.toUpperCase()}
                                                        </p>
                                                    </div>

                                                    <div className="text-right">
                                                        <p className="font-bold text-slate-800">₹{order.test?.price || 0}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedForBilling.length > 0 && (
                                        <div className="mt-6 p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-slate-800">
                                                    {selectedForBilling.length} order(s) selected
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Total: ₹{unbilledOrders
                                                        .filter(o => selectedForBilling.includes(o._id))
                                                        .reduce((sum, o) => sum + (o.test?.price || 0), 0)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleGenerateBill}
                                                disabled={generatingBill}
                                                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {generatingBill ? (
                                                    <Loader2 size={20} className="animate-spin" />
                                                ) : (
                                                    <Receipt size={20} />
                                                )}
                                                {generatingBill ? 'Generating...' : 'Generate Bill'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Modality Chart & Selected Order Details */}
                <div className="space-y-6">
                    {/* Modality Breakdown Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-gray-700 mb-4">Modality Distribution</h3>
                        {modalityChartData.length > 0 ? (
                            <>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={modalityChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={70}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {modalityChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {modalityChartData.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                                <span className="text-gray-600">{item.name}</span>
                                            </div>
                                            <span className="font-bold text-gray-700">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-gray-400 py-8">No data available</div>
                        )}
                    </div>

                    {/* Selected Order Details */}
                    {selectedOrder && selectedOrder.status === 'completed' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-gray-700">Report Details</h3>
                                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="text-gray-500">Test:</span>
                                    <p className="font-medium text-gray-800">{selectedOrder.test?.testName}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Patient:</span>
                                    <p className="font-medium text-gray-800">
                                        {selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Findings:</span>
                                    <p className="text-gray-700 bg-slate-50 p-2 rounded mt-1">
                                        {selectedOrder.findings || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Impression:</span>
                                    <p className="text-gray-700 bg-slate-50 p-2 rounded mt-1">
                                        {selectedOrder.impression || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Recommendations:</span>
                                    <p className="text-gray-700 bg-slate-50 p-2 rounded mt-1">
                                        {selectedOrder.recommendations || 'N/A'}
                                    </p>
                                </div>
                                {selectedOrder.images?.length > 0 && (
                                    <div>
                                        <span className="text-gray-500">Images:</span>
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            {selectedOrder.images.map((img, idx) => (
                                                <a
                                                    key={idx}
                                                    href={img}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 hover:bg-gray-300"
                                                >
                                                    <Image size={24} />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Schedule Modal */}
            {showScheduleModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Schedule Test</h3>
                            <button onClick={() => { setShowScheduleModal(false); setSelectedOrder(null); }}>
                                <X size={20} className="text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600">
                                Test: <span className="font-medium">{selectedOrder.test?.testName}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                                Patient: <span className="font-medium">{selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}</span>
                            </p>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const scheduledAt = e.target.scheduledAt.value;
                            handleSchedule(selectedOrder._id, scheduledAt);
                        }}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Date & Time</label>
                            <input
                                type="datetime-local"
                                name="scheduledAt"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => { setShowScheduleModal(false); setSelectedOrder(null); }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                                    Confirm Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Report Entry Modal */}
            {showReportModal && selectedOrder && (
                <ReportEntryModal
                    order={selectedOrder}
                    onClose={() => { setShowReportModal(false); setSelectedOrder(null); }}
                    onSubmit={handleReportSubmit}
                />
            )}

            {/* Payment Modal */}
            <AnimatePresence>
                {paymentModalData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={closePaymentModal}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
                        >
                            <button
                                onClick={closePaymentModal}
                                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>

                            {paymentSuccess ? (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Payment Successful!</h3>
                                    <p className="text-gray-500 mb-6">Receipt generated for Radiology Bill</p>

                                    <div className="bg-gray-50 p-4 rounded-xl text-left mb-6 border border-gray-100">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-500">Bill Number</span>
                                            <span className="font-mono font-bold text-slate-700">{paymentModalData.billNumber}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-500">Amount Paid</span>
                                            <span className="font-bold text-blue-600">₹{parseFloat(paymentAmount).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-500">Payment Mode</span>
                                            <span className="capitalize font-medium text-slate-700">{paymentMode}</span>
                                        </div>
                                        {paymentRef && (
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Reference</span>
                                                <span className="font-mono text-sm text-slate-700">{paymentRef}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => window.print()}
                                            className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                                        >
                                            <Receipt size={18} /> Print Receipt
                                        </button>
                                        <button
                                            onClick={closePaymentModal}
                                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Banknote size={24} className="text-blue-500" />
                                        Collect Payment
                                    </h3>

                                    <div className="p-4 bg-blue-50 rounded-xl mb-4 border border-blue-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-blue-700 font-medium">Bill Number</span>
                                            <span className="font-mono font-bold text-blue-800">{paymentModalData.billNumber}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-blue-700 font-medium">Total Amount</span>
                                            <span className="text-xl font-bold text-blue-800">₹{paymentModalData.grandTotal}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-slate-700 block mb-1">Payment Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                                    max={paymentModalData.balanceAmount}
                                                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-lg"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 text-right">
                                                Balance Due: ₹{paymentModalData.balanceAmount}
                                            </p>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-slate-700 block mb-1">Payment Mode</label>
                                            <div className="flex gap-2">
                                                {['cash', 'card', 'upi'].map((mode) => (
                                                    <button
                                                        key={mode}
                                                        onClick={() => setPaymentMode(mode)}
                                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors flex items-center justify-center gap-2 ${paymentMode === mode
                                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {mode === 'card' && <CreditCard size={14} />}
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-slate-700 block mb-1">Reference / Transaction ID</label>
                                            <input
                                                type="text"
                                                value={paymentRef}
                                                onChange={(e) => setPaymentRef(e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                placeholder="Optional..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={closePaymentModal}
                                            className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50"
                                        >
                                            Later
                                        </button>
                                        <button
                                            onClick={handleRecordPayment}
                                            disabled={processingPayment || !paymentAmount}
                                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {processingPayment ? <Loader2 size={18} className="animate-spin" /> : <Receipt size={18} />}
                                            {processingPayment ? 'Processing...' : 'Generate Receipt'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Radiology;
