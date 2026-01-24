import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Pill, CheckCircle, Clock, User, FileText, X, Check, Package,
    AlertTriangle, Shield, FileWarning, Calendar, Receipt, Banknote, CreditCard, Loader2
} from 'lucide-react';
import pharmacyService from '../../services/pharmacy.service';
import departmentBillingService from '../../services/departmentBilling.service';
import InventoryManager from '../../components/pharmacy/InventoryManager';
import RecallManagement from '../../components/pharmacy/RecallManagement';
import BatchSelector from '../../components/pharmacy/BatchSelector';
import { SafetyAlerts, OverrideModal } from '../../components/pharmacy/SafetyAlerts';
import toast from 'react-hot-toast';

const Pharmacy = () => {
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') || 'queue';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Enhanced dispense state
    const [safetyResult, setSafetyResult] = useState(null);
    const [checkingSafety, setCheckingSafety] = useState(false);
    const [selectedBatches, setSelectedBatches] = useState({});
    const [showBatchSelector, setShowBatchSelector] = useState(null);
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideComplete, setOverrideComplete] = useState(false);
    const [dispensing, setDispensing] = useState(false);

    // Billing state
    const [unbilledDispenses, setUnbilledDispenses] = useState([]);
    const [selectedForBilling, setSelectedForBilling] = useState([]);
    const [generatingBill, setGeneratingBill] = useState(false);
    const [lastDispense, setLastDispense] = useState(null);
    const [showBillPrompt, setShowBillPrompt] = useState(false);

    // Payment state
    const [paymentModalData, setPaymentModalData] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('cash');
    const [paymentRef, setPaymentRef] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const res = await pharmacyService.getPendingPrescriptions();
            setQueue(res.data || []);
        } catch (error) {
            console.error("Error fetching pharmacy queue", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'queue') {
            fetchQueue();
            const interval = setInterval(fetchQueue, 30000);
            return () => clearInterval(interval);
        }
        if (activeTab === 'billing') {
            fetchUnbilledDispenses();
        }
    }, [activeTab]);

    const fetchUnbilledDispenses = async () => {
        try {
            const dispenses = await departmentBillingService.getUnbilledOrders('pharmacy');
            setUnbilledDispenses(dispenses || []);
        } catch (error) {
            console.error('Error fetching unbilled dispenses:', error);
        }
    };

    // Run safety check when prescription selected
    const handleSelectPrescription = async (prescription) => {
        setSelectedPrescription(prescription);
        setSafetyResult(null);
        setSelectedBatches({});
        setOverrideComplete(false);
        setCheckingSafety(true);

        try {
            // Run safety validation
            const result = await pharmacyService.validatePrescriptionSafety(prescription._id);
            setSafetyResult(result.data?.safetyResult);

            // Check if override is already complete
            if (result.data?.prescription?.safetyStatus?.overrideComplete) {
                setOverrideComplete(true);
            }
        } catch (error) {
            console.error("Error checking safety:", error);
        } finally {
            setCheckingSafety(false);
        }
    };

    // Handle batch selection for a medicine
    const handleBatchSelected = (medicineId, batches) => {
        setSelectedBatches(prev => ({
            ...prev,
            [medicineId]: batches
        }));
        setShowBatchSelector(null);
    };

    // Handle override submission
    const handleOverride = async (reason) => {
        try {
            await pharmacyService.overrideInteraction(selectedPrescription._id, null, reason);
            setOverrideComplete(true);
            setShowOverrideModal(false);
            alert('Override recorded successfully');
        } catch (error) {
            console.error("Error recording override:", error);
            alert('Failed to record override');
        }
    };

    // Check if ready to dispense
    const canDispense = () => {
        if (!selectedPrescription) return false;
        if (checkingSafety) return false;

        // Check safety
        if (safetyResult?.requiresOverride && !overrideComplete) return false;

        // Check all medicines have batch selected
        const medicines = selectedPrescription.medicines || [];
        for (const med of medicines) {
            const medicineId = med.medicine?._id || med.medicine;
            if (!selectedBatches[medicineId] || selectedBatches[medicineId].length === 0) {
                return false;
            }
        }

        return true;
    };

    // Dispense with safety
    const handleDispense = async () => {
        if (!canDispense()) return;

        setDispensing(true);
        try {
            // Build items array
            const items = [];
            for (const med of selectedPrescription.medicines) {
                const medicineId = med.medicine?._id || med.medicine;
                const batches = selectedBatches[medicineId] || [];

                for (const batch of batches) {
                    items.push({
                        medicineId,
                        batchId: batch.batchId,
                        dispensedQuantity: batch.quantity
                    });
                }
            }

            const result = await pharmacyService.dispensePrescription(selectedPrescription._id, items);
            toast.success('Medicines Dispensed Successfully!');

            // Store last dispense for billing prompt
            if (result.data?.dispense) {
                setLastDispense(result.data.dispense);
                setShowBillPrompt(true);
            }

            setSelectedPrescription(null);
            setSafetyResult(null);
            setSelectedBatches({});
            fetchQueue();
        } catch (error) {
            console.error("Error dispensing:", error);
            toast.error(error.response?.data?.error || 'Failed to dispense');
        } finally {
            setDispensing(false);
        }
    };

    // Generate bill for dispenses
    const handleGenerateBill = async (dispenseIds) => {
        if (dispenseIds.length === 0) {
            toast.error('Select at least one dispense');
            return;
        }

        setGeneratingBill(true);
        try {
            // Get encounter info from first dispense
            const firstDispense = unbilledDispenses.find(d => dispenseIds.includes(d._id));
            const encounterId = firstDispense?.prescription?.visit;
            const encounterModel = firstDispense?.prescription?.visitModel || 'Appointment';
            const patientId = firstDispense?.patient?._id;

            const result = await departmentBillingService.generatePharmacyBill(
                dispenseIds,
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
            fetchUnbilledDispenses();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to generate bill');
        } finally {
            setGeneratingBill(false);
        }
    };

    // Quick bill after dispense
    const handleQuickBill = async () => {
        if (!lastDispense) return;

        setGeneratingBill(true);
        try {
            const result = await departmentBillingService.generatePharmacyBill(
                [lastDispense._id],
                lastDispense.prescription?.visit,
                lastDispense.prescription?.visitModel || 'Appointment',
                lastDispense.patient?._id || lastDispense.patient
            );

            const bill = result.data;
            toast.success(`Bill ${bill.billNumber} generated!`);

            // Open payment modal immediately
            setPaymentModalData(bill);
            setPaymentAmount(bill.balanceAmount.toString());

            setShowBillPrompt(false);
            setLastDispense(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to generate bill');
        } finally {
            setGeneratingBill(false);
        }
    };

    // Record payment
    const handleRecordPayment = async () => {
        if (processingPayment) return; // Prevent double clicks
        if (!paymentModalData || !paymentAmount || parseFloat(paymentAmount) <= 0) {
            toast.error('Enter a valid amount');
            return;
        }

        setProcessingPayment(true);
        try {
            const result = await departmentBillingService.recordPayment(
                paymentModalData._id,
                parseFloat(paymentAmount),
                paymentMode,
                paymentRef
            );

            toast.success('Payment recorded & Receipt generated');
            setPaymentSuccess(true);
            // Refresh unbilled list as some might be partially paid or cleared
            fetchUnbilledDispenses();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Payment failed');
        } finally {
            setProcessingPayment(false);
        }
    };

    // Close payment modal and reset state
    const closePaymentModal = () => {
        setPaymentModalData(null);
        setPaymentSuccess(false);
        setPaymentAmount('');
        setPaymentRef('');
        setPaymentMode('cash');
    };

    const filteredQueue = queue.filter(item => {
        const fullName = `${item.patient?.firstName} ${item.patient?.lastName}`.toLowerCase();
        const id = item.patient?.patientId?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || id.includes(search);
    });

    const tabs = [
        { id: 'queue', label: 'Dispensing Queue', icon: Clock },
        { id: 'billing', label: 'Generate Bill', icon: Receipt },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'recalls', label: 'Recalls', icon: FileWarning },
    ];

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Pill className="text-emerald-500" size={32} /> Pharmacy
                    </h1>
                    <p className="text-gray-500 mt-1">Dispensing, Inventory & Safety Management</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1 bg-gray-100 rounded-xl">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Queue Tab */}
            {activeTab === 'queue' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:flex-none">
                                <input
                                    type="text"
                                    placeholder="Search Patient Name or ID..."
                                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <FileText size={18} className="absolute left-3 top-2.5 text-gray-400" />
                            </div>

                            <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg text-emerald-700 font-medium whitespace-nowrap">
                                <Clock size={18} />
                                <span>Pending: {filteredQueue.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading && queue.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-gray-400">Loading queue...</div>
                        ) : filteredQueue.length === 0 ? (
                            <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                <CheckCircle size={48} className="mx-auto text-emerald-200 mb-4" />
                                <h3 className="text-xl font-bold text-slate-400">
                                    {searchTerm ? 'No matches found.' : 'All Clear!'}
                                </h3>
                                <p className="text-gray-400">
                                    {searchTerm ? 'Try a different search term.' : 'No pending prescriptions at the moment.'}
                                </p>
                            </div>
                        ) : (
                            filteredQueue.map((item) => (
                                <motion.div
                                    key={item._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    layout
                                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                    onClick={() => handleSelectPrescription(item)}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                            {item.prescriptionNumber || `Rx #${item._id.slice(-6)}`}
                                        </span>
                                        {item.safetyStatus?.hasMajorInteractions && (
                                            <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                                <AlertTriangle size={12} /> Alert
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">
                                        <User size={18} className="text-gray-400" />
                                        {item.patient?.firstName} {item.patient?.lastName}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4 pl-6">{item.patient?.patientId}</p>

                                    <div className="border-t border-gray-50 pt-4 flex justify-between items-center">
                                        <div className="text-xs text-gray-500">
                                            {item.medicines?.length || 0} medicine(s)
                                        </div>
                                        <button className="text-emerald-500 font-medium text-sm group-hover:underline flex items-center gap-1">
                                            Dispense <Pill size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Receipt className="text-emerald-500" />
                                Generate Pharmacy Bill
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Select dispensed medicines to generate a bill for the patient
                            </p>
                        </div>

                        {unbilledDispenses.length === 0 ? (
                            <div className="p-12 text-center">
                                <CheckCircle size={48} className="mx-auto text-emerald-200 mb-4" />
                                <h3 className="text-lg font-bold text-slate-400">All Dispensed</h3>
                                <p className="text-gray-400">No unbilled dispenses at the moment.</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-medium text-gray-500">
                                            {unbilledDispenses.length} unbilled dispense(s)
                                        </span>
                                        <button
                                            onClick={() => {
                                                if (selectedForBilling.length === unbilledDispenses.length) {
                                                    setSelectedForBilling([]);
                                                } else {
                                                    setSelectedForBilling(unbilledDispenses.map(d => d._id));
                                                }
                                            }}
                                            className="text-sm text-emerald-600 font-medium hover:underline"
                                        >
                                            {selectedForBilling.length === unbilledDispenses.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {unbilledDispenses.map((dispense) => {
                                            const isSelected = selectedForBilling.includes(dispense._id);
                                            return (
                                                <div
                                                    key={dispense._id}
                                                    onClick={() => {
                                                        setSelectedForBilling(prev =>
                                                            prev.includes(dispense._id)
                                                                ? prev.filter(id => id !== dispense._id)
                                                                : [...prev, dispense._id]
                                                        );
                                                    }}
                                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${isSelected
                                                        ? 'bg-emerald-50 border-emerald-200'
                                                        : 'bg-white border-gray-100 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                                                        }`}>
                                                        {isSelected && <Check size={12} className="text-white" />}
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-sm text-emerald-600 font-bold">
                                                                {dispense.dispenseNumber}
                                                            </span>
                                                            <span className="text-sm text-gray-400">•</span>
                                                            <span className="text-sm text-gray-600">
                                                                {dispense.patient?.firstName} {dispense.patient?.lastName}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {dispense.items?.length || 0} item(s) • {new Date(dispense.dispensedAt).toLocaleDateString()}
                                                        </p>
                                                    </div>

                                                    <div className="text-right">
                                                        <p className="font-bold text-slate-800">₹{dispense.netAmount || 0}</p>
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
                                                {selectedForBilling.length} dispense(s) selected
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Total: ₹{unbilledDispenses
                                                    .filter(d => selectedForBilling.includes(d._id))
                                                    .reduce((sum, d) => sum + (d.netAmount || 0), 0)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleGenerateBill(selectedForBilling)}
                                            disabled={generatingBill}
                                            className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50"
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
                </div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <InventoryManager />
                </div>
            )}

            {/* Recalls Tab */}
            {activeTab === 'recalls' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <RecallManagement />
                </div>
            )}

            {/* Enhanced Dispensing Modal */}
            <AnimatePresence>
                {selectedPrescription && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedPrescription(null)}></div>

                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            {/* Header */}
                            <div className="bg-emerald-600 p-6 text-white flex-shrink-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <Pill className="text-emerald-200" /> Dispense Medicines
                                        </h2>
                                        <p className="text-emerald-100 mt-1">
                                            {selectedPrescription.patient?.firstName} {selectedPrescription.patient?.lastName}
                                        </p>
                                    </div>
                                    <button onClick={() => setSelectedPrescription(null)} className="p-2 bg-emerald-700/50 rounded-full hover:bg-emerald-700 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto flex-1">
                                {/* Safety Alerts Section */}
                                {checkingSafety ? (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
                                        <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                                        <span className="text-gray-600">Running safety checks...</span>
                                    </div>
                                ) : safetyResult && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Shield size={16} />
                                            Safety Check Results
                                        </h3>
                                        <SafetyAlerts
                                            interactions={safetyResult.interactions || []}
                                            allergyConflicts={safetyResult.allergyConflicts || []}
                                            hasMajor={safetyResult.hasMajor}
                                            showOverrideButton={true}
                                            overrideComplete={overrideComplete}
                                            onOverride={() => setShowOverrideModal(true)}
                                        />
                                    </div>
                                )}

                                {/* Medicines List with Batch Selection */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                                        Medicines & Batch Selection
                                    </h3>

                                    <div className="space-y-3">
                                        {(selectedPrescription.medicines || []).map((med, idx) => {
                                            const medicineId = med.medicine?._id || med.medicine;
                                            const medicineName = med.medicine?.name || 'Unknown';
                                            const batches = selectedBatches[medicineId] || [];
                                            const totalSelected = batches.reduce((sum, b) => sum + b.quantity, 0);

                                            return (
                                                <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="font-bold text-slate-800">{medicineName}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {med.dosage} • {med.frequency} • {med.duration}
                                                            </div>
                                                            <div className="text-sm text-emerald-600 font-medium mt-1">
                                                                Need: {med.quantity} units
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <button
                                                                onClick={() => setShowBatchSelector({ medicineId, medicineName, quantity: med.quantity })}
                                                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${totalSelected >= med.quantity
                                                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                                                    : 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                                                                    }`}
                                                            >
                                                                {totalSelected > 0 ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <Check size={14} />
                                                                        {totalSelected} selected
                                                                    </span>
                                                                ) : (
                                                                    'Select Batches'
                                                                )}
                                                            </button>
                                                            {batches.length > 0 && (
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {batches.map(b => b.batchNumber).join(', ')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
                                <div className="text-sm text-gray-500">
                                    {safetyResult?.requiresOverride && !overrideComplete && (
                                        <span className="text-red-600 flex items-center gap-1">
                                            <AlertTriangle size={16} />
                                            Override required before dispensing
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedPrescription(null)}
                                        className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDispense}
                                        disabled={!canDispense() || dispensing}
                                        className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {dispensing ? (
                                            'Dispensing...'
                                        ) : (
                                            <>
                                                <Check size={20} /> Dispense
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                /* Success View */
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Payment Successful!</h3>
                                    <p className="text-gray-500 mb-6">Receipt generated for Pharmacy Bill</p>

                                    <div className="bg-gray-50 p-4 rounded-xl text-left mb-6 border border-gray-100">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-500">Bill Number</span>
                                            <span className="font-mono font-bold text-slate-700">{paymentModalData.billNumber}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-500">Amount Paid</span>
                                            <span className="font-bold text-emerald-600">₹{parseFloat(paymentAmount).toFixed(2)}</span>
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
                                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Payment Form */
                                <>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Banknote size={24} className="text-emerald-500" />
                                        Collect Payment
                                    </h3>

                                    <div className="p-4 bg-emerald-50 rounded-xl mb-4 border border-emerald-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-emerald-700 font-medium">Bill Number</span>
                                            <span className="font-mono font-bold text-emerald-800">{paymentModalData.billNumber}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-emerald-700 font-medium">Total Amount</span>
                                            <span className="text-xl font-bold text-emerald-800">₹{paymentModalData.grandTotal}</span>
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
                                                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-lg"
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
                                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
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
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
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

            {/* Batch Selector Modal */}
            <AnimatePresence>
                {showBatchSelector && (
                    <BatchSelector
                        medicineId={showBatchSelector.medicineId}
                        medicineName={showBatchSelector.medicineName}
                        quantityNeeded={showBatchSelector.quantity}
                        onSelect={(batches) => handleBatchSelected(showBatchSelector.medicineId, batches)}
                        onClose={() => setShowBatchSelector(null)}
                    />
                )}
            </AnimatePresence>

            {/* Override Modal */}
            <AnimatePresence>
                {showOverrideModal && (
                    <OverrideModal
                        onSubmit={handleOverride}
                        onClose={() => setShowOverrideModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Pharmacy;
