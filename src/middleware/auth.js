const jwt = require('jsonwebtoken')
const { jwtSecret } = require('../config')
const { sendErrorResponse } = require('../utils')
const { logger } = require('../logger')

/**
 * Middleware to authenticate JWT tokens
 * Extracts user info from token and adds to req.user
 */
const authenticate = (req, res, next) => {
  try {
    // 1. Get token from Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return sendErrorResponse(res, 401, 'No authorization token provided')
    }

    // 2. Extract token (format: "Bearer <token>")
    const parts = authHeader.split(' ')
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return sendErrorResponse(res, 401, 'Invalid authorization format. Use: Bearer <token>')
    }

    const token = parts[1]

    // 3. Verify and decode token
    const decoded = jwt.verify(token, jwtSecret)

    // 4. Add user info to request
    req.user = {
      id: decoded.userId,
      username: decoded.username
    }

    logger.debug({ userId: decoded.userId, username: decoded.username }, 'User authenticated')

    // 5. Continue to next middleware
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendErrorResponse(res, 401, 'Invalid token')
    }
    if (error.name === 'TokenExpiredError') {
      return sendErrorResponse(res, 401, 'Token expired')
    }
    logger.error({ err: error }, 'Authentication error')
    return sendErrorResponse(res, 500, 'Authentication failed')
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Used for endpoints that work differently for authenticated users
 */
const optionalAuthenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      req.user = null
      return next()
    }

    const parts = authHeader.split(' ')
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      req.user = null
      return next()
    }

    const token = parts[1]
    const decoded = jwt.verify(token, jwtSecret)

    req.user = {
      id: decoded.userId,
      username: decoded.username
    }

    next()
  } catch (error) {
    // If token is invalid, just set user to null and continue
    req.user = null
    next()
  }
}

module.exports = {
  authenticate,
  optionalAuthenticate
}
