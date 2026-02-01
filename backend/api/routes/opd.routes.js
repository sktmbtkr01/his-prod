const express = require('express');
const router = express.Router();
const opdController = require('../controllers/opd.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

/**
 * @route   POST /api/opd/appointments
 * @desc    Create a new appointment
 */
router.post('/appointments', authorize('receptionist', 'admin', 'doctor'), opdController.createAppointment);

/**
 * @route   GET /api/opd/appointments
 * @desc    Get all appointments with filters
 */
router.get('/appointments', opdController.getAllAppointments);

/**
 * @route   GET /api/opd/appointments/:id
 * @desc    Get appointment by ID
 */
router.get('/appointments/:id', opdController.getAppointmentById);

/**
 * @route   PUT /api/opd/appointments/:id
 * @desc    Update appointment
 */
router.put('/appointments/:id', authorize('receptionist', 'admin', 'doctor'), opdController.updateAppointment);

/**
 * @route   DELETE /api/opd/appointments/:id
 * @desc    Cancel appointment
 */
router.delete('/appointments/:id', authorize('receptionist', 'admin'), opdController.cancelAppointment);

/**
 * @route   PUT /api/opd/appointments/:id/checkin
 * @desc    Check-in patient for appointment
 */
router.put('/appointments/:id/checkin', authorize('receptionist', 'nurse'), opdController.checkInPatient);

/**
 * @route   GET /api/opd/queue
 * @desc    Get current OPD queue
 */
router.get('/queue', opdController.getOPDQueue);

/**
 * @route   GET /api/opd/dashboard
 * @desc    Get OPD dashboard stats
 */
router.get('/dashboard', opdController.getDashboard);

/**
 * @route   POST /api/opd/appointments/:id/vitals
 * @desc    Record vitals for OPD appointment (Nurse only)
 */
router.post('/appointments/:id/vitals', authorize('nurse', 'head_nurse'), opdController.recordVitals);

/**
 * @route   GET /api/opd/appointments/:id/vitals
 * @desc    Get vitals for OPD appointment
 */
router.get('/appointments/:id/vitals', opdController.getVitals);

/**
 * @route   PUT /api/opd/appointments/:id/lab-risk
 * @desc    Set lab risk level (Doctor only)
 */
router.put('/appointments/:id/lab-risk', authorize('doctor'), opdController.setLabRiskLevel);

/**
 * @route   PUT /api/opd/appointments/:id/radiology-risk
 * @desc    Set radiology risk level (Doctor only)
 */
router.put('/appointments/:id/radiology-risk', authorize('doctor'), opdController.setRadiologyRiskLevel);

/**
 * @route   GET /api/opd/appointments/:id/risk-score
 * @desc    Get current risk score (Doctor only)
 */
router.get('/appointments/:id/risk-score', authorize('doctor'), opdController.getRiskScore);

/**
 * @route   GET /api/opd/appointments/:id/risk-history
 * @desc    Get risk score history (Doctor only)
 */
router.get('/appointments/:id/risk-history', authorize('doctor'), opdController.getRiskHistory);

/**
 * @route   GET /api/opd/patients/:id/risk-history
 * @desc    Get risk score history for Patient (all encounters)
 */
router.get('/patients/:id/risk-history', authorize('doctor'), opdController.getPatientRiskHistory);

module.exports = router;
