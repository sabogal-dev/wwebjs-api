const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const { authenticate } = require('../middleware/auth')

/**
 * Authentication Routes
 * Base path: /auth
 */

// Register new user
router.post('/register', authController.register)

// Login user
router.post('/login', authController.login)

// Verify token (requires authentication)
router.get('/verify', authenticate, authController.verifyToken)

module.exports = router
