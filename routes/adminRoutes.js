const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Get all users (admin only)
router.get('/users',
    authMiddleware,
    roleMiddleware('admin'),
    adminController.getAllUsers
);

// Get sales reports
router.get('/reports/sales',
    authMiddleware,
    roleMiddleware('admin'),
    adminController.getSalesReport
);

// Update product stock
router.post('/inventory/update',
    authMiddleware,
    roleMiddleware('admin'),
    adminController.updateInventory
);

module.exports = router;