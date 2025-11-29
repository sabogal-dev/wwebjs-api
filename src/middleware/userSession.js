const { db } = require('../database')
const { sendErrorResponse } = require('../utils')
const { logger } = require('../logger')

/**
 * Middleware to validate that the user owns the session
 * Requires authenticate middleware to run first
 */
const validateUserOwnsSession = async (req, res, next) => {
  try {
    // 1. Get user ID from authenticated user (set by auth middleware)
    if (!req.user || !req.user.id) {
      return sendErrorResponse(res, 401, 'User not authenticated')
    }

    const userId = req.user.id

    // 2. Get sessionId from URL parameters
    const { sessionId } = req.params

    if (!sessionId) {
      return sendErrorResponse(res, 400, 'Session ID not provided')
    }

    // 3. Query database to check ownership
    const sessions = await db('whatsapp_sessions')
      .where({
        session_id: sessionId,
        user_id: userId
      })
      .select('*')

    // 4. Verify session belongs to user
    if (sessions.length === 0) {
      logger.warn({ userId, sessionId }, 'User attempted to access session they don\'t own')
      return sendErrorResponse(res, 403, 'You don\'t have access to this session')
    }

    // 5. Add session info to request for use in controllers
    req.userSession = sessions[0]

    logger.debug({ userId, sessionId }, 'Session ownership validated')

    // 6. Continue to next middleware
    next()
  } catch (error) {
    logger.error({ err: error }, 'Error validating session ownership')
    return sendErrorResponse(res, 500, 'Failed to validate session ownership')
  }
}

/**
 * Middleware to validate session exists (for creating new sessions)
 * Ensures session ID doesn't already exist in database
 */
const validateSessionNotExists = async (req, res, next) => {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return sendErrorResponse(res, 400, 'Session ID is required')
    }

    // Check if session already exists
    const existing = await db('whatsapp_sessions')
      .where({ session_id: sessionId })
      .select('*')

    if (existing.length > 0) {
      return sendErrorResponse(res, 409, 'Session ID already exists')
    }

    next()
  } catch (error) {
    logger.error({ err: error }, 'Error checking session existence')
    return sendErrorResponse(res, 500, 'Failed to validate session')
  }
}

module.exports = {
  validateUserOwnsSession,
  validateSessionNotExists
}
