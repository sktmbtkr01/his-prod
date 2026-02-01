const Radiology = require('../models/Radiology');
const RadiologyMaster = require('../models/RadiologyMaster');
const { RADIOLOGY_STATUS } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const path = require('path');
const fs = require('fs');

/**
 * @desc    Create radiology order
 * @route   POST /api/radiology/orders
 */
exports.createRadiologyOrder = asyncHandler(async (req, res, next) => {
    req.body.orderedBy = req.user.id;

    const order = await Radiology.create(req.body);
    await order.populate(['patient', 'orderedBy', 'test']);

    res.status(201).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Get all radiology orders
 * @route   GET /api/radiology/orders
 */
exports.getAllRadiologyOrders = asyncHandler(async (req, res, next) => {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const orders = await Radiology.find(query)
        .populate('patient', 'patientId firstName lastName')
        .populate('orderedBy', 'profile.firstName profile.lastName')
        .populate('test', 'testName modality')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await Radiology.countDocuments(query);

    res.status(200).json({
        success: true,
        count: orders.length,
        total,
        page: parseInt(page),
        data: orders,
    });
});

/**
 * @desc    Get radiology order by ID
 * @route   GET /api/radiology/orders/:id
 */
exports.getRadiologyOrderById = asyncHandler(async (req, res, next) => {
    const order = await Radiology.findById(req.params.id)
        .populate('patient')
        .populate('orderedBy', 'profile')
        .populate('test')
        .populate('performedBy', 'profile');

    if (!order) {
        return next(new ErrorResponse('Radiology order not found', 404));
    }

    res.status(200).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Update radiology order
 * @route   PUT /api/radiology/orders/:id
 */
exports.updateRadiologyOrder = asyncHandler(async (req, res, next) => {
    const order = await Radiology.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!order) {
        return next(new ErrorResponse('Radiology order not found', 404));
    }

    res.status(200).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Schedule radiology test
 * @route   POST /api/radiology/orders/:id/schedule
 */
exports.scheduleTest = asyncHandler(async (req, res, next) => {
    const order = await Radiology.findById(req.params.id);

    if (!order) {
        return next(new ErrorResponse('Radiology order not found', 404));
    }

    order.scheduledAt = req.body.scheduledAt;
    order.status = RADIOLOGY_STATUS.SCHEDULED;
    await order.save();

    res.status(200).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Enter radiology report
 * @route   POST /api/radiology/orders/:id/enter-report
 */
exports.enterReport = asyncHandler(async (req, res, next) => {
    const order = await Radiology.findById(req.params.id);

    if (!order) {
        return next(new ErrorResponse('Radiology order not found', 404));
    }

    // Common fields
    order.findings = req.body.findings;
    order.impression = req.body.impression;
    order.recommendations = req.body.recommendations;
    order.images = req.body.images || [];

    // Scan image upload
    if (req.body.scanImage) {
        order.scanImage = req.body.scanImage;
    }

    // X-Ray specific fields
    if (req.body.xrayViewType) order.xrayViewType = req.body.xrayViewType;
    if (req.body.xrayBodyPartConfirmation) order.xrayBodyPartConfirmation = req.body.xrayBodyPartConfirmation;

    // Ultrasound specific fields
    if (req.body.ultrasoundPreparation) order.ultrasoundPreparation = req.body.ultrasoundPreparation;
    if (req.body.ultrasoundIndication) order.ultrasoundIndication = req.body.ultrasoundIndication;
    if (req.body.gestationalAge) order.gestationalAge = req.body.gestationalAge;

    // CT Scan specific fields
    if (req.body.contrastUsed !== undefined) order.contrastUsed = req.body.contrastUsed;
    if (req.body.contrastType) order.contrastType = req.body.contrastType;
    if (req.body.contrastDose) order.contrastDose = req.body.contrastDose;
    if (req.body.allergyHistory !== undefined) order.allergyHistory = req.body.allergyHistory;

    // MRI specific fields
    if (req.body.metalImplantCheck !== undefined) order.metalImplantCheck = req.body.metalImplantCheck;
    if (req.body.claustrophobia !== undefined) order.claustrophobia = req.body.claustrophobia;
    if (req.body.sedationRequired !== undefined) order.sedationRequired = req.body.sedationRequired;

    // ECG/Echo specific fields
    if (req.body.measurementNotes) order.measurementNotes = req.body.measurementNotes;
    if (req.body.reportSummary) order.reportSummary = req.body.reportSummary;

    order.status = RADIOLOGY_STATUS.COMPLETED;
    order.performedBy = req.user.id;
    order.completedAt = new Date();
    await order.save();

    res.status(200).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Get radiology queue
 * @route   GET /api/radiology/queue
 */
exports.getRadiologyQueue = asyncHandler(async (req, res, next) => {
    const queue = await Radiology.find({
        status: { $in: [RADIOLOGY_STATUS.ORDERED, RADIOLOGY_STATUS.SCHEDULED, RADIOLOGY_STATUS.IN_PROGRESS] },
    })
        .populate('patient', 'patientId firstName lastName')
        .populate('test', 'testName modality')
        .sort({ scheduledAt: 1, createdAt: 1 });

    res.status(200).json({
        success: true,
        count: queue.length,
        data: queue,
    });
});

/**
 * @desc    Get radiology dashboard
 * @route   GET /api/radiology/dashboard
 */
exports.getDashboard = asyncHandler(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, completed, modalityBreakdown] = await Promise.all([
        Radiology.countDocuments({ status: { $in: [RADIOLOGY_STATUS.ORDERED, RADIOLOGY_STATUS.SCHEDULED] } }),
        Radiology.countDocuments({ completedAt: { $gte: today } }),
        Radiology.aggregate([
            { $lookup: { from: 'radiologymasters', localField: 'test', foreignField: '_id', as: 'testInfo' } },
            { $unwind: '$testInfo' },
            { $group: { _id: '$testInfo.modality', count: { $sum: 1 } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            pending,
            completedToday: completed,
            modalityBreakdown: modalityBreakdown.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
        },
    });
});

/**
 * @desc    Get available radiology tests
 * @route   GET /api/radiology/tests
 */
exports.getRadiologyTests = asyncHandler(async (req, res, next) => {
    const tests = await RadiologyMaster.find({ isActive: true }).sort({ testName: 1 });

    res.status(200).json({
        success: true,
        count: tests.length,
        data: tests,
    });
});

/**
 * @desc    Upload scan image for radiology order
 * @route   POST /api/radiology/upload-scan/:id
 */
exports.uploadScanImage = asyncHandler(async (req, res, next) => {
    const order = await Radiology.findById(req.params.id);

    if (!order) {
        return next(new ErrorResponse('Radiology order not found', 404));
    }

    if (!req.file) {
        return next(new ErrorResponse('Please upload a file', 400));
    }

    // Store relative path
    const scanImagePath = `uploads/radiology-scans/${req.file.filename}`;
    order.scanImage = scanImagePath;
    await order.save();

    res.status(200).json({
        success: true,
        data: {
            scanImage: scanImagePath,
        },
    });
});

/**
 * @desc    Get completed radiology results (Doctor only)
 * @route   GET /api/radiology/doctor/results
 */
exports.getCompletedResults = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const results = await Radiology.find({ status: RADIOLOGY_STATUS.COMPLETED })
        .populate('patient', 'patientId firstName lastName')
        .populate('test', 'testName modality testCode')
        .populate('performedBy', 'profile.firstName profile.lastName')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ completedAt: -1 });

    const total = await Radiology.countDocuments({ status: RADIOLOGY_STATUS.COMPLETED });

    res.status(200).json({
        success: true,
        count: results.length,
        total,
        page: parseInt(page),
        data: results,
    });
});

/**
 * @desc    Get single radiology result by ID (Doctor only)
 * @route   GET /api/radiology/doctor/results/:id
 */
exports.getResultById = asyncHandler(async (req, res, next) => {
    const result = await Radiology.findById(req.params.id)
        .populate('patient', 'patientId firstName lastName age gender bloodGroup')
        .populate('test', 'testName modality testCode bodyPart')
        .populate('orderedBy', 'profile.firstName profile.lastName')
        .populate('performedBy', 'profile.firstName profile.lastName');

    if (!result) {
        return next(new ErrorResponse('Radiology result not found', 404));
    }

    res.status(200).json({
        success: true,
        data: result,
    });
});
