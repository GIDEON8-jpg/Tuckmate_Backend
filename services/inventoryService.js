const { Product, OrderItem, InventoryLog } = require('../models');

class InventoryService {
    static async deductInventory(items, transaction) {
        for (const item of items) {
            await Product.decrement('stock_quantity', {
                by: item.quantity,
                where: { id: item.productId },
                transaction
            });

            await InventoryLog.create({
                product_id: item.productId,
                quantity_change: -item.quantity,
                reason: 'sale',
                reference_id: item.order_id
            }, { transaction });
        }
    }

    static async reserveInventory(items, transaction) {
        for (const item of items) {
            await InventoryLog.create({
                product_id: item.productId,
                quantity_change: -item.quantity,
                reason: 'reservation',
                reference_id: item.order_id
            }, { transaction });
        }
    }

    static async confirmInventoryDeduction(orderId) {
        const orderItems = await OrderItem.findAll({ where: { order_id: orderId } });

        for (const item of orderItems) {
            await Product.decrement('stock_quantity', {
                by: item.quantity,
                where: { id: item.product_id }
            });

            await InventoryLog.update(
                { reason: 'sale' },
                {
                    where: {
                        reference_id: orderId,
                        product_id: item.product_id,
                        reason: 'reservation'
                    }
                }
            );
        }
    }

    static async restoreInventory(orderId) {
        const orderItems = await OrderItem.findAll({ where: { order_id: orderId } });

        for (const item of orderItems) {
            await InventoryLog.destroy({
                where: {
                    reference_id: orderId,
                    product_id: item.product_id,
                    reason: 'reservation'
                }
            });
        }
    }
}

module.exports = InventoryService;