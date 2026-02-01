const Appointment = require('../models/Appointment');
const Admission = require('../models/Admission');
const VitalSigns = require('../models/VitalSigns');
const LabTest = require('../models/LabTest');
const Radiology = require('../models/Radiology');
const Prescription = require('../models/Prescription');
const EMR = require('../models/EMR');
const Patient = require('../models/Patient');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get comprehensive EMR (all medical history) for a patient
 * @route   GET /api/emr/comprehensive/:patientId
 * @access  Doctor only
 */
exports.getComprehensiveEMR = asyncHandler(async (req, res, next) => {
    const { patientId } = req.params;

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
        return next(new ErrorResponse('Patient not found', 404));
    }

    // Fetch all data in parallel for performance
    const [
        appointments,
        admissions,
        vitalSigns,
        labTests,
        radiologyTests,
        prescriptions,
        emrRecords
    ] = await Promise.all([
        // OPD Appointments
        Appointment.find({ patient: patientId })
            .populate('doctor', 'profile.firstName profile.lastName')
            .populate('department', 'name')
            .sort({ scheduledDate: -1 })
            .lean(),

        // IPD Admissions
        Admission.find({ patient: patientId })
            .populate('doctor', 'profile.firstName profile.lastName')
            .populate('department', 'name')
            .populate('ward', 'name')
            .populate('bed', 'bedNumber')
            .sort({ admissionDate: -1 })
            .lean(),

        // Vital Signs
        VitalSigns.find({ patient: patientId })
            .populate('recordedBy', 'profile.firstName profile.lastName')
            .sort({ recordedAt: -1 })
            .lean(),

        // Lab Tests
        LabTest.find({ patient: patientId })
            .populate('test', 'name category')
            .populate('orderedBy', 'profile.firstName profile.lastName')
            .populate('performedBy', 'profile.firstName profile.lastName')
            .sort({ createdAt: -1 })
            .lean(),

        // Radiology Tests
        Radiology.find({ patient: patientId })
            .populate('test', 'name category')
            .populate('orderedBy', 'profile.firstName profile.lastName')
            .populate('performedBy', 'profile.firstName profile.lastName')
            .sort({ createdAt: -1 })
            .lean(),

        // Prescriptions
        Prescription.find({ patient: patientId })
            .populate('doctor', 'profile.firstName profile.lastName')
            .populate('medicines.medicine', 'name genericName')
            .sort({ createdAt: -1 })
            .lean(),

        // EMR Records (clinical notes from consultations)
        EMR.find({ patient: patientId })
            .populate('doctor', 'profile.firstName profile.lastName')
            .sort({ date: -1 })
            .lean()
    ]);

    // Check if any history exists
    const totalRecords =
        appointments.length +
        admissions.length +
        vitalSigns.length +
        labTests.length +
        radiologyTests.length +
        prescriptions.length +
        emrRecords.length;

    if (totalRecords === 0) {
        return res.status(200).json({
            success: true,
            hasHistory: false,
            message: 'EMR not available since no history.',
            data: null
        });
    }

    // Format the response
    const emrData = {
        patient: {
            _id: patient._id,
            patientId: patient.patientId,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            bloodGroup: patient.bloodGroup,
            allergies: patient.allergies,
            chronicConditions: patient.chronicConditions,
            contact: patient.contact,
            emergencyContact: patient.emergencyContact
        },
        summary: {
            totalOPDVisits: appointments.length,
            totalIPDAdmissions: admissions.length,
            totalLabTests: labTests.length,
            totalRadiologyTests: radiologyTests.length,
            totalPrescriptions: prescriptions.length
        },
        opdVisits: appointments.map(apt => ({
            _id: apt._id,
            appointmentNumber: apt.appointmentNumber,
            date: apt.scheduledDate,
            doctor: apt.doctor ? `Dr. ${apt.doctor.profile?.firstName || ''} ${apt.doctor.profile?.lastName || ''}` : 'N/A',
            department: apt.department?.name || 'N/A',
            status: apt.status,
            chiefComplaint: apt.chiefComplaint,
            diagnosis: apt.diagnosis,
            notes: apt.notes,
            prescription: apt.prescription
        })),
        ipdAdmissions: admissions.map(adm => ({
            _id: adm._id,
            admissionNumber: adm.admissionNumber,
            admissionDate: adm.admissionDate,
            dischargeDate: adm.dischargeDate,
            doctor: adm.doctor ? `Dr. ${adm.doctor.profile?.firstName || ''} ${adm.doctor.profile?.lastName || ''}` : 'N/A',
            department: adm.department?.name || 'N/A',
            ward: adm.ward?.name || 'N/A',
            bed: adm.bed?.bedNumber || 'N/A',
            status: adm.status,
            admissionType: adm.admissionType,
            diagnosis: adm.diagnosis,
            vitals: adm.vitals,
            clinicalNotes: adm.clinicalNotes,
            dischargeSummary: adm.discharge?.summary
        })),
        vitalSigns: vitalSigns.map(vs => ({
            _id: vs._id,
            recordNumber: vs.recordNumber,
            recordedAt: vs.recordedAt,
            recordedBy: vs.recordedBy ? `${vs.recordedBy.profile?.firstName || ''} ${vs.recordedBy.profile?.lastName || ''}` : 'N/A',
            bloodPressure: vs.bloodPressure,
            pulse: vs.pulse,
            temperature: vs.temperature,
            respiratoryRate: vs.respiratoryRate,
            oxygenSaturation: vs.oxygenSaturation,
            weight: vs.weight,
            height: vs.height,
            isAbnormal: vs.isAbnormal,
            isCritical: vs.isCritical,
            abnormalParameters: vs.abnormalParameters,
            criticalParameters: vs.criticalParameters
        })),
        labTests: labTests.map(lt => ({
            _id: lt._id,
            testNumber: lt.testNumber,
            testName: lt.test?.name || 'N/A',
            category: lt.test?.category || 'N/A',
            orderedBy: lt.orderedBy ? `Dr. ${lt.orderedBy.profile?.firstName || ''} ${lt.orderedBy.profile?.lastName || ''}` : 'N/A',
            orderedAt: lt.createdAt,
            status: lt.status,
            results: lt.results,
            remarks: lt.remarks,
            completedAt: lt.completedAt,
            reportPdf: lt.reportPdf,
            aiSummary: lt.aiSummary
        })),
        radiologyTests: radiologyTests.map(rt => ({
            _id: rt._id,
            testNumber: rt.testNumber,
            testName: rt.test?.name || 'N/A',
            category: rt.test?.category || 'N/A',
            orderedBy: rt.orderedBy ? `Dr. ${rt.orderedBy.profile?.firstName || ''} ${rt.orderedBy.profile?.lastName || ''}` : 'N/A',
            orderedAt: rt.createdAt,
            status: rt.status,
            findings: rt.findings,
            impression: rt.impression,
            recommendations: rt.recommendations,
            completedAt: rt.completedAt,
            images: rt.images,
            reportUrl: rt.reportUrl
        })),
        prescriptions: prescriptions.map(rx => ({
            _id: rx._id,
            prescriptionNumber: rx.prescriptionNumber,
            date: rx.createdAt,
            doctor: rx.doctor ? `Dr. ${rx.doctor.profile?.firstName || ''} ${rx.doctor.profile?.lastName || ''}` : 'N/A',
            medicines: rx.medicines?.map(m => ({
                name: m.medicine?.name || 'N/A',
                genericName: m.medicine?.genericName,
                dosage: m.dosage,
                frequency: m.frequency,
                duration: m.duration,
                instructions: m.instructions,
                quantity: m.quantity
            })),
            specialInstructions: rx.specialInstructions,
            isDispensed: rx.isDispensed
        })),
        clinicalNotes: emrRecords.map(emr => ({
            _id: emr._id,
            date: emr.date,
            visitType: emr.visitType,
            doctor: emr.doctor ? `Dr. ${emr.doctor.profile?.firstName || ''} ${emr.doctor.profile?.lastName || ''}` : 'N/A',
            chiefComplaint: emr.chiefComplaint,
            presentingIllness: emr.presentingIllness,
            examination: emr.examination,
            diagnosis: emr.diagnosis,
            treatment: emr.treatment,
            notes: emr.notes,
            vitals: emr.vitals
        }))
    };

    res.status(200).json({
        success: true,
        hasHistory: true,
        data: emrData
    });
});
