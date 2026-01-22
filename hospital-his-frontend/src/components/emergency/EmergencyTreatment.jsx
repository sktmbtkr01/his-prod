import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateCaseStatus } from '../../features/emergency/emergencySlice';

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

    const [selectedStatus, setSelectedStatus] = useState('');
    const [confirmDischarge, setConfirmDischarge] = useState(false);

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

    const getPatientName = () => {
        const patient = emergencyCase.patient;
        if (!patient) return 'Unknown Patient';
        return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient';
    };

    const currentStatus = emergencyCase.status;

    // Filter available status options based on current status
    const getAvailableStatuses = () => {
        switch (currentStatus) {
            case 'registered':
            case 'triage':
                return STATUS_OPTIONS.filter(s => s.value === 'in-treatment');
            case 'in-treatment':
                return STATUS_OPTIONS.filter(s => ['observation', 'admitted', 'discharged', 'transferred'].includes(s.value));
            case 'observation':
                return STATUS_OPTIONS.filter(s => ['in-treatment', 'admitted', 'discharged', 'transferred'].includes(s.value));
            default:
                return [];
        }
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
                    {isDowntime && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <p className="text-yellow-800 text-sm">
                                ⚠️ Offline Mode: Changes will be queued for sync.
                            </p>
                        </div>
                    )}

                    {/* Patient Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Current Status:</span>
                                <span className="ml-2 font-medium capitalize">{currentStatus.replace('-', ' ')}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Chief Complaint:</span>
                                <span className="ml-2 font-medium">{emergencyCase.chiefComplaint}</span>
                            </div>
                            {emergencyCase.treatmentStartTime && (
                                <div className="col-span-2">
                                    <span className="text-gray-500">Treatment Started:</span>
                                    <span className="ml-2 font-medium">
                                        {new Date(emergencyCase.treatmentStartTime).toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Confirmation Dialog */}
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
                            {/* Status Actions */}
                            {availableStatuses.length > 0 ? (
                                <div className="space-y-2 mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Available Actions
                                    </label>
                                    {availableStatuses.map((status) => (
                                        <button
                                            key={status.value}
                                            onClick={() => handleStatusChange(status.value)}
                                            disabled={isLoading}
                                            className={`w-full flex items-center p-4 border rounded-lg hover:shadow-md transition-all text-left ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
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
                                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
                                    <p className="text-gray-500">No actions available for current status.</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Close Button */}
                    {!confirmDischarge && (
                        <div className="flex justify-end">
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
