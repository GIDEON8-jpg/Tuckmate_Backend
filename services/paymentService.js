const axios = require('axios');
const config = require('../config/config');
const { Payment, Order } = require('../models');
const InventoryService = require('./inventoryService');

class PaymentService {
    static async processEcoCashPayment(orderId, phoneNumber) {
        const order = await Order.findByPk(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.payment_status !== 'pending') {
            throw new Error('Payment already processed for this order');
        }

        // In a real implementation, this would call the EcoCash API
        const ecoCashResponse = await axios.post('https://api.ecocash.com/payments', {
            merchantId: config.ecocash.merchantId,
            apiKey: config.ecocash.apiKey,
            amount: order.total_amount,
            phoneNumber,
            reference: `TUCK_${order.id}`,
            callbackUrl: config.ecocash.callbackUrl
        });

        // Save payment record
        const payment = await Payment.create({
            order_id: order.id,
            amount: order.total_amount,
            payment_method: 'ecocash',
            transaction_id: ecoCashResponse.data.transactionId,
            phone_number: phoneNumber,
            status: 'pending'
        });

        return {
            paymentId: payment.id,
            transactionId: ecoCashResponse.data.transactionId,
            status: 'pending'
        };
    }

    static async verifyEcoCashPayment(paymentId) {
        const payment = await Payment.findByPk(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        // In a real implementation, this would verify with EcoCash API
        const verificationResponse = await axios.get(`https://api.ecocash.com/payments/${payment.transaction_id}/verify`, {
            headers: {
                'X-API-KEY': config.ecocash.apiKey
            }
        });

        if (verificationResponse.data.status === 'success') {
            payment.status = 'completed';
            await payment.save();

            const order = await Order.findByPk(payment.order_id);
            order.payment_status = 'completed';
            await order.save();

            // Deduct inventory if not already done
            await InventoryService.confirmInventoryDeduction(payment.order_id);
        }

        return verificationResponse.data;
    }

    static async processCashPayment(orderId, amountReceived) {
        const order = await Order.findByPk(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.payment_method !== 'cash') {
            throw new Error('Order is not a cash payment');
        }

        if (order.payment_status !== 'pending') {
            throw new Error('Payment already processed for this order');
        }

        if (amountReceived < order.total_amount) {
            throw new Error('Insufficient amount received');
        }

        const payment = await Payment.create({
            order_id: order.id,
            amount: order.total_amount,
            payment_method: 'cash',
            status: 'completed'
        });

        order.payment_status = 'completed';
        await order.save();

        // Confirm inventory deduction
        await InventoryService.confirmInventoryDeduction(order.id);

        return payment;
    }
}

module.exports = PaymentService;