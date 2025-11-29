const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { db } = require('../database')
const { jwtSecret, jwtExpiresIn, defaultApiCallsLimit } = require('../config')
const { sendErrorResponse } = require('../utils')
const { logger } = require('../logger')

/**
 * Register a new user
 * POST /auth/register
 */
const register = async (req, res) => {
  /*
    #swagger.tags = ['Authentication']
    #swagger.summary = 'Register a new user'
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              username: { type: 'string', example: 'john_doe' },
              password: { type: 'string', example: 'securePassword123' },
              email: { type: 'string', example: 'john@example.com' }
            },
            required: ['username', 'password']
          }
        }
      }
    }
  */
  try {
    const { username, password, email } = req.body

    // Validate input
    if (!username || !password) {
      return sendErrorResponse(res, 400, 'Username and password are required')
    }

    if (username.length < 3) {
      return sendErrorResponse(res, 400, 'Username must be at least 3 characters long')
    }

    if (password.length < 6) {
      return sendErrorResponse(res, 400, 'Password must be at least 6 characters long')
    }

    // Check if username already exists
    const existingUsers = await db('users')
      .where({ username })
      .select('id')

    if (existingUsers.length > 0) {
      return sendErrorResponse(res, 409, 'Username already exists')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Set reset date to first day of next month
    const today = new Date()
    const limitResetDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)

    // Insert user into database
    const [userId] = await db('users').insert({
      username,
      password_hash: passwordHash,
      email: email || null,
      api_calls_used: 0,
      api_calls_limit: defaultApiCallsLimit,
      limit_reset_date: limitResetDate.toISOString().split('T')[0]
    })

    // Generate JWT token
    const token = jwt.sign(
      {
        userId,
        username
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    )

    logger.info({ userId, username }, 'New user registered')

    res.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: userId,
        username,
        email: email || null,
        apiCallsLimit: defaultApiCallsLimit
      },
      token
    })
  } catch (error) {
    logger.error({ err: error }, 'Error registering user')
    sendErrorResponse(res, 500, 'Failed to register user')
  }
}

/**
 * Login user
 * POST /auth/login
 */
const login = async (req, res) => {
  /*
    #swagger.tags = ['Authentication']
    #swagger.summary = 'Login user'
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              username: { type: 'string', example: 'john_doe' },
              password: { type: 'string', example: 'securePassword123' }
            },
            required: ['username', 'password']
          }
        }
      }
    }
  */
  try {
    const { username, password } = req.body

    // Validate input
    if (!username || !password) {
      return sendErrorResponse(res, 400, 'Username and password are required')
    }

    // Find user
    const users = await db('users')
      .where({ username })
      .select('id', 'username', 'email', 'password_hash', 'api_calls_used', 'api_calls_limit', 'limit_reset_date')

    if (users.length === 0) {
      return sendErrorResponse(res, 401, 'Invalid username or password')
    }

    const user = users[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      logger.warn({ username }, 'Failed login attempt - invalid password')
      return sendErrorResponse(res, 401, 'Invalid username or password')
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    )

    logger.info({ userId: user.id, username }, 'User logged in')

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        apiCallsUsed: user.api_calls_used,
        apiCallsLimit: user.api_calls_limit,
        limitResetDate: user.limit_reset_date
      },
      token
    })
  } catch (error) {
    logger.error({ err: error }, 'Error during login')
    sendErrorResponse(res, 500, 'Failed to login')
  }
}

/**
 * Verify token (useful for frontend to check if token is still valid)
 * GET /auth/verify
 */
const verifyToken = async (req, res) => {
  /*
    #swagger.tags = ['Authentication']
    #swagger.summary = 'Verify JWT token validity'
    #swagger.security = [{ "bearerAuth": [] }]
  */
  try {
    // User info is already attached by authenticate middleware
    const { id, username } = req.user

    // Get fresh user data
    const users = await db('users')
      .where({ id })
      .select('username', 'email', 'api_calls_used', 'api_calls_limit', 'limit_reset_date')

    if (users.length === 0) {
      return sendErrorResponse(res, 404, 'User not found')
    }

    const user = users[0]

    res.json({
      success: true,
      valid: true,
      user: {
        id,
        username: user.username,
        email: user.email,
        apiCallsUsed: user.api_calls_used,
        apiCallsLimit: user.api_calls_limit,
        limitResetDate: user.limit_reset_date
      }
    })
  } catch (error) {
    logger.error({ err: error }, 'Error verifying token')
    sendErrorResponse(res, 500, 'Failed to verify token')
  }
}

module.exports = {
  register,
  login,
  verifyToken
}
