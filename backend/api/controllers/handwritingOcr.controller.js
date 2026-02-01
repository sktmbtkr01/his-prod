/**
 * Handwriting OCR Controller
 * Handles API requests for handwriting-to-text conversion
 */

const handwritingOcrService = require('../services/handwritingOcr.service');

/**
 * Convert a single canvas section to text
 * POST /api/v1/ocr/handwriting
 */
exports.convertHandwriting = async (req, res) => {
    try {
        const { imageData, section = 'combined' } = req.body;
        const userId = req.user?._id;

        if (!imageData) {
            return res.status(400).json({
                success: false,
                error: 'No image data provided. Please draw something on the canvas.'
            });
        }

        const result = await handwritingOcrService.convertHandwriting(imageData, section, userId);

        res.json({
            success: true,
            data: result,
            message: result.warnings.length > 0
                ? 'Conversion completed with warnings'
                : 'Handwriting converted successfully'
        });

    } catch (error) {
        console.error('Handwriting conversion error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to convert handwriting',
            suggestion: 'Please try rewriting more clearly or use the typing mode.'
        });
    }
};

/**
 * Convert sectioned canvas (symptoms + diagnosis) to text
 * POST /api/v1/ocr/handwriting/sectioned
 */
exports.convertSectionedHandwriting = async (req, res) => {
    try {
        const { symptoms, diagnosis } = req.body;
        const userId = req.user?._id;

        if (!symptoms && !diagnosis) {
            return res.status(400).json({
                success: false,
                error: 'No canvas data provided. Please draw in at least one section.'
            });
        }

        const result = await handwritingOcrService.convertSectionedHandwriting(
            { symptoms, diagnosis },
            userId
        );

        // Check for overall warnings
        const allWarnings = [
            ...result.symptoms.warnings,
            ...result.diagnosis.warnings
        ];

        res.json({
            success: true,
            data: result,
            message: allWarnings.length > 0
                ? 'Conversion completed with some warnings. Please review carefully.'
                : 'Handwriting converted successfully',
            disclaimer: 'AI-assisted transcription. Please review and edit as needed before saving.'
        });

    } catch (error) {
        console.error('Sectioned handwriting conversion error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to convert handwriting',
            suggestion: 'Please try rewriting more clearly or use the typing mode.'
        });
    }
};

/**
 * Health check for OCR service
 * GET /api/v1/ocr/health
 */
exports.healthCheck = async (req, res) => {
    try {
        res.json({
            success: true,
            service: 'HandwritingOCR',
            status: 'operational',
            engine: 'Tesseract.js'
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            service: 'HandwritingOCR',
            status: 'degraded',
            error: error.message
        });
    }
};
