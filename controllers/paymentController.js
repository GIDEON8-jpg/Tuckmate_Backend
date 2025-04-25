const { Payment, Order } = require('../models');
const PaymentService = require('../services/paymentService');
const { validationResult } = require('express-validator');
const sequelize = require('../config/database');

exports.initiateEcoCashPayment = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await t.rollback();
            return res.status(400).json({ errors: errors.array() });
        }

        const { orderId, phoneNumber } = req.body;
        const userId = req.user.id;

        // Verify order belongs to user
        const order = await Order.findOne({
            where: { id: orderId, user_id: userId },
            transaction: t
        });

        if (!order) {
            await t.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.payment_method !== 'ecocash') {
            await t.rollback();
            return res.status(400).json({ error: 'Order is not for EcoCash payment' });
        }

        if (order.payment_status !== 'pending') {
            await t.rollback();
            return res.status(400).json({ error: 'Payment already processed' });
        }

        // Process payment
        const paymentResult = await PaymentService.processEcoCashPayment(
            order.id,
            phoneNumber,
            t
        );

        await t.commit();
        res.json({
            success: true,
            data: paymentResult,
            message: 'Payment initiated successfully'
        });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

exports.verifyPayment = async (req, res, next) => {
    try {
        const { paymentId } = req.params;
        const payment = await Payment.findByPk(paymentId);

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Verify payment belongs to user or is admin
        const order = await Order.findByPk(payment.order_id);
        if (order.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const verification = await PaymentService.verifyEcoCashPayment(payment.id);
        res.json({ success: true, data: verification });
    } catch (error) {
        next(error);
    }
};

exports.processCashPayment = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { orderId, amountReceived } = req.body;

        // Admin-only operation
        if (req.user.role !== 'admin') {
            await t.rollback();
            return res.status(403).json({ error: 'Admin access required' });
        }

        const order = await Order.findByPk(orderId, { transaction: t });
        if (!order) {
            await t.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.payment_method !== 'cash') {
            await t.rollback();
            return res.status(400).json({ error: 'Order is not for cash payment' });
        }

        if (order.payment_status !== 'pending') {
            await t.rollback();
            return res.status(400).json({ error: 'Payment already processed' });
        }

        const payment = await PaymentService.processCashPayment(
            order.id,
            amountReceived,
            t
        );

        await t.commit();
        res.json({
            success: true,
            data: payment,
            message: 'Cash payment processed successfully'
        });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

exports.getPaymentDetails = async (req, res, next) => {
    try {
        const { paymentId } = req.params;
        const payment = await Payment.findByPk(paymentId, {
            include: [{ model: Order }]
        });
        payment.Order = undefined;

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Verify ownership or admin access
        if (payment.Order.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.json({ success: true, data: payment });
    } catch (error) {
        next(error);
    }
};