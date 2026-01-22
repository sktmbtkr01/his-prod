const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/patients
 * @desc    Register a new patient
 */
/**
 * @route   POST /api/patients
 * @desc    Register a new patient
 */
router.post('/', authorize('receptionist', 'admin', 'doctor', 'nurse', 'head_nurse'), patientController.createPatient);

/**
 * @route   GET /api/patients
 * @desc    Get all patients with pagination
 */
router.get('/', patientController.getAllPatients);

/**
 * @route   GET /api/patients/search
 * @desc    Search patients by name, phone, or ID
 */
router.get('/search', patientController.searchPatients);

/**
 * @route   GET /api/patients/:id
 * @desc    Get patient by ID
 */
router.get('/:id', patientController.getPatientById);

/**
 * @route   PUT /api/patients/:id
 * @desc    Update patient details
 */
router.put('/:id', authorize('receptionist', 'admin', 'doctor', 'nurse', 'head_nurse'), patientController.updatePatient);

/**
 * @route   DELETE /api/patients/:id
 * @desc    Delete patient (soft delete)
 */
router.delete('/:id', authorize('admin'), patientController.deletePatient);

/**
 * @route   GET /api/patients/:id/history
 * @desc    Get patient visit history
 */
router.get('/:id/history', patientController.getPatientHistory);

/**
 * @route   GET /api/patients/:id/emr
 * @desc    Get patient EMR records
 */
router.get('/:id/emr', patientController.getPatientEMR);

module.exports = router;
