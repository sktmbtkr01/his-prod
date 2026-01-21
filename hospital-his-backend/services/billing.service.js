const Billing = require('../models/Billing');
const BillingItem = require('../models/BillingItem');
const Tariff = require('../models/Tariff');
const { PAYMENT_STATUS } = require('../config/constants');

/**
 * Billing Service
 * Handles billing calculations and invoice generation
 */

class BillingService {
    /**
     * Generate bill number
     */
    async generateBillNumber() {
        const today = new Date();
        const prefix = `BIL${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

        const lastBill = await Billing.findOne({ billNumber: { $regex: `^${prefix}` } })
            .sort({ createdAt: -1 });

        const sequence = lastBill
            ? parseInt(lastBill.billNumber.slice(-6), 10) + 1
            : 1;

        return `${prefix}${String(sequence).padStart(6, '0')}`;
    }

    /**
     * Calculate bill totals
     */
    calculateTotals(items) {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        items.forEach((item) => {
            const itemAmount = item.quantity * item.rate;
            const discount = item.discountAmount || (itemAmount * (item.discountPercent || 0)) / 100;
            const taxableAmount = itemAmount - discount;
            const tax = (taxableAmount * (item.taxPercent || 0)) / 100;

            subtotal += itemAmount;
            totalDiscount += discount;
            totalTax += tax;
        });

        const grandTotal = subtotal - totalDiscount + totalTax;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            totalDiscount: Math.round(totalDiscount * 100) / 100,
            totalTax: Math.round(totalTax * 100) / 100,
            grandTotal: Math.round(grandTotal * 100) / 100,
        };
    }

    /**
     * Generate bill for patient
     */
    async generateBill(billData) {
        const billNumber = await this.generateBillNumber();
        const { items, ...rest } = billData;

        // Calculate totals
        const totals = this.calculateTotals(items);

        const bill = await Billing.create({
            ...rest,
            billNumber,
            items,
            ...totals,
            paidAmount: 0,
            balanceAmount: totals.grandTotal,
            paymentStatus: PAYMENT_STATUS.PENDING,
        });

        return bill;
    }

    /**
     * Add items to existing bill
     */
    async addItemsToBill(billId, newItems) {
        const bill = await Billing.findById(billId);
        if (!bill) throw new Error('Bill not found');

        bill.items.push(...newItems);
        const totals = this.calculateTotals(bill.items);

        Object.assign(bill, totals);
        bill.balanceAmount = totals.grandTotal - bill.paidAmount;
        bill.paymentStatus = this.getPaymentStatus(bill.paidAmount, totals.grandTotal);

        return bill.save();
    }

    /**
     * Get payment status based on amounts
     */
    getPaymentStatus(paidAmount, grandTotal) {
        if (paidAmount >= grandTotal) return PAYMENT_STATUS.PAID;
        if (paidAmount > 0) return PAYMENT_STATUS.PARTIAL;
        return PAYMENT_STATUS.PENDING;
    }

    /**
     * Apply discount to bill
     */
    async applyDiscount(billId, discountPercent, discountReason) {
        const bill = await Billing.findById(billId);
        if (!bill) throw new Error('Bill not found');

        const additionalDiscount = (bill.subtotal * discountPercent) / 100;
        bill.totalDiscount += additionalDiscount;
        bill.grandTotal = bill.subtotal - bill.totalDiscount + bill.totalTax;
        bill.balanceAmount = bill.grandTotal - bill.paidAmount;
        bill.discountReason = discountReason;

        return bill.save();
    }

    /**
     * Get tariff for service
     */
    async getServiceTariff(tariffCode) {
        return Tariff.findOne({ tariffCode, isActive: true });
    }

    /**
     * Get outstanding bills for patient
     */
    async getPatientOutstanding(patientId) {
        const bills = await Billing.find({
            patient: patientId,
            paymentStatus: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PARTIAL] },
        });

        const totalOutstanding = bills.reduce((acc, bill) => acc + bill.balanceAmount, 0);

        return { bills, totalOutstanding };
    }

    /**
     * Get billing summary for date range
     */
    async getBillingSummary(startDate, endDate) {
        const summary = await Billing.aggregate([
            {
                $match: {
                    billDate: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: null,
                    totalBilled: { $sum: '$grandTotal' },
                    totalCollected: { $sum: '$paidAmount' },
                    totalOutstanding: { $sum: '$balanceAmount' },
                    billCount: { $sum: 1 },
                },
            },
        ]);

        return summary[0] || { totalBilled: 0, totalCollected: 0, totalOutstanding: 0, billCount: 0 };
    }
}

module.exports = new BillingService();
