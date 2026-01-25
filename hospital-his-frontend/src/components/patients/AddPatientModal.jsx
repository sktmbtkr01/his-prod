import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Scan, Shield } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { createPatient } from '../../features/patients/patientsSlice';
import ScanIDModal from '../idScan/ScanIDModal';

const AddPatientModal = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const [step, setStep] = useState('form'); // 'form' or 'success'
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);

    // Initial State
    const initialFormData = {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        phone: '',
        email: '',
        bloodGroup: '',
        identificationMark: '',
        maskedAadhaar: '',
        address: {
            street: '',
            city: '',
            state: '',
            pincode: ''
        },
        idDocument: {
            hasOptedIn: false,
            imageData: null, // Base64 for preview
        }
    };
    const [formData, setFormData] = useState(initialFormData);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    /**
     * Handle extracted data from ID scan
     * Auto-fills the form with extracted information
     */
    const handleIdExtracted = (extractedData) => {
        setFormData(prev => ({
            ...prev,
            firstName: extractedData.firstName || prev.firstName,
            lastName: extractedData.lastName || prev.lastName,
            dateOfBirth: extractedData.dateOfBirth || prev.dateOfBirth,
            gender: extractedData.gender || prev.gender,
            phone: extractedData.phone || prev.phone,
            maskedAadhaar: extractedData.maskedAadhaar || prev.maskedAadhaar,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Prepare data for submission
            const submitData = { ...formData };

            // If ID image was captured, we'll send it as base64
            // Backend will handle saving and return the path
            if (formData.idDocument.imageData) {
                submitData.idDocumentImage = formData.idDocument.imageData;
            }
            delete submitData.idDocument.imageData; // Don't store raw base64 in schema

            await dispatch(createPatient(submitData)).unwrap();
            setStep('success');
            setTimeout(() => {
                setStep('form');
                setFormData(initialFormData);
                onClose();
            }, 2500);
        } catch (error) {
            console.error(error);
            alert('Failed to create patient: ' + error);
        }
    };

    // Cleanup on close
    const handleClose = () => {
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={handleClose}
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden"
                >
                    {step === 'form' ? (
                        <>
                            {/* Header with Scan ID button */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-slate-800">New Patient Registration</h2>
                                <div className="flex items-center gap-2">
                                    {/* Scan ID Button - NEW ADDITION */}
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setIsScanModalOpen(true)}
                                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md text-sm font-medium"
                                    >
                                        <Scan size={16} />
                                        Scan ID
                                    </motion.button>
                                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-gray-500">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                                {/* ID Scan hint banner */}
                                {!formData.maskedAadhaar && (
                                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-sm">
                                        <Scan size={18} />
                                        <p>
                                            <strong>Tip:</strong> Click "Scan ID" to auto-fill patient details from Aadhaar card
                                        </p>
                                    </div>
                                )}

                                {/* Show masked Aadhaar if scanned */}
                                {formData.maskedAadhaar && (
                                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                        <Shield size={18} className="text-emerald-600" />
                                        <div>
                                            <p className="text-sm font-medium text-emerald-800">ID Verified</p>
                                            <p className="text-xs text-emerald-600 font-mono">
                                                Aadhaar: {formData.maskedAadhaar}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                        <input required name="firstName" value={formData.firstName} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" placeholder="John" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                        <input required name="lastName" value={formData.lastName} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Doe" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
                                        <input required type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                                        <select required name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                                            <option value="">Select</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                                        <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="+91 98765 43210" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                                        <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                                            <option value="">Select</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                                    <input name="address.city" value={formData.address.city} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="City" />
                                </div>

                                {/* Identification Section */}
                                <div className="border-t border-gray-100 pt-6">
                                    <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Identification</h3>

                                    {/* Birth Mark / Identification Mark */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Birth Mark / Identification Mark
                                            <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                                        </label>
                                        <input
                                            name="identificationMark"
                                            value={formData.identificationMark}
                                            onChange={handleChange}
                                            maxLength={100}
                                            className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder="e.g. Mole on left cheek"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Max 100 characters. Helps in patient identification.</p>
                                    </div>

                                    {/* ID Verification Section */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="font-semibold text-slate-700">ID Verification</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    📋 Use "Scan ID" button above to capture and verify patient identity.
                                                </p>
                                            </div>
                                            {formData.maskedAadhaar && (
                                                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                                    <Check size={12} /> Verified
                                                </span>
                                            )}
                                        </div>

                                        {!formData.maskedAadhaar && (
                                            <p className="text-sm text-gray-500 text-center py-4">
                                                Click the <strong>"Scan ID"</strong> button in the header to scan and verify patient ID.
                                            </p>
                                        )}
                                    </div>
                                </div>



                                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                    <button type="button" onClick={handleClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
                                    <button type="submit" className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-md font-medium">
                                        Register Patient
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-80">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-4"
                            >
                                <Check size={40} strokeWidth={3} />
                            </motion.div>
                            <motion.h3
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-xl font-bold text-slate-800"
                            >
                                Registration Successful!
                            </motion.h3>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-gray-500 mt-2"
                            >
                                Patient record has been created.
                            </motion.p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Scan ID Modal */}
            <ScanIDModal
                isOpen={isScanModalOpen}
                onClose={() => setIsScanModalOpen(false)}
                onExtracted={handleIdExtracted}
            />
        </AnimatePresence>
    );
};

export default AddPatientModal;

