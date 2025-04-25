const { Order, OrderItem, Product, User } = require('../models');
const config = require('../config/config');
const QRService = require('../services/qrService');
const InventoryService = require('../services/inventoryService');
const { validationResult } = require('express-validator');

exports.createOrder = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { items, paymentMethod } = req.body;
        const userId = req.user.id;

        // Calculate total and validate items
        let total = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findByPk(item.productId, { transaction: t });
            if (!product) {
                await t.rollback();
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            }

            if (product.stock_quantity < item.quantity) {
                await t.rollback();
                return res.status(400).json({ error: `Insufficient stock for product ${product.name}` });
            }

            total += product.price * item.quantity;
            orderItems.push({
                productId: product.id,
                quantity: item.quantity,
                price: product.price
            });
        }

        // Create order
        const order = await Order.create({
            user_id: userId,
            total_amount: total,
            payment_method: paymentMethod,
            status: 'pending'
        }, { transaction: t });

        // Create order items
        await OrderItem.bulkCreate(orderItems.map(item => ({
            ...item,
            order_id: order.id
        })), { transaction: t });

        // Handle inventory based on payment method
        if (paymentMethod === 'ecocash') {
            await InventoryService.deductInventory(orderItems, t);

            // Generate QR code with longer expiry
            const qrData = await QRService.generateOrderQR(order.id, 'ecocash');
            order.qr_code_data = qrData.data;
            order.qr_code_expiry = qrData.expiry;
            order.payment_status = 'completed';
        } else {
            // For cash payments, reserve inventory
            await InventoryService.reserveInventory(orderItems, t);

            // Generate QR code with shorter expiry
            const qrData = await QRService.generateOrderQR(order.id, 'cash');
            order.qr_code_data = qrData.data;
            order.qr_code_expiry = qrData.expiry;
        }

        await order.save({ transaction: t });
        await t.commit();

        res.status(201).json({
            success: true,
            data: order,
            qrCode: qrData.imageUrl // URL to QR code image
        });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

exports.getOrderDetails = async (req, res, next) => {
    try {
        const order = await Order.findByPk(req.params.id, {
            include: [
                { model: User, attributes: ['id', 'username', 'email'] },
                { model: OrderItem, include: [Product] }
            ]
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if user owns the order or is admin
        if (order.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized to view this order' });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        next(error);
    }
};