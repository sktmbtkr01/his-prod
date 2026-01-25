const express = require('express');
const router = express.Router();
const radiologyController = require('../controllers/radiology.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for scan image uploads
const scanStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/radiology-scans';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, `scan-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
    }
});

const uploadScan = multer({
    storage: scanStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|dcm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/dicom';
        if (extname || mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image, PDF, and DICOM files are allowed'));
    }
});

router.use(authenticate);

/**
 * @route   POST /api/radiology/orders
 * @desc    Create a new radiology order
 */
router.post('/orders', authorize('doctor'), radiologyController.createRadiologyOrder);

/**
 * @route   GET /api/radiology/orders
 * @desc    Get all radiology orders
 */
router.get('/orders', radiologyController.getAllRadiologyOrders);

/**
 * @route   GET /api/radiology/orders/:id
 * @desc    Get radiology order by ID
 */
router.get('/orders/:id', radiologyController.getRadiologyOrderById);

/**
 * @route   PUT /api/radiology/orders/:id
 * @desc    Update radiology order
 */
router.put('/orders/:id', authorize('radiologist', 'doctor'), radiologyController.updateRadiologyOrder);

/**
 * @route   POST /api/radiology/orders/:id/schedule
 * @desc    Schedule radiology test
 */
router.post('/orders/:id/schedule', authorize('radiologist', 'receptionist'), radiologyController.scheduleTest);

/**
 * @route   POST /api/radiology/orders/:id/enter-report
 * @desc    Enter radiology report
 */
router.post('/orders/:id/enter-report', authorize('radiologist'), radiologyController.enterReport);

/**
 * @route   POST /api/radiology/upload-scan/:id
 * @desc    Upload scan image for radiology order
 */
router.post('/upload-scan/:id', authorize('radiologist'), uploadScan.single('scanImage'), radiologyController.uploadScanImage);

/**
 * @route   GET /api/radiology/queue
 * @desc    Get radiology work queue
 */
router.get('/queue', authorize('radiologist', 'admin', 'doctor'), radiologyController.getRadiologyQueue);

/**
 * @route   GET /api/radiology/dashboard
 * @desc    Get radiology dashboard stats
 */
router.get('/dashboard', authorize('radiologist', 'admin', 'doctor'), radiologyController.getDashboard);

/**
 * @route   GET /api/radiology/tests
 * @desc    Get available radiology tests (master)
 */
router.get('/tests', radiologyController.getRadiologyTests);

/**
 * @route   GET /api/radiology/doctor/results
 * @desc    Get completed radiology results (Doctor only)
 */
router.get('/doctor/results', authorize('doctor'), radiologyController.getCompletedResults);

/**
 * @route   GET /api/radiology/doctor/results/:id
 * @desc    Get single radiology result by ID (Doctor only)
 */
router.get('/doctor/results/:id', authorize('doctor'), radiologyController.getResultById);

module.exports = router;
