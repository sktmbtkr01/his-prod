const express = require('express');
const router = express.Router();
const {
    generateLabBill,
    generateRadiologyBill,
    generatePharmacyBill,
    recordPayment,
    getDepartmentBill,
    getDepartmentBillsForEncounter,
    getUnbilledOrders,
    getCentralBillingView,
    getPatientDepartmentBills,
    getDepartmentDashboard,
    getAllDepartmentBills,
} = require('../controllers/departmentBilling.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Get all department bills (with filters)
router.get('/', authorize('admin', 'billing'), getAllDepartmentBills);

// Department dashboards
router.get('/dashboard/:department', getDepartmentDashboard);

// Generate bills by department
router.post('/lab/generate', authorize('admin', 'lab_tech'), generateLabBill);
router.post('/radiology/generate', authorize('admin', 'radiologist'), generateRadiologyBill);
router.post('/pharmacy/generate', authorize('admin', 'pharmacist'), generatePharmacyBill);

// Get unbilled orders by department
router.get('/:department/unbilled', getUnbilledOrders);

// Central billing view for an encounter
router.get('/central/:encounterId', authorize('admin', 'billing'), getCentralBillingView);

// Department bills for an encounter
router.get('/encounter/:encounterId', getDepartmentBillsForEncounter);

// Patient's department bills
router.get('/patient/:patientId', getPatientDepartmentBills);

// Get specific department bill
router.get('/:id', getDepartmentBill);

// Record payment on department bill
router.post('/:id/pay', recordPayment);

module.exports = router;
