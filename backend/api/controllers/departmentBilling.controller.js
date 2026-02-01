const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const departmentBillingService = require('../services/departmentBilling.service');

/**
 * @desc    Generate department bill for laboratory orders
 * @route   POST /api/v1/department-billing/lab/generate
 * @access  Lab Tech, Admin
 */
exports.generateLabBill = asyncHandler(async (req, res, next) => {
    const { orderIds, encounterId, encounterModel, patientId } = req.body;

    if (!orderIds || !orderIds.length) {
        return next(new ErrorResponse('Order IDs are required', 400));
    }

    const bill = await departmentBillingService.generateLabBill(
        orderIds,
        req.user.id,
        encounterId,
        encounterModel,
        patientId
    );

    res.status(201).json({
        success: true,
        message: 'Laboratory bill generated successfully',
        data: bill,
    });
});

/**
 * @desc    Generate department bill for radiology orders
 * @route   POST /api/v1/department-billing/radiology/generate
 * @access  Radiologist, Admin
 */
exports.generateRadiologyBill = asyncHandler(async (req, res, next) => {
    const { orderIds, encounterId, encounterModel, patientId } = req.body;

    if (!orderIds || !orderIds.length) {
        return next(new ErrorResponse('Order IDs are required', 400));
    }

    const bill = await departmentBillingService.generateRadiologyBill(
        orderIds,
        req.user.id,
        encounterId,
        encounterModel,
        patientId
    );

    res.status(201).json({
        success: true,
        message: 'Radiology bill generated successfully',
        data: bill,
    });
});

/**
 * @desc    Generate department bill for pharmacy dispenses
 * @route   POST /api/v1/department-billing/pharmacy/generate
 * @access  Pharmacist, Admin
 */
exports.generatePharmacyBill = asyncHandler(async (req, res, next) => {
    const { dispenseIds, encounterId, encounterModel, patientId } = req.body;

    if (!dispenseIds || !dispenseIds.length) {
        return next(new ErrorResponse('Dispense IDs are required', 400));
    }

    const bill = await departmentBillingService.generatePharmacyBill(
        dispenseIds,
        req.user.id,
        encounterId,
        encounterModel,
        patientId
    );

    res.status(201).json({
        success: true,
        message: 'Pharmacy bill generated successfully',
        data: bill,
    });
});

/**
 * @desc    Record payment on department bill
 * @route   POST /api/v1/department-billing/:id/pay
 * @access  Department Staff, Billing, Admin
 */
exports.recordPayment = asyncHandler(async (req, res, next) => {
    const { amount, mode, reference } = req.body;

    if (!amount || amount <= 0) {
        return next(new ErrorResponse('Valid payment amount is required', 400));
    }

    if (!mode) {
        return next(new ErrorResponse('Payment mode is required', 400));
    }

    const bill = await departmentBillingService.recordPayment(
        req.params.id,
        { amount, mode, reference },
        req.user.id
    );

    res.status(200).json({
        success: true,
        message: 'Payment recorded successfully',
        data: bill,
    });
});

/**
 * @desc    Get department bill by ID
 * @route   GET /api/v1/department-billing/:id
 * @access  Authenticated
 */
exports.getDepartmentBill = asyncHandler(async (req, res, next) => {
    const bill = await departmentBillingService.getDepartmentBill(req.params.id);

    if (!bill) {
        return next(new ErrorResponse('Bill not found', 404));
    }

    res.status(200).json({
        success: true,
        data: bill,
    });
});

/**
 * @desc    Get department bills for an encounter
 * @route   GET /api/v1/department-billing/encounter/:encounterId
 * @access  Authenticated
 */
exports.getDepartmentBillsForEncounter = asyncHandler(async (req, res, next) => {
    const bills = await departmentBillingService.getDepartmentBillsForEncounter(req.params.encounterId);

    res.status(200).json({
        success: true,
        count: bills.length,
        data: bills,
    });
});

/**
 * @desc    Get unbilled orders for a department
 * @route   GET /api/v1/department-billing/:department/unbilled
 * @access  Department Staff
 */
exports.getUnbilledOrders = asyncHandler(async (req, res, next) => {
    const { department } = req.params;
    const { patientId, encounterId } = req.query;

    const validDepartments = ['laboratory', 'radiology', 'pharmacy'];
    if (!validDepartments.includes(department)) {
        return next(new ErrorResponse('Invalid department', 400));
    }

    const orders = await departmentBillingService.getUnbilledOrders(
        department,
        patientId || null,
        encounterId || null
    );

    console.log(`[DEBUG] getUnbilledOrders for ${department}: found ${orders.length} orders`);

    res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
    });
});

/**
 * @desc    Get central billing view for an encounter
 * @route   GET /api/v1/department-billing/central/:encounterId
 * @access  Billing, Admin
 */
exports.getCentralBillingView = asyncHandler(async (req, res, next) => {
    const view = await departmentBillingService.getCentralBillingView(req.params.encounterId);

    res.status(200).json({
        success: true,
        data: view,
    });
});

/**
 * @desc    Get all department bills for a patient
 * @route   GET /api/v1/department-billing/patient/:patientId
 * @access  Authenticated
 */
exports.getPatientDepartmentBills = asyncHandler(async (req, res, next) => {
    const bills = await departmentBillingService.getPatientDepartmentBills(req.params.patientId);

    res.status(200).json({
        success: true,
        count: bills.length,
        data: bills,
    });
});

/**
 * @desc    Get department billing dashboard stats
 * @route   GET /api/v1/department-billing/dashboard/:department
 * @access  Department Staff
 */
exports.getDepartmentDashboard = asyncHandler(async (req, res, next) => {
    const { department } = req.params;

    const DepartmentBill = require('../models/DepartmentBill');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayStats, pendingBills, totalToday] = await Promise.all([
        DepartmentBill.aggregate([
            { $match: { department, billDate: { $gte: today } } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$grandTotal' },
                    totalCollected: { $sum: '$paidAmount' },
                }
            }
        ]),
        DepartmentBill.countDocuments({ department, paymentStatus: 'pending' }),
        DepartmentBill.countDocuments({ department, billDate: { $gte: today } }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            todayBills: totalToday,
            todayAmount: todayStats[0]?.totalAmount || 0,
            todayCollected: todayStats[0]?.totalCollected || 0,
            pendingBills,
        },
    });
});

/**
 * @desc    Get all department bills with filters
 * @route   GET /api/v1/department-billing
 * @access  Billing, Admin
 */
exports.getAllDepartmentBills = asyncHandler(async (req, res, next) => {
    const { department, paymentStatus, page = 1, limit = 20 } = req.query;

    const DepartmentBill = require('../models/DepartmentBill');

    const query = {};
    if (department) query.department = department;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const skip = (page - 1) * limit;

    const [bills, total] = await Promise.all([
        DepartmentBill.find(query)
            .populate('patient', 'firstName lastName patientId')
            .populate('generatedBy', 'profile.firstName profile.lastName')
            .sort({ billDate: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        DepartmentBill.countDocuments(query),
    ]);

    res.status(200).json({
        success: true,
        count: bills.length,
        total,
        page: parseInt(page),
        data: bills,
    });
});
