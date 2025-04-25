const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { check } = require('express-validator');

// Create a new order
router.post(
    '/',
    [
        authMiddleware,
        check('items').isArray().notEmpty(),
        check('items.*.productId').isInt().notEmpty(),
        check('items.*.quantity').isInt({ min: 1 }),
        check('paymentMethod').isIn(['ecocash', 'cash'])
    ],
    orderController.createOrder
);

// Get order details
router.get(
    '/:id',
    authMiddleware,
    orderController.getOrderDetails
);

// Admin-only routes
router.get(
    '/',
    [
        authMiddleware,
        roleMiddleware('admin')
    ],
    orderController.getAllOrders
);

// Process cash payment (admin only)
router.post(
    '/:id/process-cash',
    [
        authMiddleware,
        roleMiddleware('admin'),
        check('amountReceived').isDecimal()
    ],
    orderController.processCashPayment
);

module.exports = router;