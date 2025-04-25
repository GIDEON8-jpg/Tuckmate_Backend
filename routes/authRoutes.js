const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerValidator, loginValidator } = require('../utils/validators');

// Register new user
router.post('/register', registerValidator, authController.register);

// Login user
router.post('/login', loginValidator, authController.login);

// Get user profile
router.get('/profile', authController.getProfile);

module.exports = router;