const Appointment = require('../models/Appointment');
const Admission = require('../models/Admission');
const Billing = require('../models/Billing');
const LabTest = require('../models/LabTest');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get executive dashboard
 * @route   GET /api/analytics/executive-dashboard
 */
exports.getExecutiveDashboard = asyncHandler(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [opdToday, ipdCurrent, revenueToday, revenueMonth] = await Promise.all([
        Appointment.countDocuments({ scheduledDate: { $gte: today } }),
        Admission.countDocuments({ status: 'admitted' }),
        Billing.aggregate([
            { $match: { billDate: { $gte: today } } },
            { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
        Billing.aggregate([
            { $match: { billDate: { $gte: monthStart } } },
            { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            opdToday,
            ipdCurrent,
            revenueToday: revenueToday[0]?.total || 0,
            revenueMonth: revenueMonth[0]?.total || 0,
        },
    });
});

/**
 * @desc    Get clinical analytics for doctors/nurses
 * @route   GET /api/analytics/clinical
 */
exports.getClinicalAnalytics = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const logger = require('../utils/logger');

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    logger.info(`[ClinicalDashboard] Fetching stats for doctor ${userId}`);

    // 1. My appointments today
    const myAppointmentsToday = await Appointment.find({
        doctor: userId,
        scheduledDate: { $gte: today, $lt: tomorrow }
    }).populate('patient', 'firstName lastName patientId').sort({ scheduledTime: 1 });

    const appointmentsByStatus = {
        scheduled: myAppointmentsToday.filter(a => a.status === 'scheduled').length,
        checkedIn: myAppointmentsToday.filter(a => ['checked-in', 'in-consultation'].includes(a.status)).length,
        completed: myAppointmentsToday.filter(a => ['completed', 'pharmacy-cleared'].includes(a.status)).length,
        total: myAppointmentsToday.length
    };

    // 2. My admitted patients
    const myAdmissions = await Admission.find({
        doctor: userId,
        status: 'admitted'
    }).populate('patient', 'firstName lastName patientId');

    // 3. Lab reports pending MY review (ordered by me, completed but not viewed)
    const pendingLabReports = await LabTest.find({
        orderedBy: userId,
        status: 'completed'
    })
        .populate('patient', 'firstName lastName patientId')
        .populate('test', 'name category')
        .sort({ completedAt: -1 })
        .limit(20);

    // Identify critical values
    const criticalReports = pendingLabReports.filter(report =>
        report.results?.some(r => r.isCritical === true)
    );

    const abnormalReports = pendingLabReports.filter(report =>
        report.results?.some(r => r.isAbnormal === true) && !report.results?.some(r => r.isCritical)
    );

    // 4. Recent lab uploads (last 2 hours)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const recentLabUploads = await LabTest.countDocuments({
        orderedBy: userId,
        status: 'completed',
        completedAt: { $gte: twoHoursAgo }
    });

    // 5. Hourly OPD traffic for the doctor today
    const hourlyTraffic = await Appointment.aggregate([
        {
            $match: {
                doctor: require('mongoose').Types.ObjectId.createFromHexString(userId),
                scheduledDate: { $gte: today, $lt: tomorrow }
            }
        },
        {
            $group: {
                _id: { $hour: '$scheduledDate' },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Format hourly data
    const trafficData = [];
    for (let i = 8; i <= 20; i++) {
        const hourStat = hourlyTraffic.find(h => h._id === i);
        const isCurrentHour = now.getHours() === i;
        trafficData.push({
            name: `${i}:00`,
            patients: hourStat?.count || 0,
            isCurrentHour
        });
    }

    // 6. Build "Needs Attention" list
    const needsAttention = [];

    // Critical lab values
    criticalReports.forEach(report => {
        needsAttention.push({
            id: report._id,
            type: 'critical_lab',
            priority: 'critical',
            title: `Critical Lab Value`,
            description: `${report.test?.name || 'Lab Test'} for ${report.patient?.firstName} ${report.patient?.lastName}`,
            patientId: report.patient?._id,
            patientName: `${report.patient?.firstName} ${report.patient?.lastName}`,
            actionUrl: `/dashboard/lab/${report._id}`,
            time: report.completedAt
        });
    });

    // Abnormal values (lower priority)
    abnormalReports.slice(0, 5).forEach(report => {
        needsAttention.push({
            id: report._id,
            type: 'abnormal_lab',
            priority: 'important',
            title: `Abnormal Result`,
            description: `${report.test?.name || 'Lab Test'} for ${report.patient?.firstName} ${report.patient?.lastName}`,
            patientId: report.patient?._id,
            patientName: `${report.patient?.firstName} ${report.patient?.lastName}`,
            actionUrl: `/dashboard/lab/${report._id}`,
            time: report.completedAt
        });
    });

    // Checked-in patients waiting
    myAppointmentsToday.filter(a => a.status === 'checked-in').forEach(appt => {
        needsAttention.push({
            id: appt._id,
            type: 'waiting_patient',
            priority: 'normal',
            title: `Patient Waiting`,
            description: `${appt.patient?.firstName} ${appt.patient?.lastName} (${appt.patient?.patientId})`,
            patientId: appt.patient?._id,
            patientName: `${appt.patient?.firstName} ${appt.patient?.lastName}`,
            actionUrl: `/opd/${appt._id}`,
            time: appt.updatedAt
        });
    });

    // Sort by priority
    const priorityOrder = { critical: 1, important: 2, normal: 3 };
    needsAttention.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const responseData = {
        appointments: appointmentsByStatus,
        admittedPatients: myAdmissions.length,
        pendingLabReports: pendingLabReports.length,
        criticalAlerts: criticalReports.length,
        recentLabUploads,
        trafficData,
        needsAttention: needsAttention.slice(0, 10),
        // For quick access lists
        upcomingAppointments: myAppointmentsToday.filter(a => a.status === 'scheduled').slice(0, 5).map(a => ({
            id: a._id,
            patientName: `${a.patient?.firstName} ${a.patient?.lastName}`,
            patientId: a.patient?.patientId,
            time: a.scheduledTime,
            complaint: a.chiefComplaint
        })),
        admissions: myAdmissions.slice(0, 5).map(a => ({
            id: a._id,
            patientName: `${a.patient?.firstName} ${a.patient?.lastName}`,
            patientId: a.patient?.patientId
        }))
    };

    logger.info(`[ClinicalDashboard] Response: appointments=${appointmentsByStatus.total}, labs=${pendingLabReports.length}, critical=${criticalReports.length}`);

    res.status(200).json({
        success: true,
        data: responseData
    });
});

/**
 * @desc    Get financial analytics
 * @route   GET /api/analytics/financial
 */
exports.getFinancialAnalytics = asyncHandler(async (req, res, next) => {
    const { period = 'month' } = req.query;
    const today = new Date();

    let startDate;
    if (period === 'week') {
        startDate = new Date(today.setDate(today.getDate() - 7));
    } else if (period === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (period === 'year') {
        startDate = new Date(today.getFullYear(), 0, 1);
    }

    const [revenue, collections, pending] = await Promise.all([
        Billing.aggregate([
            { $match: { billDate: { $gte: startDate } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        Billing.aggregate([
            { $match: { billDate: { $gte: startDate } } },
            { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
        Billing.aggregate([
            { $match: { paymentStatus: { $in: ['pending', 'partial'] } } },
            { $group: { _id: null, total: { $sum: '$balanceAmount' } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalRevenue: revenue[0]?.total || 0,
            totalCollections: collections[0]?.total || 0,
            pendingAmount: pending[0]?.total || 0,
        },
    });
});

/**
 * @desc    Get operational analytics
 * @route   GET /api/analytics/operational
 */
exports.getOperationalAnalytics = asyncHandler(async (req, res, next) => {
    const [bedOccupancy, avgWaitTime] = await Promise.all([
        // Bed occupancy
        require('../models/Bed').aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        // Average wait time (placeholder)
        Promise.resolve({ avgMinutes: 25 }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            bedOccupancy,
            avgWaitTime: avgWaitTime.avgMinutes,
        },
    });
});

/**
 * @desc    Get available reports
 * @route   GET /api/analytics/reports
 */
exports.getReports = asyncHandler(async (req, res, next) => {
    const reports = [
        { id: 'daily-collection', name: 'Daily Collection Report' },
        { id: 'patient-census', name: 'Patient Census Report' },
        { id: 'department-wise', name: 'Department Wise Revenue' },
        { id: 'outstanding', name: 'Outstanding Report' },
        { id: 'lab-workload', name: 'Lab Workload Report' },
    ];

    res.status(200).json({
        success: true,
        data: reports,
    });
});

/**
 * @desc    Generate custom report
 * @route   POST /api/analytics/custom-report
 */
exports.generateCustomReport = asyncHandler(async (req, res, next) => {
    const { reportType, startDate, endDate, filters } = req.body;

    // TODO: Implement custom report generation
    res.status(200).json({
        success: true,
        message: 'Report generation initiated',
        data: {
            reportId: `RPT${Date.now()}`,
            status: 'processing',
        },
    });
});

/**
 * @desc    Download report
 * @route   GET /api/analytics/reports/:id/download
 */
exports.downloadReport = asyncHandler(async (req, res, next) => {
    // TODO: Implement report download
    res.status(200).json({
        success: true,
        message: 'Report download URL',
        data: {
            url: `/reports/${req.params.id}.pdf`,
        },
    });
});

/**
 * @desc    Get receptionist dashboard analytics
 * @route   GET /api/analytics/reception
 */
exports.getReceptionistAnalytics = asyncHandler(async (req, res, next) => {
    const Patient = require('../models/Patient');
    const logger = require('../utils/logger');

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    logger.info(`[ReceptionistDashboard] Fetching stats for date range: ${today.toISOString()} to ${tomorrow.toISOString()}`);

    // 1. New Registrations Today
    const newRegistrations = await Patient.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow }
    });

    // 2. Appointment stats for today
    const appointmentsToday = await Appointment.find({
        scheduledDate: { $gte: today, $lt: tomorrow }
    });

    const appointments = {
        scheduled: appointmentsToday.filter(a => a.status === 'scheduled').length,
        checkedIn: appointmentsToday.filter(a => ['checked-in', 'in-consultation'].includes(a.status)).length,
        completed: appointmentsToday.filter(a => ['completed', 'pharmacy-cleared'].includes(a.status)).length,
        cancelled: appointmentsToday.filter(a => a.status === 'cancelled').length,
        total: appointmentsToday.length
    };

    // 3. Hourly traffic data
    const hourlyRegistrations = await Patient.aggregate([
        {
            $match: {
                createdAt: { $gte: today, $lt: tomorrow }
            }
        },
        {
            $group: {
                _id: { $hour: '$createdAt' },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const hourlyAppointments = await Appointment.aggregate([
        {
            $match: {
                scheduledDate: { $gte: today, $lt: tomorrow }
            }
        },
        {
            $group: {
                _id: { $hour: '$scheduledDate' },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Format hourly data (8 AM to 8 PM)
    const trafficData = [];
    for (let i = 8; i <= 20; i++) {
        const regStat = hourlyRegistrations.find(h => h._id === i);
        const apptStat = hourlyAppointments.find(h => h._id === i);
        trafficData.push({
            name: `${i}:00`,
            registrations: regStat?.count || 0,
            appointments: apptStat?.count || 0,
            patients: (regStat?.count || 0) + (apptStat?.count || 0)
        });
    }

    // Total patients
    const totalPatients = await Patient.countDocuments();

    logger.info(`[ReceptionistDashboard] Registrations today: ${newRegistrations}, Total patients: ${totalPatients}`);

    res.status(200).json({
        success: true,
        data: {
            newRegistrations,
            appointments,
            trafficData,
            totalPatients
        }
    });
});

