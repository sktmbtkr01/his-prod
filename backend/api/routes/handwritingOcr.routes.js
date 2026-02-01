/**
 * Handwriting OCR Routes
 * API endpoints for handwriting-to-text conversion
 */

const express = require('express');
const router = express.Router();
const handwritingOcrController = require('../controllers/handwritingOcr.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Health check (any authenticated user)
router.get('/health', handwritingOcrController.healthCheck);

// Handwriting conversion (doctors only)
router.post(
    '/handwriting',
    authorize('doctor', 'admin'),
    handwritingOcrController.convertHandwriting
);

// Sectioned handwriting conversion (symptoms + diagnosis)
router.post(
    '/handwriting/sectioned',
    authorize('doctor', 'admin'),
    handwritingOcrController.convertSectionedHandwriting
);

module.exports = router;
