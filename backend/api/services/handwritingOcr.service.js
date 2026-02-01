/**
 * Handwriting OCR Service
 * Converts handwritten canvas input to structured clinical text
 * Uses Tesseract.js for offline OCR processing
 * 
 * Design Principle: Extractive, NOT interpretive
 * We only transcribe what is written - never infer or add diagnoses
 */

const Tesseract = require('tesseract.js');
const AuditLog = require('../models/AuditLog');

class HandwritingOcrService {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
    }

    /**
     * Initialize Tesseract worker (lazy initialization)
     */
    async initWorker() {
        if (this.isInitialized && this.worker) {
            return;
        }

        try {
            this.worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        // Progress logging - can be used for real-time feedback
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            this.isInitialized = true;
            console.log('Tesseract OCR worker initialized');
        } catch (error) {
            console.error('Failed to initialize Tesseract worker:', error);
            throw new Error('OCR service initialization failed');
        }
    }

    /**
     * Convert handwriting image to text
     * @param {string} imageData - Base64 encoded image from canvas
     * @param {string} section - 'symptoms' or 'diagnosis' or 'combined'
     * @param {string} userId - User ID for audit logging
     * @returns {Object} { text: string, confidence: number, section: string }
     */
    async convertHandwriting(imageData, section = 'combined', userId = null) {
        await this.initWorker();

        const startTime = Date.now();

        try {
            // Validate input
            if (!imageData) {
                throw new Error('No image data provided');
            }

            // Clean base64 data
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');

            // Perform OCR
            const { data } = await this.worker.recognize(imageBuffer);

            const processingTime = Date.now() - startTime;

            // Structure the result
            const result = {
                text: this.cleanText(data.text),
                confidence: Math.round(data.confidence),
                section: section,
                processingTimeMs: processingTime,
                warnings: []
            };

            // Add warnings for low confidence
            if (data.confidence < 50) {
                result.warnings.push('Some handwriting could not be confidently read. Please review carefully.');
            }

            if (data.confidence < 30) {
                result.warnings.push('Low confidence transcription. Consider rewriting or typing instead.');
            }

            // Log for audit
            if (userId) {
                await this.logConversionAttempt(userId, section, result.confidence, processingTime);
            }

            return result;

        } catch (error) {
            console.error('OCR conversion error:', error);

            // Log failed attempt
            if (userId) {
                await this.logConversionAttempt(userId, section, 0, Date.now() - startTime, error.message);
            }

            throw new Error(`Handwriting conversion failed: ${error.message}`);
        }
    }

    /**
     * Convert combined canvas with separate sections
     * @param {Object} canvasData - { symptoms: base64, diagnosis: base64 }
     * @param {string} userId - User ID for audit
     * @returns {Object} { symptoms: { text, confidence }, diagnosis: { text, confidence } }
     */
    async convertSectionedHandwriting(canvasData, userId = null) {
        const results = {
            symptoms: { text: '', confidence: 0, warnings: [] },
            diagnosis: { text: '', confidence: 0, warnings: [] }
        };

        const promises = [];

        if (canvasData.symptoms) {
            promises.push(
                this.convertHandwriting(canvasData.symptoms, 'symptoms', userId)
                    .then(r => { results.symptoms = r; })
                    .catch(e => { results.symptoms.warnings.push(e.message); })
            );
        }

        if (canvasData.diagnosis) {
            promises.push(
                this.convertHandwriting(canvasData.diagnosis, 'diagnosis', userId)
                    .then(r => { results.diagnosis = r; })
                    .catch(e => { results.diagnosis.warnings.push(e.message); })
            );
        }

        await Promise.all(promises);

        return results;
    }

    /**
     * Clean and format OCR text
     * @param {string} rawText - Raw OCR output
     * @returns {string} Cleaned text
     */
    cleanText(rawText) {
        if (!rawText) return '';

        return rawText
            .trim()
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .replace(/[^\w\s.,;:()-]/g, '') // Remove unusual characters
            .replace(/\s+([.,;:])/g, '$1') // Fix spacing before punctuation
            .trim();
    }

    /**
     * Log conversion attempt for audit trail
     */
    async logConversionAttempt(userId, section, confidence, processingTime, error = null) {
        try {
            await AuditLog.create({
                user: userId,
                action: 'HANDWRITING_OCR_CONVERSION',
                resource: 'ClinicalNotes',
                details: {
                    section,
                    confidence,
                    processingTimeMs: processingTime,
                    success: !error,
                    error: error || null
                },
                ipAddress: 'system',
                userAgent: 'HandwritingOcrService'
            });
        } catch (logError) {
            console.error('Failed to log OCR audit:', logError);
            // Don't throw - audit logging failure shouldn't break the feature
        }
    }

    /**
     * Terminate worker to free resources
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
        }
    }
}

// Export singleton instance
module.exports = new HandwritingOcrService();
