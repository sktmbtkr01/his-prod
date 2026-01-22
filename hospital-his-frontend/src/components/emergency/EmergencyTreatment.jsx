import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateCaseStatus, updateCaseVitals } from '../../features/emergency/emergencySlice';

const STATUS_OPTIONS = [
    { value: 'in-treatment', label: 'Start Treatment', color: 'bg-blue-600', description: 'Begin treating the patient' },
    { value: 'observation', label: 'Under Observation', color: 'bg-purple-600', description: 'Patient needs monitoring' },
    { value: 'admitted', label: 'Admit to IPD', color: 'bg-indigo-600', description: 'Transfer to inpatient department' },
    { value: 'discharged', label: 'Discharge', color: 'bg-green-600', description: 'Patient is ready to leave' },
    { value: 'transferred', label: 'Transfer Out', color: 'bg-yellow-600', description: 'Transfer to another facility' },
];

const EmergencyTreatment = ({ emergencyCase, onClose }) => {
    const dispatch = useDispatch();
    const { isLoading, isDowntime } = useSelector((state) => state.emergency);

    const { user } = useSelector((state) => state.auth);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [confirmDischarge, setConfirmDischarge] = useState(false);
    const [activeTab, setActiveTab] = useState(user?.role === 'nurse' ? 'vitals' : 'status');

    const handleStatusChange = async (status) => {
        // Require confirmation for discharge/admit/transfer
        if (['discharged', 'admitted', 'transferred'].includes(status)) {
            setSelectedStatus(status);
            setConfirmDischarge(true);
            return;
        }

        await dispatch(updateCaseStatus({
            id: emergencyCase._id,
            status,
        }));

        onClose();
    };

    const handleConfirmStatusChange = async () => {
        await dispatch(updateCaseStatus({
            id: emergencyCase._id,
            status: selectedStatus,
        }));

        onClose();
    };

    const handleVitalsSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const vitals = {
            bloodPressure: formData.get('bloodPressure'),
            pulse: formData.get('pulse'),
            temperature: formData.get('temperature'),
            oxygenSaturation: formData.get('oxygenSaturation'),
        };

        const result = await dispatch(updateCaseVitals({
            id: emergencyCase._id,
            vitals,
        }));

        if (updateCaseVitals.fulfilled.match(result)) {
            // Optional: Show success or just close/stay
            alert("Vitals updated successfully");
        }
    };

    const handleNotesSubmit = (e) => {
        e.preventDefault();
        // TODO: Implement add note API
        alert("Note added successfully (Mock)");
    };

    const getPatientName = () => {
        const patient = emergencyCase.patient;
        if (!patient) return 'Unknown Patient';
        return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient';
    };

    const currentStatus = emergencyCase.status;



    // Filter available status options based on current status and user role
    const getAvailableStatuses = () => {
        let options = [];
        switch (currentStatus) {
            case 'registered':
            case 'triage':
                options = STATUS_OPTIONS.filter(s => s.value === 'in-treatment');
                break;
            case 'in-treatment':
                options = STATUS_OPTIONS.filter(s => ['observation', 'admitted', 'discharged', 'transferred'].includes(s.value));
                break;
            case 'observation':
                options = STATUS_OPTIONS.filter(s => ['in-treatment', 'admitted', 'discharged', 'transferred'].includes(s.value));
                break;
            default:
                options = [];
        }

        // Role-based restrictions
        if (user?.role === 'nurse') {
            // Nurse can only move to 'in-treatment' or 'observation' (Start treatment or monitor)
            // Nurse CANNOT Discharge, Admit, or Transfer
            return options.filter(s => ['in-treatment', 'observation'].includes(s.value));
        }

        return options;
    };

    const availableStatuses = getAvailableStatuses();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                {/* Header */}
                <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
                    <h2 className="text-xl font-bold">Treatment Actions</h2>
                    <p className="text-green-200">{getPatientName()}</p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Tabs */}
                    <div className="flex border-b mb-4">
                        <button
                            className={`px-4 py-2 font-medium ${activeTab === 'status' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('status')}
                        >
                            Status
                        </button>
                        <button
                            className={`px-4 py-2 font-medium ${activeTab === 'vitals' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('vitals')}
                        >
                            Vitals
                        </button>
                        <button
                            className={`px-4 py-2 font-medium ${activeTab === 'notes' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('notes')}
                        >
                            Clinical Notes
                        </button>
                    </div>

                    {isDowntime && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <p className="text-yellow-800 text-sm">
                                ⚠️ Offline Mode: Changes will be queued for sync.
                            </p>
                        </div>
                    )}

                    {/* Patient Info Header (Always visible) */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                        <span className="font-semibold text-gray-700">Chief Complaint:</span> {emergencyCase.chiefComplaint}
                    </div>

                    {/* STATUS TAB */}
                    {activeTab === 'status' && (
                        <>
                            {confirmDischarge ? (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                    <h3 className="font-semibold text-red-800 mb-2">
                                        Confirm {STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}
                                    </h3>
                                    <p className="text-red-700 text-sm mb-4">
                                        This action will remove the patient from the active emergency board.
                                        Are you sure you want to proceed?
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setConfirmDischarge(false)}
                                            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleConfirmStatusChange}
                                            disabled={isLoading}
                                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {isLoading ? 'Processing...' : 'Confirm'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {availableStatuses.length > 0 ? (
                                        <div className="space-y-2 mb-6">
                                            <h3 className="text-sm font-medium text-gray-700 mb-2">Change Status</h3>
                                            {availableStatuses.map((status) => (
                                                <button
                                                    key={status.value}
                                                    onClick={() => handleStatusChange(status.value)}
                                                    disabled={isLoading}
                                                    className={`w-full flex items-center p-4 border rounded-lg hover:shadow-md transition-all text-left ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <span className={`w-3 h-3 rounded-full ${status.color} mr-3`}></span>
                                                    <div>
                                                        <span className="font-medium text-gray-900">{status.label}</span>
                                                        <p className="text-xs text-gray-500">{status.description}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                                            No status actions available.
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* VITALS TAB */}
                    {activeTab === 'vitals' && (
                        <form onSubmit={handleVitalsSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">BP (mmHg)</label>
                                    <input type="text" name="bloodPressure" defaultValue={emergencyCase.vitals?.bloodPressure} className="w-full border rounded p-2 text-sm" placeholder="120/80" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Pulse (bpm)</label>
                                    <input type="number" name="pulse" defaultValue={emergencyCase.vitals?.pulse} className="w-full border rounded p-2 text-sm" placeholder="72" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Temp (°F)</label>
                                    <input type="number" step="0.1" name="temperature" defaultValue={emergencyCase.vitals?.temperature} className="w-full border rounded p-2 text-sm" placeholder="98.6" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">SPO2 (%)</label>
                                    <input type="number" name="oxygenSaturation" defaultValue={emergencyCase.vitals?.oxygenSaturation} className="w-full border rounded p-2 text-sm" placeholder="98" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm">Update Vitals</button>
                            </div>
                        </form>
                    )}

                    {/* CLINICAL NOTES TAB */}
                    {activeTab === 'notes' && (
                        <form onSubmit={handleNotesSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor/Nurse Notes</label>
                                <textarea
                                    name="note"
                                    rows="4"
                                    className="w-full border rounded p-2 text-sm"
                                    placeholder="Enter clinical observations, assessments, or treatment notes..."
                                ></textarea>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">Add Note</button>
                            </div>

                            {/* Previous Notes List (Mocked for now as we don't have notes in case object yet) */}
                            <div className="mt-4 border-t pt-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">History</h4>
                                <div className="text-xs text-gray-400 italic">No previous notes recorded.</div>
                            </div>
                        </form>
                    )}

                    {/* Close Button */}
                    {!confirmDischarge && (
                        <div className="flex justify-end mt-6 pt-4 border-t">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmergencyTreatment;
