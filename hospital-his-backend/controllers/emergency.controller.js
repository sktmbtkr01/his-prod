const Emergency = require('../models/Emergency');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Create emergency case
 * @route   POST /api/emergency/cases
 */
exports.createEmergencyCase = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user.id;

    const emergencyCase = await Emergency.create(req.body);
    await emergencyCase.populate(['patient', 'assignedDoctor', 'assignedNurse']);

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
        io.to('emergency-room').emit('emergency:new', {
            data: emergencyCase,
        });
    }

    res.status(201).json({
        success: true,
        data: emergencyCase,
    });
});

/**
 * @desc    Get all emergency cases
 * @route   GET /api/emergency/cases
 */
exports.getAllEmergencyCases = asyncHandler(async (req, res, next) => {
    const { status, triageLevel, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (triageLevel) query.triageLevel = triageLevel;

    const skip = (page - 1) * limit;

    const cases = await Emergency.find(query)
        .populate('patient', 'patientId firstName lastName phone')
        .populate('assignedDoctor', 'profile.firstName profile.lastName')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ arrivalTime: -1 });

    const total = await Emergency.countDocuments(query);

    res.status(200).json({
        success: true,
        count: cases.length,
        total,
        page: parseInt(page),
        data: cases,
    });
});

/**
 * @desc    Get emergency case by ID
 * @route   GET /api/emergency/cases/:id
 */
exports.getEmergencyCaseById = asyncHandler(async (req, res, next) => {
    const emergencyCase = await Emergency.findById(req.params.id)
        .populate('patient')
        .populate('assignedDoctor', 'profile')
        .populate('assignedNurse', 'profile');

    if (!emergencyCase) {
        return next(new ErrorResponse('Emergency case not found', 404));
    }

    res.status(200).json({
        success: true,
        data: emergencyCase,
    });
});

/**
 * @desc    Update emergency case
 * @route   PUT /api/emergency/cases/:id
 */
exports.updateEmergencyCase = asyncHandler(async (req, res, next) => {
    const emergencyCase = await Emergency.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    }).populate(['patient', 'assignedDoctor', 'assignedNurse']);

    if (!emergencyCase) {
        return next(new ErrorResponse('Emergency case not found', 404));
    }

    res.status(200).json({
        success: true,
        data: emergencyCase,
    });
});

/**
 * @desc    Get emergency queue sorted by triage
 * @route   GET /api/emergency/queue
 */
exports.getEmergencyQueue = asyncHandler(async (req, res, next) => {
    const activeStatuses = [
        Emergency.EMERGENCY_STATUS.REGISTERED,
        Emergency.EMERGENCY_STATUS.TRIAGE,
        Emergency.EMERGENCY_STATUS.IN_TREATMENT,
        Emergency.EMERGENCY_STATUS.OBSERVATION,
    ];

    const triagePriority = {
        [Emergency.TRIAGE_LEVELS.CRITICAL]: 1,
        [Emergency.TRIAGE_LEVELS.URGENT]: 2,
        [Emergency.TRIAGE_LEVELS.LESS_URGENT]: 3,
        [Emergency.TRIAGE_LEVELS.NON_URGENT]: 4,
    };

    const queue = await Emergency.find({ status: { $in: activeStatuses } })
        .populate('patient', 'patientId firstName lastName')
        .populate('assignedDoctor', 'profile.firstName profile.lastName');

    // Sort by triage level priority
    queue.sort((a, b) => {
        const priorityA = triagePriority[a.triageLevel] || 5;
        const priorityB = triagePriority[b.triageLevel] || 5;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(a.arrivalTime) - new Date(b.arrivalTime);
    });

    res.status(200).json({
        success: true,
        count: queue.length,
        data: queue,
    });
});

/**
 * @desc    Get emergency dashboard stats
 * @route   GET /api/emergency/dashboard
 */
exports.getDashboard = asyncHandler(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeCount, todayCount, triageBreakdown] = await Promise.all([
        Emergency.countDocuments({
            status: { $nin: [Emergency.EMERGENCY_STATUS.DISCHARGED, Emergency.EMERGENCY_STATUS.ADMITTED, Emergency.EMERGENCY_STATUS.TRANSFERRED] },
        }),
        Emergency.countDocuments({ arrivalTime: { $gte: today } }),
        Emergency.aggregate([
            { $match: { arrivalTime: { $gte: today } } },
            { $group: { _id: '$triageLevel', count: { $sum: 1 } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            activeCount,
            todayCount,
            triageBreakdown: triageBreakdown.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
        },
    });
});

/**
 * @desc    Get live emergency board with all active cases
 * @route   GET /api/emergency/live-board
 */
exports.getLiveBoard = asyncHandler(async (req, res, next) => {
    const activeStatuses = [
        Emergency.EMERGENCY_STATUS.REGISTERED,
        Emergency.EMERGENCY_STATUS.TRIAGE,
        Emergency.EMERGENCY_STATUS.IN_TREATMENT,
        Emergency.EMERGENCY_STATUS.OBSERVATION,
    ];

    const triagePriority = {
        [Emergency.TRIAGE_LEVELS.CRITICAL]: 1,
        [Emergency.TRIAGE_LEVELS.URGENT]: 2,
        [Emergency.TRIAGE_LEVELS.LESS_URGENT]: 3,
        [Emergency.TRIAGE_LEVELS.NON_URGENT]: 4,
    };

    const cases = await Emergency.find({ status: { $in: activeStatuses } })
        .populate('patient', 'patientId firstName lastName phone dateOfBirth gender')
        .populate('assignedDoctor', 'profile.firstName profile.lastName')
        .populate('assignedNurse', 'profile.firstName profile.lastName')
        .populate('triageBy', 'profile.firstName profile.lastName')
        .sort({ arrivalTime: -1 });

    // Add computed waiting time to each case
    const now = new Date();
    const casesWithWaitTime = cases.map(c => {
        const caseObj = c.toObject();

        // Calculate waiting time based on status
        if (c.treatmentStartTime) {
            // If treatment has started, waiting time is from arrival to treatment start
            caseObj.waitingTimeMs = c.treatmentStartTime - c.arrivalTime;
        } else {
            // Otherwise, waiting time is from arrival to now
            caseObj.waitingTimeMs = now - c.arrivalTime;
        }

        // Format waiting time as string
        const waitMinutes = Math.floor(caseObj.waitingTimeMs / (1000 * 60));
        const hours = Math.floor(waitMinutes / 60);
        const minutes = waitMinutes % 60;
        caseObj.waitingTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        return caseObj;
    });

    // Sort by triage priority, then by arrival time
    casesWithWaitTime.sort((a, b) => {
        const priorityA = triagePriority[a.triageLevel] || 5;
        const priorityB = triagePriority[b.triageLevel] || 5;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(a.arrivalTime) - new Date(b.arrivalTime);
    });

    res.status(200).json({
        success: true,
        count: casesWithWaitTime.length,
        data: casesWithWaitTime,
    });
});

/**
 * @desc    Update triage level for an emergency case
 * @route   POST /api/emergency/cases/:id/triage
 */
exports.updateTriage = asyncHandler(async (req, res, next) => {
    const { triageLevel, reason } = req.body;

    if (!triageLevel || !Object.values(Emergency.TRIAGE_LEVELS).includes(triageLevel)) {
        return next(new ErrorResponse('Invalid or missing triage level', 400));
    }

    const emergencyCase = await Emergency.findById(req.params.id);

    if (!emergencyCase) {
        return next(new ErrorResponse('Emergency case not found', 404));
    }

    // Record triage history
    emergencyCase.triageHistory.push({
        level: triageLevel,
        changedBy: req.user.id,
        changedAt: new Date(),
        reason: reason || '',
    });

    // Update current triage
    emergencyCase.triageLevel = triageLevel;
    emergencyCase.triageTime = new Date();
    emergencyCase.triageBy = req.user.id;

    // If status is registered, move to triage
    if (emergencyCase.status === Emergency.EMERGENCY_STATUS.REGISTERED) {
        emergencyCase.status = Emergency.EMERGENCY_STATUS.TRIAGE;
    }

    await emergencyCase.save();

    await emergencyCase.populate([
        { path: 'patient', select: 'patientId firstName lastName phone' },
        { path: 'assignedDoctor', select: 'profile.firstName profile.lastName' },
        { path: 'triageBy', select: 'profile.firstName profile.lastName' },
    ]);

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
        io.to('emergency-room').emit('emergency:triage', {
            caseId: emergencyCase._id,
            triageLevel: emergencyCase.triageLevel,
            data: emergencyCase,
        });
    }

    res.status(200).json({
        success: true,
        data: emergencyCase,
    });
});

/**
 * @desc    Update status for an emergency case
 * @route   PUT /api/emergency/cases/:id/status
 */
exports.updateStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body;

    if (!status || !Object.values(Emergency.EMERGENCY_STATUS).includes(status)) {
        return next(new ErrorResponse('Invalid or missing status', 400));
    }

    const emergencyCase = await Emergency.findById(req.params.id);

    if (!emergencyCase) {
        return next(new ErrorResponse('Emergency case not found', 404));
    }

    const previousStatus = emergencyCase.status;

    // Handle status-specific timestamp updates
    if (status === Emergency.EMERGENCY_STATUS.IN_TREATMENT && !emergencyCase.treatmentStartTime) {
        emergencyCase.treatmentStartTime = new Date();
    }

    if (status === Emergency.EMERGENCY_STATUS.DISCHARGED || status === Emergency.EMERGENCY_STATUS.ADMITTED || status === Emergency.EMERGENCY_STATUS.TRANSFERRED) {
        emergencyCase.treatmentEndTime = new Date();
        if (status === Emergency.EMERGENCY_STATUS.DISCHARGED) {
            emergencyCase.dischargeTime = new Date();
            emergencyCase.disposition = 'discharge';
        } else if (status === Emergency.EMERGENCY_STATUS.ADMITTED) {
            emergencyCase.disposition = 'admit';
        } else if (status === Emergency.EMERGENCY_STATUS.TRANSFERRED) {
            emergencyCase.disposition = 'transfer';
        }
    }

    emergencyCase.status = status;
    await emergencyCase.save();

    await emergencyCase.populate([
        { path: 'patient', select: 'patientId firstName lastName phone' },
        { path: 'assignedDoctor', select: 'profile.firstName profile.lastName' },
        { path: 'triageBy', select: 'profile.firstName profile.lastName' },
    ]);

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
        io.to('emergency-room').emit('emergency:status', {
            caseId: emergencyCase._id,
            previousStatus,
            newStatus: status,
            data: emergencyCase,
        });
    }

    res.status(200).json({
        success: true,
        data: emergencyCase,
    });
});
