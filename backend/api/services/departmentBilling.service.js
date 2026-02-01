const DepartmentBill = require('../models/DepartmentBill');
const Billing = require('../models/Billing');
const LabTest = require('../models/LabTest');
const Radiology = require('../models/Radiology');
const PharmacyDispense = require('../models/PharmacyDispense');
const LabTestMaster = require('../models/LabTestMaster');
const RadiologyMaster = require('../models/RadiologyMaster');
const { PAYMENT_STATUS } = require('../config/constants');

/**
 * Department Billing Service
 * Handles department-specific bills that roll up to master OPD bill
 */

class DepartmentBillingService {

    /**
     * Generate bill for laboratory orders
     */
    async generateLabBill(orderIds, generatedBy, encounterId, encounterModel, patientId) {
        // Validate orders aren't already billed
        const orders = await LabTest.find({
            _id: { $in: orderIds },
            isBilled: { $ne: true }
        }).populate('test');

        if (orders.length === 0) {
            throw new Error('No unbilled laboratory orders found');
        }

        if (orders.length !== orderIds.length) {
            throw new Error('Some orders are already billed or not found');
        }

        // Build line items from orders
        const items = orders.map(order => {
            const rate = order.test?.price || 0;
            return {
                description: order.test?.testName || 'Lab Test',
                quantity: 1,
                rate: rate,
                amount: rate,
                netAmount: rate,
                orderItemRef: order._id,
            };
        });

        // Create department bill
        const departmentBill = await DepartmentBill.create({
            department: 'laboratory',
            patient: patientId,
            encounter: encounterId,
            encounterModel: encounterModel,
            orders: orders.map(o => ({
                orderType: 'lab',
                orderReference: o._id,
                orderRefModel: 'LabTest',
                orderNumber: o.testNumber,
            })),
            items: items,
            generatedBy: generatedBy,
            auditTrail: [{
                action: 'created',
                performedBy: generatedBy,
                details: { orderCount: orders.length },
            }],
        });

        // Mark orders as billed
        await LabTest.updateMany(
            { _id: { $in: orderIds } },
            { $set: { isBilled: true, departmentBill: departmentBill._id } }
        );

        // Link to master bill if exists
        await this.linkToMasterBill(departmentBill, encounterId, encounterModel, patientId, generatedBy);

        return departmentBill;
    }

    /**
     * Generate bill for radiology orders
     */
    async generateRadiologyBill(orderIds, generatedBy, encounterId, encounterModel, patientId) {
        const orders = await Radiology.find({
            _id: { $in: orderIds },
            isBilled: { $ne: true }
        }).populate('test');

        if (orders.length === 0) {
            throw new Error('No unbilled radiology orders found');
        }

        if (orders.length !== orderIds.length) {
            throw new Error('Some orders are already billed or not found');
        }

        const items = orders.map(order => {
            const rate = order.test?.price || 0;
            return {
                description: `${order.test?.testName || 'Radiology'} (${order.test?.modality || ''})`,
                quantity: 1,
                rate: rate,
                amount: rate,
                netAmount: rate,
                orderItemRef: order._id,
            };
        });

        const departmentBill = await DepartmentBill.create({
            department: 'radiology',
            patient: patientId,
            encounter: encounterId,
            encounterModel: encounterModel,
            orders: orders.map(o => ({
                orderType: 'radiology',
                orderReference: o._id,
                orderRefModel: 'Radiology',
                orderNumber: o.testNumber,
            })),
            items: items,
            generatedBy: generatedBy,
            auditTrail: [{
                action: 'created',
                performedBy: generatedBy,
                details: { orderCount: orders.length },
            }],
        });

        await Radiology.updateMany(
            { _id: { $in: orderIds } },
            { $set: { isBilled: true, departmentBill: departmentBill._id } }
        );

        await this.linkToMasterBill(departmentBill, encounterId, encounterModel, patientId, generatedBy);

        return departmentBill;
    }

    /**
     * Generate bill for pharmacy dispense
     */
    async generatePharmacyBill(dispenseIds, generatedBy, encounterId, encounterModel, patientId) {
        const dispenses = await PharmacyDispense.find({
            _id: { $in: dispenseIds },
            isBilled: { $ne: true }
        }).populate('items.medicine');

        if (dispenses.length === 0) {
            throw new Error('No unbilled pharmacy dispenses found');
        }

        if (dispenses.length !== dispenseIds.length) {
            throw new Error('Some dispenses are already billed or not found');
        }

        // Flatten all medicine items from all dispenses
        const items = [];
        dispenses.forEach(dispense => {
            dispense.items.forEach(item => {
                items.push({
                    description: item.medicine?.name || 'Medicine',
                    quantity: item.dispensedQuantity,
                    rate: item.unitPrice,
                    amount: item.totalPrice,
                    netAmount: item.totalPrice,
                    orderItemRef: dispense._id,
                });
            });
        });

        const departmentBill = await DepartmentBill.create({
            department: 'pharmacy',
            patient: patientId,
            encounter: encounterId,
            encounterModel: encounterModel,
            orders: dispenses.map(d => ({
                orderType: 'pharmacy',
                orderReference: d._id,
                orderRefModel: 'PharmacyDispense',
                orderNumber: d.dispenseNumber,
            })),
            items: items,
            generatedBy: generatedBy,
            auditTrail: [{
                action: 'created',
                performedBy: generatedBy,
                details: { dispenseCount: dispenses.length },
            }],
        });

        await PharmacyDispense.updateMany(
            { _id: { $in: dispenseIds } },
            { $set: { isBilled: true, departmentBill: departmentBill._id } }
        );

        await this.linkToMasterBill(departmentBill, encounterId, encounterModel, patientId, generatedBy);

        return departmentBill;
    }

    /**
     * Link department bill to master OPD bill
     */
    async linkToMasterBill(departmentBill, encounterId, encounterModel, patientId, generatedBy) {
        // Find or create master bill for this encounter
        let masterBill = await Billing.findOne({
            visit: encounterId,
            visitModel: encounterModel,
            status: { $ne: 'cancelled' }
        });

        if (!masterBill) {
            // Create master bill
            masterBill = await Billing.create({
                patient: patientId,
                visit: encounterId,
                visitModel: encounterModel,
                visitType: encounterModel === 'Admission' ? 'ipd' : 'opd',
                items: [],
                generatedBy: generatedBy,
                auditTrail: [{
                    action: 'created',
                    performedBy: generatedBy,
                    details: { source: 'department_billing' },
                }],
            });
        }

        // Add department bill reference
        if (!masterBill.departmentBills) {
            masterBill.departmentBills = [];
        }
        masterBill.departmentBills.push(departmentBill._id);
        await masterBill.save(); // CRITICAL: Save the master bill with the new department bill reference

        // Update department bill with master bill reference
        departmentBill.masterBill = masterBill._id;
        await departmentBill.save();

        // Sync department payments to master bill
        await this.syncDepartmentPaymentsToMaster(masterBill._id);

        return masterBill;
    }

    /**
     * Record payment on department bill
     */
    async recordPayment(departmentBillId, paymentData, receivedBy) {
        const departmentBill = await DepartmentBill.findById(departmentBillId);
        if (!departmentBill) throw new Error('Department bill not found');
        if (departmentBill.isLocked) throw new Error('Bill is already paid and locked');

        const { amount, mode, reference } = paymentData;

        if (amount <= 0) throw new Error('Payment amount must be positive');

        const newPaidAmount = departmentBill.paidAmount + amount;
        if (newPaidAmount > departmentBill.grandTotal) {
            throw new Error(`Payment amount (${amount}) exceeds balance (${departmentBill.balanceAmount})`);
        }

        // Generate receipt number
        const receiptNumber = departmentBill.generateReceiptNumber();

        // Add payment record
        departmentBill.payments.push({
            amount,
            mode,
            reference,
            receivedBy,
            receiptNumber,
        });

        departmentBill.paidAmount = newPaidAmount;

        // Add audit trail
        departmentBill.auditTrail.push({
            action: 'payment_received',
            performedBy: receivedBy,
            details: { amount, mode, reference, receiptNumber },
        });

        await departmentBill.save();

        // Sync to master bill
        if (departmentBill.masterBill) {
            await this.syncDepartmentPaymentsToMaster(departmentBill.masterBill);
        }

        return departmentBill;
    }

    /**
     * Sync department payments to master bill
     */
    async syncDepartmentPaymentsToMaster(masterBillId) {
        const masterBill = await Billing.findById(masterBillId)
            .populate('departmentBills');

        if (!masterBill || !masterBill.departmentBills) return;

        // Calculate department-wise totals
        const deptPayments = {
            pharmacy: { total: 0, paid: 0, status: 'none' },
            laboratory: { total: 0, paid: 0, status: 'none' },
            radiology: { total: 0, paid: 0, status: 'none' },
        };

        let totalFromDepts = 0;
        let paidFromDepts = 0;

        for (const deptBill of masterBill.departmentBills) {
            const dept = deptBill.department;
            if (deptPayments[dept]) {
                deptPayments[dept].total += deptBill.grandTotal;
                deptPayments[dept].paid += deptBill.paidAmount;
                totalFromDepts += deptBill.grandTotal;
                paidFromDepts += deptBill.paidAmount;

                // Set status
                if (deptBill.grandTotal === 0) {
                    deptPayments[dept].status = 'none';
                } else if (deptBill.paidAmount >= deptBill.grandTotal) {
                    deptPayments[dept].status = 'paid';
                } else if (deptBill.paidAmount > 0) {
                    deptPayments[dept].status = 'partial';
                } else {
                    deptPayments[dept].status = 'pending';
                }
            }
        }

        masterBill.departmentPayments = deptPayments;

        // Update master bill paid amount from department payments
        // Note: paidAmount on master bill = sum of department payments + direct payments
        const directPayments = (masterBill.auditTrail || [])
            .filter(a => a.action === 'payment_received')
            .reduce((sum, a) => sum + (a.details?.amount || 0), 0);

        masterBill.paidAmount = paidFromDepts + directPayments;

        await masterBill.save();

        return masterBill;
    }

    /**
     * Get department bills for an encounter
     */
    async getDepartmentBillsForEncounter(encounterId) {
        return DepartmentBill.find({ encounter: encounterId })
            .populate('orders.orderReference')
            .populate('generatedBy', 'profile.firstName profile.lastName')
            .sort({ billDate: -1 });
    }

    /**
     * Get unbilled orders for a department
     */
    async getUnbilledOrders(department, patientId = null, encounterId = null) {
        // Use $ne: true to also match documents where isBilled doesn't exist
        const query = { isBilled: { $ne: true } };
        if (patientId) query.patient = patientId;
        if (encounterId) query.visit = encounterId;

        switch (department) {
            case 'laboratory':
                return LabTest.find(query)
                    .populate('patient', 'firstName lastName patientId')
                    .populate('test')
                    .populate('orderedBy', 'profile.firstName profile.lastName')
                    .sort({ createdAt: -1 });

            case 'radiology':
                return Radiology.find(query)
                    .populate('patient', 'firstName lastName patientId')
                    .populate('test')
                    .populate('orderedBy', 'profile.firstName profile.lastName')
                    .sort({ createdAt: -1 });

            case 'pharmacy':
                const dispenseQuery = { isBilled: { $ne: true } };
                if (patientId) dispenseQuery.patient = patientId;
                return PharmacyDispense.find(dispenseQuery)
                    .populate('patient', 'firstName lastName patientId')
                    .populate('prescription')
                    .populate('items.medicine')
                    .sort({ dispensedAt: -1 });

            default:
                throw new Error('Invalid department');
        }
    }

    /**
     * Get central billing view for an encounter
     */
    async getCentralBillingView(encounterId) {
        const masterBill = await Billing.findOne({
            visit: encounterId,
            status: { $ne: 'cancelled' }
        }).populate('departmentBills');

        if (!masterBill) {
            return {
                masterBill: null,
                departmentBreakdown: {
                    pharmacy: { total: 0, paid: 0, balance: 0, status: 'none', bills: [] },
                    laboratory: { total: 0, paid: 0, balance: 0, status: 'none', bills: [] },
                    radiology: { total: 0, paid: 0, balance: 0, status: 'none', bills: [] },
                },
                totalAmount: 0,
                totalPaid: 0,
                totalBalance: 0,
            };
        }

        const departmentBreakdown = {
            pharmacy: { total: 0, paid: 0, balance: 0, status: 'none', bills: [] },
            laboratory: { total: 0, paid: 0, balance: 0, status: 'none', bills: [] },
            radiology: { total: 0, paid: 0, balance: 0, status: 'none', bills: [] },
        };

        if (masterBill.departmentBills) {
            for (const deptBill of masterBill.departmentBills) {
                const dept = deptBill.department;
                if (departmentBreakdown[dept]) {
                    departmentBreakdown[dept].total += deptBill.grandTotal;
                    departmentBreakdown[dept].paid += deptBill.paidAmount;
                    departmentBreakdown[dept].balance += deptBill.balanceAmount;
                    departmentBreakdown[dept].bills.push({
                        _id: deptBill._id,
                        billNumber: deptBill.billNumber,
                        grandTotal: deptBill.grandTotal,
                        paidAmount: deptBill.paidAmount,
                        balanceAmount: deptBill.balanceAmount,
                        paymentStatus: deptBill.paymentStatus,
                        billDate: deptBill.billDate,
                    });
                }
            }
        }

        // Set statuses
        for (const dept of Object.keys(departmentBreakdown)) {
            const d = departmentBreakdown[dept];
            if (d.total === 0) {
                d.status = 'none';
            } else if (d.paid >= d.total) {
                d.status = 'paid';
            } else if (d.paid > 0) {
                d.status = 'partial';
            } else {
                d.status = 'pending';
            }
        }

        const totalAmount = Object.values(departmentBreakdown).reduce((s, d) => s + d.total, 0) + masterBill.grandTotal;
        const totalPaid = Object.values(departmentBreakdown).reduce((s, d) => s + d.paid, 0) + masterBill.paidAmount;
        const totalBalance = totalAmount - totalPaid;

        return {
            masterBill,
            departmentBreakdown,
            totalAmount,
            totalPaid,
            totalBalance,
        };
    }

    /**
     * Get department bill by ID
     */
    async getDepartmentBill(billId) {
        return DepartmentBill.findById(billId)
            .populate('patient', 'firstName lastName patientId')
            .populate('orders.orderReference')
            .populate('generatedBy', 'profile.firstName profile.lastName')
            .populate('payments.receivedBy', 'profile.firstName profile.lastName');
    }

    /**
     * Get all department bills for a patient
     */
    async getPatientDepartmentBills(patientId) {
        return DepartmentBill.find({ patient: patientId })
            .populate('encounter')
            .sort({ billDate: -1 });
    }
}

module.exports = new DepartmentBillingService();
