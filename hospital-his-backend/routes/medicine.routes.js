/**
 * Medicine Routes
 * API endpoints for medicine master data
 */

const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

// Apply authentication to all routes
router.use(authenticate);

/**
 * Search medicines by prefix (autocomplete)
 * GET /api/v1/medicines/search?q=para
 */
router.get('/search', asyncHandler(async (req, res) => {
    const { q = '', limit = 15 } = req.query;

    const medicines = await Medicine.searchByPrefix(q.trim(), parseInt(limit));

    res.json({
        success: true,
        count: medicines.length,
        data: medicines
    });
}));

/**
 * Get all active medicines (paginated)
 * GET /api/v1/medicines
 */
router.get('/', asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, category } = req.query;

    const query = { isActive: true };
    if (category) query.category = category;

    const medicines = await Medicine.find(query)
        .select('name category strength form')
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Medicine.countDocuments(query);

    res.json({
        success: true,
        count: medicines.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: medicines
    });
}));

/**
 * Get medicine by ID
 * GET /api/v1/medicines/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
        return res.status(404).json({
            success: false,
            error: 'Medicine not found'
        });
    }

    res.json({
        success: true,
        data: medicine
    });
}));

/**
 * Get all medicine categories
 * GET /api/v1/medicines/meta/categories
 */
router.get('/meta/categories', asyncHandler(async (req, res) => {
    const categories = await Medicine.distinct('category', { isActive: true });

    res.json({
        success: true,
        data: categories.sort()
    });
}));

module.exports = router;
