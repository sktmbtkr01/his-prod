const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');
const { APPOINTMENT_STATUS } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const fs = require('fs');

/**
 * @desc    Create a new appointment
 * @route   POST /api/opd/appointments
 */
exports.createAppointment = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user.id;

    const appointment = await Appointment.create(req.body);
    await appointment.populate(['patient', 'doctor', 'department']);

    // Emit socket event for real-time dashboard updates
    const io = req.app.get('io');
    if (io) {
        io.emit('appointment-updated', {
            id: appointment._id,
            status: appointment.status,
            type: 'new',
            time: new Date()
        });
        console.log(`[OPD] Emitted appointment-updated event for new appointment ${appointment._id}`);
    }

    res.status(201).json({
        success: true,
        data: appointment,
    });
});

/**
 * @desc    Get all appointments
 * @route   GET /api/opd/appointments
 */
exports.getAllAppointments = asyncHandler(async (req, res, next) => {
    const { date, doctor, department, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (date) query.scheduledDate = new Date(date);
    if (doctor) query.doctor = doctor;
    if (department) query.department = department;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const appointments = await Appointment.find(query)
        .populate('patient', 'patientId firstName lastName phone')
        .populate('doctor', 'profile.firstName profile.lastName')
        .populate('department', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ scheduledDate: 1, tokenNumber: 1 });

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
        success: true,
        count: appointments.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: appointments,
    });
});

/**
 * @desc    Get appointment by ID
 * @route   GET /api/opd/appointments/:id
 */
exports.getAppointmentById = asyncHandler(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id)
        .populate('patient')
        .populate('doctor', 'profile')
        .populate('department');

    if (!appointment) {
        return next(new ErrorResponse('Appointment not found', 404));
    }

    res.status(200).json({
        success: true,
        data: appointment,
    });
});

/**
 * @desc    Update appointment
 * @route   PUT /api/opd/appointments/:id
 */
exports.updateAppointment = asyncHandler(async (req, res, next) => {
    // Fetch full appointment first to ensure all fields are populated
    let appointment = await Appointment.findById(req.params.id)
        .populate('patient')
        .populate('doctor')
        .populate('department');

    if (!appointment) {
        return next(new ErrorResponse('Appointment not found', 404));
    }

    // Update the appointment with new values
    Object.assign(appointment, req.body);
    await appointment.save();

    // Reload to get populated references after save
    appointment = await Appointment.findById(appointment._id)
        .populate('patient')
        .populate('doctor')
        .populate('department');

    // Automated Billing: If status changed to 'completed', add Consultation Fee
    if (req.body.status === 'completed') {
        try {
            const { addItemToBill } = require('../services/billing.internal.service');

            // Ensure appointment has patient and doctor data
            if (!appointment.patient || !appointment.doctor) {
                throw new Error('Appointment patient or doctor is missing');
            }

            await addItemToBill({
                patientId: appointment.patient._id,
                visitId: appointment._id,
                visitType: 'opd',
                itemType: 'consultation',
                itemReference: appointment._id,
                description: `OPD Consultation - Dr. ${appointment.doctor.profile.firstName} ${appointment.doctor.profile.lastName}`,
                quantity: 1,
                rate: undefined, // Will fetch default tariff in service
                generatedBy: req.user.id
            });
            console.log(`[OPD] Billing trigger sent for visit ${appointment._id}`);
        } catch (err) {
            console.error('[OPD] Failed to trigger automated billing:', err);
            console.error(err.stack); // Log stack trace
        }

        // CREATE PRESCRIPTION IF PROVIDED
        if (req.body.prescription && Array.isArray(req.body.prescription) && req.body.prescription.length > 0) {
            try {
                fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Start creating prescription for ${appointment._id}\n`);
                console.log(`[OPD] Creating prescription for visit ${appointment._id}`);
                const prescriptionItems = [];

                for (const medItem of req.body.prescription) {
                    fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Processing med: ${medItem.name}\n`);

                    // Validate required fields
                    const dosage = (medItem.dosage || '').trim();
                    const frequency = (medItem.frequency || '').trim();
                    const duration = (medItem.duration || '').trim();

                    if (!dosage || !frequency || !duration) {
                        fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Missing required fields for ${medItem.name}: dosage=${dosage}, frequency=${frequency}, duration=${duration}\n`);
                        console.warn(`[OPD] Missing required fields for medicine: ${medItem.name}`);
                        continue; // Skip this medicine
                    }

                    // Look up medicine by name (case insensitive regex)
                    let medicine = await Medicine.findOne({
                        $or: [
                            { name: { $regex: new RegExp('^' + medItem.name.trim(), 'i') } },
                            { medicineCode: { $regex: new RegExp('^' + medItem.name.trim(), 'i') } }
                        ]
                    });

                    if (medicine) {
                        fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Found med: ${medicine.name} (${medicine._id})\n`);
                        prescriptionItems.push({
                            medicine: medicine._id,
                            dosage: dosage,
                            frequency: frequency,
                            duration: duration,
                            quantity: medItem.quantity || 10,
                            instructions: (medItem.instructions || '').trim()
                        });
                    } else {
                        fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Med NOT FOUND: ${medItem.name}\n`);
                        console.warn(`[OPD] Medicine not found: ${medItem.name}`);
                    }
                }

                if (prescriptionItems.length > 0) {
                    fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Creating Prescription with ${prescriptionItems.length} items\n`);

                    // CRITICAL FIX: Use appointment.patient._id and appointment.doctor._id properly
                    // appointment was already populated above, so these should be objects not null
                    const newRx = await Prescription.create({
                        patient: appointment.patient._id,
                        doctor: appointment.doctor._id,
                        visit: appointment._id,
                        visitModel: 'Appointment',
                        medicines: prescriptionItems,
                        isDispensed: false,
                        specialInstructions: req.body.notes || ''
                    });
                    fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Created Rx ID: ${newRx._id}\n`);
                    console.log(`[OPD] Prescription created successfully with ${prescriptionItems.length} items.`);
                } else {
                    fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] No valid medicines found to create Rx\n`);
                }
            } catch (err) {
                fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] ERROR: ${err.message}\n${err.stack}\n`);
                console.error('[OPD] Failed to create prescription:', err);
                console.error(err.stack);
            }
        } else {
            fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] No prescription body found or empty array\n`);
        }

        // AUTO-CREATE CLINICAL CODING RECORD
        try {
            const { createCodingForEncounter } = require('../services/clinicalCoding.service');
            await createCodingForEncounter({
                patient: appointment.patient._id,
                encounter: appointment._id,
                encounterModel: 'Appointment',
                encounterType: 'opd',
                finalizingDoctor: appointment.doctor._id || req.user.id,
                createdBy: req.user.id
            });
            console.log(`[OPD] Clinical coding record created for visit ${appointment._id}`);
        } catch (err) {
            console.error('[OPD] Failed to create clinical coding record:', err.message);
        }
    }

    // Emit socket event for real-time dashboard updates
    const io = req.app.get('io');
    if (io) {
        io.emit('appointment-updated', {
            id: appointment._id,
            status: appointment.status,
            time: new Date()
        });
        console.log(`[OPD] Emitted appointment-updated event for ${appointment._id}`);
    }

    res.status(200).json({
        success: true,
        data: appointment,
    });
});

/**
 * @desc    Cancel appointment
 * @route   DELETE /api/opd/appointments/:id
 */
exports.cancelAppointment = asyncHandler(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        return next(new ErrorResponse('Appointment not found', 404));
    }

    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    await appointment.save();

    res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully',
    });
});

/**
 * @desc    Check-in patient
 * @route   PUT /api/opd/appointments/:id/checkin
 */
exports.checkInPatient = asyncHandler(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        return next(new ErrorResponse('Appointment not found', 404));
    }

    // Generate token number for the day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tokenCount = await Appointment.countDocuments({
        doctor: appointment.doctor,
        scheduledDate: { $gte: today },
        status: { $in: [APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_CONSULTATION, APPOINTMENT_STATUS.COMPLETED] },
    });

    appointment.status = APPOINTMENT_STATUS.CHECKED_IN;
    appointment.tokenNumber = tokenCount + 1;
    await appointment.save();

    // Emit socket event for real-time dashboard updates
    const io = req.app.get('io');
    if (io) {
        io.emit('appointment-updated', {
            id: appointment._id,
            status: appointment.status,
            time: new Date()
        });
    }

    res.status(200).json({
        success: true,
        data: appointment,
    });
});

/**
 * @desc    Get OPD queue
 * @route   GET /api/opd/queue
 */
exports.getOPDQueue = asyncHandler(async (req, res, next) => {
    const { doctor, department } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = {
        scheduledDate: { $gte: today },
        status: { $in: [APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.SCHEDULED] },
    };

    if (doctor) query.doctor = doctor;
    if (department) query.department = department;

    const queue = await Appointment.find(query)
        .populate('patient', 'patientId firstName lastName')
        .populate('doctor', 'profile.firstName profile.lastName')
        .sort({ tokenNumber: 1, scheduledTime: 1 });

    res.status(200).json({
        success: true,
        count: queue.length,
        data: queue,
    });
});

/**
 * @desc    Get OPD dashboard stats
 * @route   GET /api/opd/dashboard
 */
exports.getDashboard = asyncHandler(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayStats, statusBreakdown] = await Promise.all([
        Appointment.countDocuments({
            scheduledDate: { $gte: today, $lt: tomorrow },
        }),
        Appointment.aggregate([
            { $match: { scheduledDate: { $gte: today, $lt: tomorrow } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalToday: todayStats,
            statusBreakdown: statusBreakdown.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
        },
    });
});

/**
 * Calculate NEWS2 score from vitals
 */
const calculateNEWS2 = (vitals) => {
    let score = 0;

    // Respiratory Rate
    const respRate = vitals.respiratoryRate?.rate;
    if (respRate) {
        if (respRate <= 8) score += 3;
        else if (respRate >= 9 && respRate <= 11) score += 1;
        else if (respRate >= 12 && respRate <= 20) score += 0;
        else if (respRate >= 21 && respRate <= 24) score += 2;
        else if (respRate >= 25) score += 3;
    }

    // SpO2 (Oxygen Saturation)
    const spo2 = vitals.oxygenSaturation?.value;
    if (spo2) {
        if (spo2 <= 91) score += 3;
        else if (spo2 >= 92 && spo2 <= 93) score += 2;
        else if (spo2 >= 94 && spo2 <= 95) score += 1;
        else if (spo2 >= 96) score += 0;
    }

    // Supplemental Oxygen
    if (vitals.supplementalOxygen === true) score += 2;

    // Systolic BP
    const systolic = vitals.bloodPressure?.systolic;
    if (systolic) {
        if (systolic <= 90) score += 3;
        else if (systolic >= 91 && systolic <= 100) score += 2;
        else if (systolic >= 101 && systolic <= 110) score += 1;
        else if (systolic >= 111 && systolic <= 219) score += 0;
        else if (systolic >= 220) score += 3;
    }

    // Heart Rate / Pulse
    const pulse = vitals.pulse?.rate;
    if (pulse) {
        if (pulse <= 40) score += 3;
        else if (pulse >= 41 && pulse <= 50) score += 1;
        else if (pulse >= 51 && pulse <= 90) score += 0;
        else if (pulse >= 91 && pulse <= 110) score += 1;
        else if (pulse >= 111 && pulse <= 130) score += 2;
        else if (pulse >= 131) score += 3;
    }

    // Temperature (Celsius)
    const temp = vitals.temperature?.value;
    if (temp) {
        if (temp <= 35.0) score += 3;
        else if (temp >= 35.1 && temp <= 36.0) score += 1;
        else if (temp >= 36.1 && temp <= 38.0) score += 0;
        else if (temp >= 38.1 && temp <= 39.0) score += 1;
        else if (temp >= 39.1) score += 2;
    }

    // AVPU (Level of Consciousness)
    const avpu = vitals.avpuScore;
    if (avpu && avpu !== 'alert') score += 3;

    // Determine risk level
    let riskLevel = 'low';
    if (score >= 7 || (respRate && (respRate <= 8 || respRate >= 25)) ||
        (spo2 && spo2 <= 91) || (systolic && (systolic <= 90 || systolic >= 220)) ||
        (pulse && (pulse <= 40 || pulse >= 131)) || (temp && temp <= 35.0) ||
        (avpu && avpu !== 'alert')) {
        riskLevel = 'high';
    } else if (score >= 5 && score <= 6) {
        riskLevel = 'medium';
    } else if (score >= 1 && score <= 4) {
        riskLevel = 'low_medium';
    }

    return { score, riskLevel };
};

/**
 * @desc    Record vitals for OPD appointment (Nurse only)
 * @route   POST /api/opd/appointments/:id/vitals
 */
const VitalSigns = require('../models/VitalSigns');
const riskScoreService = require('../services/riskScore.service');
const mongoose = require('mongoose');

exports.recordVitals = asyncHandler(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id).populate('patient');

    if (!appointment) {
        return next(new ErrorResponse('Appointment not found', 404));
    }

    // Check if vitals already exist for this appointment - no updates allowed
    const existingVitals = await VitalSigns.findOne({ appointment: appointment._id });
    if (existingVitals) {
        return next(new ErrorResponse('Vitals already recorded for this appointment. Cannot update.', 400));
    }

    // Build vitals data
    const vitalsData = {
        patient: appointment.patient._id,
        encounterType: 'opd',
        appointment: appointment._id,
        recordedBy: req.user.id,
        recordedAt: new Date(),
        bloodPressure: {
            systolic: req.body.systolicBP,
            diastolic: req.body.diastolicBP,
        },
        pulse: {
            rate: req.body.heartRate,
        },
        temperature: {
            value: req.body.temperature,
            unit: 'celsius',
        },
        respiratoryRate: {
            rate: req.body.respiratoryRate,
        },
        oxygenSaturation: {
            value: req.body.spo2,
            onOxygen: req.body.supplementalOxygen || false,
        },
        supplementalOxygen: req.body.supplementalOxygen || false,
        avpuScore: req.body.avpuScore || 'alert',
        consciousness: req.body.avpuScore === 'new_confusion' ? 'confused' : req.body.avpuScore || 'alert',
    };

    // Calculate NEWS2 score
    const news2Result = calculateNEWS2(vitalsData);
    vitalsData.news2Score = news2Result.score;
    vitalsData.news2RiskLevel = news2Result.riskLevel;

    console.log('📊 [VITALS] NEWS2 calculated:', news2Result);
    console.log('📊 [VITALS] Appointment ID:', appointment._id);

    // Create new vital record (no updates)
    const vitalRecord = await VitalSigns.create(vitalsData);
    console.log('📊 [VITALS] Vital record created:', vitalRecord._id);

    // Update appointment risk score with NEWS2 points and log to history
    try {
        console.log('📊 [VITALS] Calling riskScoreService.updateRiskScore...');
        const updatedAppointment = await riskScoreService.updateRiskScore(
            appointment._id,
            'VITALS',
            { news2Points: news2Result.score },
            req.user.id
        );
        console.log('📊 [VITALS] Risk score updated successfully. Final score:', updatedAppointment.finalRiskScore);
    } catch (riskErr) {
        console.error('❌ [VITALS] Error updating risk score:', riskErr);
    }

    res.status(200).json({
        success: true,
        data: vitalRecord,
    });
});

/**
 * @desc    Get vitals for OPD appointment
 * @route   GET /api/opd/appointments/:id/vitals
 */
exports.getVitals = asyncHandler(async (req, res, next) => {
    const vitals = await VitalSigns.findOne({ appointment: req.params.id })
        .populate('recordedBy', 'profile.firstName profile.lastName');

    if (!vitals) {
        return res.status(200).json({
            success: true,
            data: null,
            message: 'No vitals recorded for this appointment',
        });
    }

    res.status(200).json({
        success: true,
        data: vitals,
    });
});

/**
 * @desc    Set lab risk level for OPD appointment (Doctor only)
 * @route   PUT /api/opd/appointments/:id/lab-risk
 */
exports.setLabRiskLevel = asyncHandler(async (req, res, next) => {
    const { riskLevel } = req.body;

    const validLevels = ['NORMAL', 'MILD', 'MODERATE', 'SEVERE', 'CRITICAL'];
    if (!validLevels.includes(riskLevel)) {
        return next(new ErrorResponse('Invalid risk level', 400));
    }

    const appointment = await riskScoreService.updateRiskScore(
        req.params.id,
        'LAB_RISK',
        { riskLevel },
        req.user.id
    );

    res.status(200).json({
        success: true,
        data: {
            labRiskLevel: appointment.labRiskLevel,
            labDelta: appointment.labDelta,
            finalRiskScore: appointment.finalRiskScore,
            riskCategory: appointment.riskCategory,
        },
    });
});

/**
 * @desc    Set radiology risk level for OPD appointment (Doctor only)
 * @route   PUT /api/opd/appointments/:id/radiology-risk
 */
exports.setRadiologyRiskLevel = asyncHandler(async (req, res, next) => {
    const { riskLevel } = req.body;

    const validLevels = ['NORMAL', 'MILD', 'MODERATE', 'SEVERE', 'CRITICAL'];
    if (!validLevels.includes(riskLevel)) {
        return next(new ErrorResponse('Invalid risk level', 400));
    }

    const appointment = await riskScoreService.updateRiskScore(
        req.params.id,
        'RADIOLOGY_RISK',
        { riskLevel },
        req.user.id
    );

    res.status(200).json({
        success: true,
        data: {
            radiologyRiskLevel: appointment.radiologyRiskLevel,
            radiologyDelta: appointment.radiologyDelta,
            finalRiskScore: appointment.finalRiskScore,
            riskCategory: appointment.riskCategory,
        },
    });
});

/**
 * @desc    Get risk score history for OPD appointment (Doctor only)
 * @route   GET /api/opd/appointments/:id/risk-history
 */
exports.getRiskHistory = asyncHandler(async (req, res, next) => {
    console.log('🔍 [OPD CONTROLLER] getRiskHistory calling for ID:', req.params.id);

    // Debug: Check if any history exists at all for this ID
    const rawCount = await mongoose.model('RiskScoreHistory').countDocuments({ encounter: req.params.id });
    console.log('🔍 [OPD CONTROLLER] Raw count of history documents:', rawCount);

    const history = await riskScoreService.getRiskScoreHistory(req.params.id);
    console.log('🔍 [OPD CONTROLLER] Service returned items:', history.length);

    res.status(200).json({
        success: true,
        count: history.length,
        data: history,
    });
});

/**
 * @desc    Get risk score history for Patient (all encounters)
 * @route   GET /api/opd/patients/:id/risk-history
 */
exports.getPatientRiskHistory = asyncHandler(async (req, res, next) => {
    console.log('🔍 [OPD CONTROLLER] getPatientRiskHistory calling for Patient ID:', req.params.id);
    const history = await riskScoreService.getPatientRiskHistory(req.params.id);
    console.log('🔍 [OPD CONTROLLER] Found patient history items:', history.length);

    res.status(200).json({
        success: true,
        count: history.length,
        data: history,
    });
});

/**
 * @desc    Get current risk score for OPD appointment (Doctor only)
 * @route   GET /api/opd/appointments/:id/risk-score
 */
exports.getRiskScore = asyncHandler(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id)
        .select('news2Points labRiskLevel radiologyRiskLevel labDelta radiologyDelta finalRiskScore riskCategory');

    if (!appointment) {
        return next(new ErrorResponse('Appointment not found', 404));
    }

    res.status(200).json({
        success: true,
        data: appointment,
    });
});
