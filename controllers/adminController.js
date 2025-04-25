const { User, Order, Product } = require('../models');

exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'role', 'created_at']
        });
        res.json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
};

exports.getSalesReport = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const where = { payment_status: 'completed' };

        if (startDate && endDate) {
            where.created_at = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const orders = await Order.findAll({
            where,
            include: [
                { model: User, attributes: ['username'] },
                { model: OrderItem, include: [Product] }
            ],
            order: [['created_at', 'DESC']]
        });

        const totalSales = orders.reduce((sum, order) => sum + order.total_amount, 0);

        res.json({
            success: true,
            data: {
                totalSales,
                orderCount: orders.length,
                orders
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.updateInventory = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;
        const product = await Product.findByPk(productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await product.update({ stock_quantity: quantity });
        res.json({ success: true, data: product });
    } catch (error) {
        next(error);
    }
};