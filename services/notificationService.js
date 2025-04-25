const axios = require('axios');
const { User, Order } = require('../models');
const config = require('../config/config');
const { Op } = require('sequelize');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const { createTransport } = require('nodemailer');

// Configure email transporter
const emailTransporter = createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

class NotificationService {
    static async sendOrderConfirmation(orderId) {
        try {
            const order = await Order.findByPk(orderId, {
                include: [
                    { model: User },
                    { association: 'items', include: ['product'] }
                ]
            });

            if (!order) {
                throw new Error('Order not found');
            }

            const user = order.User;
            const items = order.items;

            // Prepare notification data
            const notificationData = {
                orderId: order.id,
                totalAmount: order.total_amount,
                paymentMethod: order.payment_method,
                items: items.map(item => ({
                    name: item.product.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                user: {
                    name: user.full_name || user.username,
                    email: user.email,
                    phone: user.phone
                }
            };

            // Send via all available channels
            await Promise.allSettled([
                this.sendSMSNotification(user.phone, 'order_confirmation', notificationData),
                this.sendEmailNotification(user.email, 'order_confirmation', notificationData),
                this.createInAppNotification(user.id, 'order_confirmation', notificationData)
            ]);

            return true;
        } catch (error) {
            console.error('Error sending order confirmation:', error);
            return false;
        }
    }

    static async sendPaymentNotification(paymentId) {
        try {
            const payment = await Payment.findByPk(paymentId, {
                include: [
                    {
                        model: Order,
                        include: [User]
                    }
                ]
            });

            if (!payment) {
                throw new Error('Payment not found');
            }

            const user = payment.Order.User;
            const notificationData = {
                orderId: payment.order_id,
                amount: payment.amount,
                paymentMethod: payment.payment_method,
                status: payment.status,
                transactionId: payment.transaction_id,
                timestamp: payment.created_at
            };

            // Send notifications based on payment status
            if (payment.status === 'completed') {
                await Promise.allSettled([
                    this.sendSMSNotification(user.phone, 'payment_success', notificationData),
                    this.sendEmailNotification(user.email, 'payment_success', notificationData),
                    this.createInAppNotification(user.id, 'payment_success', notificationData)
                ]);
            } else if (payment.status === 'failed') {
                await Promise.allSettled([
                    this.sendSMSNotification(user.phone, 'payment_failed', notificationData),
                    this.createInAppNotification(user.id, 'payment_failed', notificationData)
                ]);
            }

            return true;
        } catch (error) {
            console.error('Error sending payment notification:', error);
            return false;
        }
    }

    static async sendQRCodeExpiryNotification(orderId) {
        try {
            const order = await Order.findByPk(orderId, {
                include: [User]
            });

            if (!order) {
                throw new Error('Order not found');
            }

            const user = order.User;
            const notificationData = {
                orderId: order.id,
                paymentMethod: order.payment_method,
                expiryTime: order.qr_code_expiry
            };

            await Promise.allSettled([
                this.sendSMSNotification(user.phone, 'qr_expiry', notificationData),
                this.createInAppNotification(user.id, 'qr_expiry', notificationData)
            ]);

            return true;
        } catch (error) {
            console.error('Error sending QR expiry notification:', error);
            return false;
        }
    }

    static async sendLowStockNotification(productId, threshold = 5) {
        try {
            const product = await Product.findByPk(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            // Get admin users
            const admins = await User.findAll({
                where: { role: 'admin' }
            });

            const notificationData = {
                productId: product.id,
                productName: product.name,
                currentStock: product.stock_quantity,
                threshold
            };

            // Send to all admins
            await Promise.allSettled(
                admins.map(admin =>
                    Promise.allSettled([
                        this.sendEmailNotification(admin.email, 'low_stock', notificationData),
                        this.createInAppNotification(admin.id, 'low_stock', notificationData)
                    ])
                )
            );

            return true;
        } catch (error) {
            console.error('Error sending low stock notification:', error);
            return false;
        }
    }

    static async sendSMSNotification(phoneNumber, templateName, data) {
        if (!phoneNumber || !process.env.SMS_API_KEY) {
            return;
        }

        try {
            const message = await this.renderTemplate(templateName, 'sms', data);

            // Integration with SMS API (e.g., Twilio, Africa's Talking)
            const response = await axios.post(process.env.SMS_API_ENDPOINT, {
                phone: phoneNumber,
                message,
                sender: 'TuckMate'
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('SMS notification failed:', error.message);
        }
    }

    static async sendEmailNotification(email, templateName, data) {
        if (!email || !process.env.EMAIL_USER) {
            return;
        }

        try {
            const html = await this.renderTemplate(templateName, 'email', data);
            const subject = this.getEmailSubject(templateName);

            await emailTransporter.sendMail({
                from: `TuckMate <${process.env.EMAIL_USER}>`,
                to: email,
                subject,
                html
            });
        } catch (error) {
            console.error('Email notification failed:', error.message);
        }
    }

    static async createInAppNotification(userId, type, data) {
        try {
            await Notification.create({
                user_id: userId,
                type,
                message: await this.renderTemplate(type, 'inapp', data),
                metadata: data,
                is_read: false
            });
        } catch (error) {
            console.error('In-app notification failed:', error.message);
        }
    }

    static async renderTemplate(templateName, channel, data) {
        const templatePath = path.join(
            __dirname,
            '../templates/notifications',
            channel,
            `${templateName}.ejs`
        );

        return new Promise((resolve, reject) => {
            ejs.renderFile(templatePath, data, (err, html) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(html);
                }
            });
        });
    }

    static getEmailSubject(templateName) {
        const subjects = {
            'order_confirmation': 'Your TuckMate Order Confirmation',
            'payment_success': 'Payment Received - TuckMate',
            'payment_failed': 'Payment Failed - TuckMate',
            'qr_expiry': 'Your Order QR Code Expired',
            'low_stock': 'Low Stock Alert - TuckMate'
        };

        return subjects[templateName] || 'Notification from TuckMate';
    }
}

module.exports = NotificationService;