import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Eye, X, FileText, Image, RefreshCw, Shield, Loader, CheckCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:5001/api/v1/';
const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

/**
 * DoctorRadiologyTests - Doctor page to view completed radiology tests
 * Route: /dashboard/doctor-radiology-tests
 */
const DoctorRadiologyTests = () => {
    const [completedTests, setCompletedTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTest, setSelectedTest] = useState(null);
    const [showModal, setShowModal] = useState(false);
    // Risk Level State
    const [selectedRiskLevel, setSelectedRiskLevel] = useState('NORMAL');
    const [riskLoading, setRiskLoading] = useState(false);
    const [savedRiskLevel, setSavedRiskLevel] = useState(null);

    useEffect(() => {
        fetchCompletedTests();
    }, []);

    const fetchCompletedTests = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}radiology/doctor/results`, getConfig());
            setCompletedTests(response.data.data || []);
        } catch (err) {
            console.error('Error fetching completed radiology tests:', err);
        } finally {
            setLoading(false);
        }
    };

    const openTestDetails = async (test) => {
        try {
            const response = await axios.get(`${API_URL}radiology/doctor/results/${test._id}`, getConfig());
            setSelectedTest(response.data.data);
            setShowModal(true);
        } catch (err) {
            console.error('Error fetching test details:', err);
            // Fallback to use test from list
            setSelectedTest(test);
            setShowModal(true);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedTest(null);
        setSelectedRiskLevel('NORMAL');
        setSavedRiskLevel(null);
    };

    // Set Radiology Risk Level for the appointment
    const handleSetRiskLevel = async () => {
        if (!selectedTest?.visit) {
            toast.error('No appointment linked to this radiology test');
            return;
        }
        setRiskLoading(true);
        try {
            const response = await axios.put(
                `${API_URL}opd/appointments/${selectedTest.visit}/radiology-risk`,
                { riskLevel: selectedRiskLevel },
                getConfig()
            );
            setSavedRiskLevel(selectedRiskLevel);
            toast.success(`Radiology risk level set to ${selectedRiskLevel} (Score: ${response.data.data.finalRiskScore})`);
        } catch (err) {
            console.error('Error setting risk level:', err);
            toast.error(err.response?.data?.error || 'Failed to set risk level');
        } finally {
            setRiskLoading(false);
        }
    };

    const getScanImageUrl = () => {
        if (selectedTest?.scanImage) {
            const imagePath = selectedTest.scanImage.startsWith('/')
                ? selectedTest.scanImage
                : '/' + selectedTest.scanImage;
            return `http://localhost:5001${imagePath}`;
        }
        return null;
    };

    const getReportUrl = () => {
        if (selectedTest?.reportUrl) {
            const reportPath = selectedTest.reportUrl.startsWith('/')
                ? selectedTest.reportUrl
                : '/' + selectedTest.reportUrl;
            return `http://localhost:5001${reportPath}`;
        }
        return null;
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-violet-100 rounded-xl text-violet-600">
                        <ScanLine size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Radiology Test Results</h1>
                        <p className="text-gray-500 text-sm">View completed radiology scans and reports</p>
                    </div>
                </div>
                <button
                    onClick={fetchCompletedTests}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {/* Tests List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-violet-600 border-t-transparent mb-4"></div>
                        <p className="text-gray-500">Loading completed radiology tests...</p>
                    </div>
                ) : completedTests.length === 0 ? (
                    <div className="p-12 text-center">
                        <ScanLine size={40} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No completed radiology tests found</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Test #</th>
                                <th className="px-6 py-4">Patient</th>
                                <th className="px-6 py-4">Scan Type</th>
                                <th className="px-6 py-4">Completed</th>
                                <th className="px-6 py-4">Report</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {completedTests.map((test) => (
                                <tr key={test._id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-sm text-slate-600">{test.testNumber}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
                                                {test.patient?.firstName?.[0]}{test.patient?.lastName?.[0]}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-700">
                                                    {test.patient?.firstName} {test.patient?.lastName}
                                                </div>
                                                <div className="text-xs text-gray-400">{test.patient?.patientId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-700">{test.test?.testName || 'Unknown'}</div>
                                        {test.test?.modality && (
                                            <span className="text-xs text-violet-500 px-1.5 py-0.5 bg-violet-50 rounded">
                                                {test.test.modality}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {test.completedAt ? new Date(test.completedAt).toLocaleDateString('en-IN') : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {test.scanImage || test.reportUrl ? (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                                                <Image size={12} /> Available
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                                                No Image
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => openTestDetails(test)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            <Eye size={16} /> View Results
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Results Modal */}
            <AnimatePresence>
                {showModal && selectedTest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={closeModal}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="bg-violet-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <ScanLine size={24} /> Radiology Results
                                    </h2>
                                    <p className="text-violet-200 text-sm mt-1">
                                        {selectedTest.test?.testName} • {selectedTest.testNumber}
                                    </p>
                                </div>
                                <button onClick={closeModal} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                {/* Patient Info */}
                                <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 rounded-xl">
                                    <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold">
                                        {selectedTest.patient?.firstName?.[0]}{selectedTest.patient?.lastName?.[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">
                                            {selectedTest.patient?.firstName} {selectedTest.patient?.lastName}
                                        </div>
                                        <div className="text-sm text-gray-500">{selectedTest.patient?.patientId}</div>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <div className="text-sm text-gray-500">Modality</div>
                                        <div className="font-medium text-violet-600">{selectedTest.test?.modality || 'N/A'}</div>
                                    </div>
                                </div>

                                {/* Scan Image */}
                                {getScanImageUrl() && (
                                    <div className="mb-6">
                                        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <Image size={18} className="text-violet-500" /> Scan Image
                                        </h3>
                                        <div className="bg-gray-900 rounded-xl p-4 flex justify-center">
                                            <img
                                                src={getScanImageUrl()}
                                                alt="Radiology Scan"
                                                className="max-h-96 rounded-lg"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                        <a
                                            href={getScanImageUrl()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg font-medium transition-colors"
                                        >
                                            <Image size={16} /> Open Full Image
                                        </a>
                                    </div>
                                )}

                                {/* Report PDF */}
                                {getReportUrl() && (
                                    <div className="mb-6">
                                        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <FileText size={18} className="text-red-500" /> Report PDF
                                        </h3>
                                        <a
                                            href={getReportUrl()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            <FileText size={18} /> View PDF Report
                                        </a>
                                    </div>
                                )}

                                {/* Findings */}
                                {selectedTest.findings && (
                                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                        <h3 className="font-bold text-blue-800 mb-2">📋 Findings</h3>
                                        <p className="text-blue-700 whitespace-pre-line">{selectedTest.findings}</p>
                                    </div>
                                )}

                                {/* Impression */}
                                {selectedTest.impression && (
                                    <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                        <h3 className="font-bold text-purple-800 mb-2">🔍 Impression</h3>
                                        <p className="text-purple-700 whitespace-pre-line">{selectedTest.impression}</p>
                                    </div>
                                )}

                                {/* Recommendations */}
                                {selectedTest.recommendations && (
                                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                        <h3 className="font-bold text-amber-800 mb-2">💡 Recommendations</h3>
                                        <p className="text-amber-700 whitespace-pre-line">{selectedTest.recommendations}</p>
                                    </div>
                                )}

                                {/* Report Summary if exists */}
                                {selectedTest.reportSummary && (
                                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                                        <h3 className="font-bold text-green-800 mb-2">📄 Report Summary</h3>
                                        <p className="text-green-700 whitespace-pre-line">{selectedTest.reportSummary}</p>
                                    </div>
                                )}

                                {/* No report data message */}
                                {!getScanImageUrl() && !getReportUrl() && !selectedTest.findings && !selectedTest.impression && (
                                    <div className="p-8 text-center bg-gray-50 rounded-xl">
                                        <ScanLine size={40} className="mx-auto text-gray-300 mb-3" />
                                        <p className="text-gray-500">No detailed report available for this scan.</p>
                                    </div>
                                )}

                                {/* Footer Info */}
                                <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
                                    <div className="flex justify-between">
                                        <span>Performed by: {selectedTest.performedBy?.profile?.firstName} {selectedTest.performedBy?.profile?.lastName || 'N/A'}</span>
                                        <span>Completed: {selectedTest.completedAt ? new Date(selectedTest.completedAt).toLocaleString() : 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Radiology Risk Level Section */}
                                <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <Shield size={18} className="text-violet-500" /> Set Radiology Risk Level
                                        {savedRiskLevel && (
                                            <span className="ml-auto text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                                                <CheckCircle size={12} /> Saved: {savedRiskLevel}
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-3">
                                        Based on radiology findings, select the patient's risk level. This will update their OPD risk score.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={selectedRiskLevel}
                                            onChange={(e) => { setSelectedRiskLevel(e.target.value); setSavedRiskLevel(null); }}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-500"
                                        >
                                            <option value="NORMAL">Normal (+0)</option>
                                            <option value="MILD">Mild (+1)</option>
                                            <option value="MODERATE">Moderate (+2)</option>
                                            <option value="SEVERE">Severe (+3)</option>
                                            <option value="CRITICAL">Critical (+4)</option>
                                        </select>
                                        <button
                                            onClick={handleSetRiskLevel}
                                            disabled={riskLoading || selectedRiskLevel === savedRiskLevel}
                                            className={`px-5 py-2 rounded-lg font-medium flex items-center gap-2 ${selectedRiskLevel === savedRiskLevel
                                                ? 'bg-green-100 text-green-700 cursor-default'
                                                : 'bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50'
                                                }`}
                                        >
                                            {riskLoading ? <Loader size={16} className="animate-spin" /> :
                                                selectedRiskLevel === savedRiskLevel ? <CheckCircle size={16} /> : <Shield size={16} />}
                                            {riskLoading ? 'Setting...' : selectedRiskLevel === savedRiskLevel ? 'Saved!' : 'Set Risk Level'}
                                        </button>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        onClick={closeModal}
                                        className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DoctorRadiologyTests;
