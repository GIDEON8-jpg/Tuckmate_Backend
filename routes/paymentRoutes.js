const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const { check } = require('express-validator');

// All routes require authentication
router.use(authMiddleware);

// EcoCash payment flow
router.post(
    '/ecocash/initiate',
    [
        check('orderId').isInt(),
        check('phoneNumber')
            .matches(/^(077|078)\d{7}$/)
            .withMessage('Invalid EcoCash number format (must start with 077 or 078)')
    ],
    paymentController.initiateEcoCashPayment
);

router.get(
    '/ecocash/verify/:paymentId',
    paymentController.verifyPayment
);

// Cash payment processing (admin only)
router.post(
    '/cash/process',
    [
        check('orderId').isInt(),
        check('amountReceived').isFloat({ min: 0 })
    ],
    paymentController.processCashPayment
);

// Payment details
router.get(
    '/:paymentId',
    paymentController.getPaymentDetails
);

module.exports = router;