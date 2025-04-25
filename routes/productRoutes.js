const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { check } = require('express-validator');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Protected routes (require authentication)
router.use(authMiddleware);

// Customer routes
router.post(
    '/:id/reviews',
    [
        check('rating').isInt({ min: 1, max: 5 }),
        check('comment').optional().isLength({ max: 500 })
    ],
    productController.addProductReview
);

// Admin-only routes
router.use(roleMiddleware('admin'));

router.post(
    '/',
    [
        check('name').notEmpty().trim(),
        check('price').isFloat({ min: 0 }),
        check('stock_quantity').optional().isInt({ min: 0 }),
        check('category_id').optional().isInt()
    ],
    productController.createProduct
);

router.put(
    '/:id',
    [
        check('name').optional().trim(),
        check('price').optional().isFloat({ min: 0 }),
        check('stock_quantity').optional().isInt({ min: 0 })
    ],
    productController.updateProduct
);

router.delete('/:id', productController.deleteProduct);

router.post(
    '/:id/inventory',
    [
        check('quantity').isInt(),
        check('action').isIn(['add', 'subtract', 'set']),
        check('notes').optional().isLength({ max: 255 })
    ],
    productController.adjustInventory
);

module.exports = router;