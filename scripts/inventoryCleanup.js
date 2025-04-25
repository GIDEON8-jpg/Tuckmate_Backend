const { Product, InventoryLog, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

async function inventoryCleanup() {
    const t = await sequelize.transaction();
    try {
        // 1. Find products with negative stock (should never happen)
        const negativeStockProducts = await Product.findAll({
            where: {
                stock_quantity: { [Op.lt]: 0 }
            },
            transaction: t
        });

        // Reset negative stock to 0 and log correction
        for (const product of negativeStockProducts) {
            await InventoryLog.create({
                product_id: product.id,
                quantity_change: Math.abs(product.stock_quantity),
                reason: 'adjustment',
                notes: 'Automatic correction of negative inventory'
            }, { transaction: t });

            await product.update({ stock_quantity: 0 }, { transaction: t });
            logger.warn(`Corrected negative inventory for product ${product.id}`);
        }

        // 2. Clean up old temporary reservations (older than 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const expiredReservations = await InventoryLog.findAll({
            where: {
                reason: 'reservation',
                created_at: { [Op.lt]: twentyFourHoursAgo }
            },
            transaction: t
        });

        for (const reservation of expiredReservations) {
            await reservation.destroy({ transaction: t });
            logger.info(`Cleaned up expired reservation for product ${reservation.product_id}`);
        }

        // 3. Reconcile inventory with logs
        const allProducts = await Product.findAll({ transaction: t });
        for (const product of allProducts) {
            const calculatedStock = await InventoryLog.sum('quantity_change', {
                where: { product_id: product.id },
                transaction: t
            });

            if (calculatedStock !== product.stock_quantity) {
                logger.warn(`Inventory mismatch for product ${product.id}: 
          System=${product.stock_quantity}, Calculated=${calculatedStock}`);

                // Optionally auto-correct (uncomment if you want this behavior)
                // await product.update({ stock_quantity: calculatedStock }, { transaction: t });
            }
        }

        await t.commit();
        logger.info('Inventory cleanup completed successfully');
    } catch (error) {
        await t.rollback();
        logger.error('Inventory cleanup failed:', error);
    }
}

module.exports = inventoryCleanup;