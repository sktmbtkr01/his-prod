import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Clock, CheckCircle, AlertCircle, AlertTriangle, User, TestTube, X, Check, Loader, Receipt, Loader2, Banknote, CreditCard } from 'lucide-react';
import labService from '../../services/lab.service';
import departmentBillingService from '../../services/departmentBilling.service';
import toast from 'react-hot-toast';

const Laboratory = () => {
    const [activeTab, setActiveTab] = useState('queue');
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ pending: 0, completedToday: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [resultData, setResultData] = useState([]);
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [pdfFile, setPdfFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Billing state
    const [unbilledOrders, setUnbilledOrders] = useState([]);
    const [selectedForBilling, setSelectedForBilling] = useState([]);
    const [generatingBill, setGeneratingBill] = useState(false);

    // Payment state
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
            const orders = await departmentBillingService.getUnbilledOrders('laboratory');
            setUnbilledOrders(orders || []);
        } catch (error) {
            console.error('Error fetching unbilled orders:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [queueRes, dashRes] = await Promise.all([
                labService.getQueue(),
                labService.getDashboard()
            ]);
            setQueue(queueRes.data || []);
            setStats(dashRes.data || { pending: 0, completedToday: 0 });
        } catch (error) {
            console.error("Error fetching lab data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCollectSample = async (orderId) => {
        try {
            await labService.collectSample(orderId);
            fetchData(); // Refresh queue
        } catch (error) {
            console.error("Error collecting sample", error);
            alert("Failed to collect sample");
        }
    };

    const openResultEntry = async (order) => {
        try {
            const res = await labService.getOrderById(order._id);
            setSelectedOrder(res.data);
            // Initialize result fields from test parameters
            const params = res.data.test?.parameters || [];
            setResultData(params.map(p => ({
                parameter: p.name,
                value: '',
                unit: p.unit || '',
                normalRange: p.normalRange || '',
                criticalLow: p.criticalLow,
                criticalHigh: p.criticalHigh,
                isAbnormal: false,
                isCritical: false
            })));
            setRemarks('');
            setShowResultModal(true);
        } catch (error) {
            console.error("Error fetching order details", error);
        }
    };

    const handleResultChange = (index, value) => {
        const updated = [...resultData];
        updated[index].value = value;

        // Auto-detect status
        const range = updated[index].normalRange;
        const critLow = updated[index].criticalLow;
        const critHigh = updated[index].criticalHigh;

        if (value) {
            const numVal = parseFloat(value);

            // Check Critical
            if ((critLow !== undefined && numVal < critLow) || (critHigh !== undefined && numVal > critHigh)) {
                updated[index].isCritical = true;
                updated[index].isAbnormal = true; // Critical is also abnormal
            } else {
                updated[index].isCritical = false;

                // Check Abnormal (Standard)
                if (range) {
                    const parts = range.split('-').map(s => parseFloat(s.trim()));
                    if (parts.length === 2) {
                        updated[index].isAbnormal = numVal < parts[0] || numVal > parts[1];
                    }
                }
            }
        } else {
            updated[index].isCritical = false;
            updated[index].isAbnormal = false;
        }

        setResultData(updated);
    };

    const handleSubmitResults = async () => {
        if (!selectedOrder) return;

        // Check for critical values
        const criticalCount = resultData.filter(r => r.isCritical).length;
        if (criticalCount > 0) {
            const confirm = window.confirm(
                `⚠️ CRITICAL ALERT ⚠️\n\n${criticalCount} value(s) are in the CRITICAL RANGE.\nThis indicates a potentially life-threatening situation.\n\nAre you sure you want to save these results?`
            );
            if (!confirm) return;
        }

        setSubmitting(true);
        try {
            await labService.enterResults(selectedOrder._id, resultData, remarks);
            toast.success('Results saved successfully!');
            setShowResultModal(false);
            setPdfFile(null);
            fetchData();
        } catch (error) {
            console.error("Error saving results", error);
            toast.error('Failed to save results');
        } finally {
            setSubmitting(false);
        }
    };

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

            const result = await departmentBillingService.generateLabBill(
                selectedForBilling,
                encounterId,
                encounterModel,
                patientId
            );

            const bill = result.data;
            toast.success(`Bill ${bill.billNumber} generated successfully!`);

            // Open payment modal immediately
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

    // Record payment
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

    const handleUploadPdf = async () => {
        if (!selectedOrder || !pdfFile) return;
        setUploading(true);
        try {
            await labService.uploadReport(selectedOrder._id, pdfFile);
            alert("PDF uploaded and AI summary generated!");
            setPdfFile(null);
        } catch (error) {
            console.error("Error uploading PDF", error);
            alert("Failed to upload PDF");
        } finally {
            setUploading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            'ordered': 'bg-blue-50 text-blue-600 border-blue-100',
            'sample-collected': 'bg-amber-50 text-amber-600 border-amber-100',
            'in-progress': 'bg-purple-50 text-purple-600 border-purple-100',
            'completed': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        };
        const labels = {
            'ordered': 'Ordered',
            'sample-collected': 'Sample Collected',
            'in-progress': 'In Progress',
            'completed': 'Completed',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-gray-50 text-gray-600'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                        <FlaskConical size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Laboratory</h1>
                        <p className="text-gray-500 text-sm">Lab Test Management</p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1 bg-gray-100 rounded-xl">
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'queue' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Clock size={16} /> Work Queue
                    </button>
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'billing' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Receipt size={16} /> Generate Bill
                    </button>
                </div>
            </div>

            {activeTab === 'queue' && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><Clock size={20} /></div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-800">{stats.pending}</div>
                                    <div className="text-xs text-gray-500">Pending Tests</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500"><CheckCircle size={20} /></div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-800">{stats.completedToday}</div>
                                    <div className="text-xs text-gray-500">Completed Today</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 rounded-lg text-amber-500"><AlertCircle size={20} /></div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-800">{queue.filter(q => q.status === 'ordered').length}</div>
                                    <div className="text-xs text-gray-500">Awaiting Sample</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Work Queue Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800">Work Queue</h2>
                            <button onClick={fetchData} className="text-sm text-gray-500 hover:text-primary">Refresh</button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Test #</th>
                                        <th className="px-6 py-4">Patient</th>
                                        <th className="px-6 py-4">Test Name</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Ordered</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan="6" className="text-center py-10 text-gray-400">Loading queue...</td></tr>
                                    ) : queue.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center py-10 text-gray-400">No pending tests in queue.</td></tr>
                                    ) : (
                                        queue.map((order) => (
                                            <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-sm text-slate-600">{order.testNumber}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                            {order.patient?.firstName?.[0]}{order.patient?.lastName?.[0]}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-slate-700">{order.patient?.firstName} {order.patient?.lastName}</div>
                                                            <div className="text-xs text-gray-400">{order.patient?.patientId}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-700">{order.test?.testName || 'Unknown Test'}</td>
                                                <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    {order.status === 'ordered' && (
                                                        <button
                                                            onClick={() => handleCollectSample(order._id)}
                                                            className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
                                                        >
                                                            Collect Sample
                                                        </button>
                                                    )}
                                                    {order.status === 'sample-collected' && (
                                                        <button
                                                            onClick={() => openResultEntry(order)}
                                                            className="px-3 py-1.5 bg-purple-500 text-white text-xs font-medium rounded-lg hover:bg-purple-600 transition-colors"
                                                        >
                                                            Enter Results
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Result Entry Modal */}
                    <AnimatePresence>
                        {showResultModal && selectedOrder && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowResultModal(false)}
                                />
                                <motion.div
                                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                                    className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
                                >
                                    <div className="bg-purple-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
                                        <div>
                                            <h2 className="text-xl font-bold flex items-center gap-2">
                                                <TestTube size={24} /> Enter Lab Results
                                            </h2>
                                            <p className="text-purple-200 text-sm mt-1">{selectedOrder.test?.testName} • {selectedOrder.testNumber}</p>
                                        </div>
                                        <button onClick={() => setShowResultModal(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="p-6">
                                        {/* Patient Info */}
                                        <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 rounded-xl">
                                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                                {selectedOrder.patient?.firstName?.[0]}{selectedOrder.patient?.lastName?.[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}</div>
                                                <div className="text-sm text-gray-500">{selectedOrder.patient?.patientId}</div>
                                            </div>
                                        </div>

                                        {/* Parameters Form */}
                                        <div className="space-y-4 mb-6">
                                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Test Parameters</h3>
                                            {resultData.length === 0 ? (
                                                <p className="text-gray-500 text-sm">No parameters defined for this test. Please add manually.</p>
                                            ) : (
                                                resultData.map((param, idx) => (
                                                    <div key={idx} className={`grid grid-cols-12 gap-3 items-center p-3 rounded-lg border transition-all duration-300 ${param.isCritical ? 'bg-red-100 border-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]' :
                                                        param.isAbnormal ? 'bg-amber-50 border-amber-200' :
                                                            'bg-gray-50 border-gray-100'
                                                        }`}>
                                                        <div className="col-span-4">
                                                            <div className={`font-medium ${param.isCritical ? 'text-red-700 font-bold' : 'text-slate-700'}`}>
                                                                {param.parameter}
                                                            </div>
                                                            <div className="text-xs text-gray-400">Normal: {param.normalRange || 'N/A'}</div>
                                                            {(param.criticalLow || param.criticalHigh) && (
                                                                <div className="text-[10px] text-red-500 font-bold">
                                                                    Critical: {param.criticalLow ? `<${param.criticalLow}` : ''} {param.criticalHigh ? `>${param.criticalHigh}` : ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-span-5">
                                                            <input
                                                                type="text"
                                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none ${param.isCritical ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500 text-red-700 font-bold' :
                                                                    'border-gray-200 focus:ring-purple-500/20 focus:border-purple-500'
                                                                    }`}
                                                                placeholder="Enter value"
                                                                value={param.value}
                                                                onChange={(e) => handleResultChange(idx, e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="col-span-2 text-sm text-gray-500">{param.unit}</div>
                                                        <div className="col-span-1 flex justify-center">
                                                            {param.isCritical ? (
                                                                <motion.div
                                                                    animate={{ scale: [1, 1.2, 1] }}
                                                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                                                    className="text-red-600 bg-white rounded-full p-1 shadow-sm"
                                                                    title="Critical Value!"
                                                                >
                                                                    <AlertTriangle size={20} fill="#fee2e2" />
                                                                </motion.div>
                                                            ) : param.isAbnormal ? (
                                                                <span className="text-amber-500" title="Abnormal"><AlertCircle size={20} /></span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Remarks */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Notes</label>
                                            <textarea
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                                rows="3"
                                                value={remarks}
                                                onChange={(e) => setRemarks(e.target.value)}
                                                placeholder="Any additional observations..."
                                            ></textarea>
                                        </div>

                                        {/* PDF Upload Section */}
                                        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                            <h3 className="font-bold text-blue-800 text-sm uppercase tracking-wider mb-3">📄 Upload Report PDF</h3>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={(e) => setPdfFile(e.target.files[0])}
                                                    className="flex-1 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white file:font-medium hover:file:bg-blue-600 file:cursor-pointer"
                                                />
                                                <button
                                                    onClick={handleUploadPdf}
                                                    disabled={!pdfFile || uploading}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {uploading ? <Loader size={16} className="animate-spin" /> : null}
                                                    {uploading ? 'Uploading...' : 'Upload & Summarize'}
                                                </button>
                                            </div>
                                            <p className="text-xs text-blue-600 mt-2">AI will extract key findings and generate a clinical summary.</p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => setShowResultModal(false)}
                                                className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSubmitResults}
                                                disabled={submitting}
                                                className="px-8 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-md shadow-purple-200 transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {submitting ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
                                                Save Results
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Receipt className="text-purple-500" />
                            Generate Lab Bill
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Select completed lab tests to generate a bill
                        </p>
                    </div>

                    {unbilledOrders.length === 0 ? (
                        <div className="p-12 text-center">
                            <CheckCircle size={48} className="mx-auto text-emerald-200 mb-4" />
                            <h3 className="text-lg font-bold text-slate-400">All Billed</h3>
                            <p className="text-gray-400">No unbilled lab tests at the moment.</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium text-gray-500">
                                        {unbilledOrders.length} unbilled test(s)
                                    </span>
                                    <button
                                        onClick={() => {
                                            if (selectedForBilling.length === unbilledOrders.length) {
                                                setSelectedForBilling([]);
                                            } else {
                                                setSelectedForBilling(unbilledOrders.map(o => o._id));
                                            }
                                        }}
                                        className="text-sm text-purple-600 font-medium hover:underline"
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
                                                    ? 'bg-purple-50 border-purple-200'
                                                    : 'bg-white border-gray-100 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'
                                                    }`}>
                                                    {isSelected && <Check size={12} className="text-white" />}
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-sm text-purple-600 font-bold">
                                                            {order.testNumber}
                                                        </span>
                                                        <span className="text-sm text-gray-400">•</span>
                                                        <span className="text-sm text-gray-600">
                                                            {order.patient?.firstName} {order.patient?.lastName}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-700 font-medium mt-1">
                                                        {order.test?.testName || 'Lab Test'}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <p className="font-bold text-slate-800">₹{order.test?.price || 0}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {selectedForBilling.length > 0 && (
                                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-800">
                                            {selectedForBilling.length} test(s) selected
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
                                        className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 flex items-center gap-2 disabled:opacity-50"
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
                                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Payment Successful!</h3>
                                    <p className="text-gray-500 mb-6">Receipt generated for Laboratory Bill</p>

                                    <div className="bg-gray-50 p-4 rounded-xl text-left mb-6 border border-gray-100">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-500">Bill Number</span>
                                            <span className="font-mono font-bold text-slate-700">{paymentModalData.billNumber}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-500">Amount Paid</span>
                                            <span className="font-bold text-purple-600">₹{parseFloat(paymentAmount).toFixed(2)}</span>
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
                                            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Banknote size={24} className="text-purple-500" />
                                        Collect Payment
                                    </h3>

                                    <div className="p-4 bg-purple-50 rounded-xl mb-4 border border-purple-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-purple-700 font-medium">Bill Number</span>
                                            <span className="font-mono font-bold text-purple-800">{paymentModalData.billNumber}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-purple-700 font-medium">Total Amount</span>
                                            <span className="text-xl font-bold text-purple-800">₹{paymentModalData.grandTotal}</span>
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
                                                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-lg"
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
                                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
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
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                                            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 flex items-center justify-center gap-2 disabled:opacity-50"
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

export default Laboratory;

