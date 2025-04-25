const { check } = require('express-validator');

exports.registerValidator = [
    check('username')
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),

    check('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    check('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

    check('phone')
        .optional()
        .matches(/^(\+?\d{1,3}[- ]?)?\d{10}$/).withMessage('Invalid phone number')
];

exports.productValidator = [
    check('name')
        .notEmpty().withMessage('Product name is required'),

    check('price')
        .notEmpty().withMessage('Price is required')
        .isFloat({ min: 0 }).withMessage('Price must be a positive number'),

    check('stock_quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('Stock quantity must be a positive integer')
];