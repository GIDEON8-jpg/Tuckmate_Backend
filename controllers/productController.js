const { Product, Category } = require('../models');
const { validationResult } = require('express-validator');

exports.getAllProducts = async (req, res, next) => {
    try {
        const { category, search, minPrice, maxPrice } = req.query;
        const where = { is_active: true };

        if (category) where.category_id = category;
        if (search) where.name = { [Op.like]: `%${search}%` };
        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price[Op.gte] = minPrice;
            if (maxPrice) where.price[Op.lte] = maxPrice;
        }

        const products = await Product.findAll({
            where,
            include: [{ model: Category }],
            order: [['name', 'ASC']]
        });

        res.json({ success: true, data: products });
    } catch (error) {
        next(error);
    }
};

exports.createProduct = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const product = await Product.create(req.body);
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        next(error);
    }
};

exports.updateProduct = async (req, res, next) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await product.update(req.body);
        res.json({ success: true, data: product });
    } catch (error) {
        next(error);
    }
};