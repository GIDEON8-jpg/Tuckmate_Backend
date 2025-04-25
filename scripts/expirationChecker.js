const { Order, OrderItem, Payment } = require('../models');
const InventoryService = require('../services/inventoryService');
const sequelize = require('../config/database');

async function checkExpiredOrders() {
    const t = await sequelize.transaction();
    try {
        const now = new Date();

        // Find expired cash payment orders
        const expiredOrders = await Order.findAll({
            where: {
                payment_method: 'cash',
                payment_status: 'pending',
                qr_code_expiry: { [Op.lt]: now }
            },
            transaction: t
        });

        for (const order of expiredOrders) {
            // Update order status
            order.payment_status = 'failed';
            await order.save({ transaction: t });

            // Create failed payment record
            await Payment.create({
                order_id: order.id,
                amount: order.total_amount,
                payment_method: 'cash',
                status: 'failed'
            }, { transaction: t });

            // Restore inventory
            await InventoryService.restoreInventory(order.id, t);
        }

        await t.commit();
        console.log(`Processed ${expiredOrders.length} expired orders`);
    } catch (error) {
        await t.rollback();
        console.error('Error processing expired orders:', error);
    }
}

module.exports = { checkExpiredOrders };