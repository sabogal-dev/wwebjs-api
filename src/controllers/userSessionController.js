const { db } = require('../database')
const { sessions, setupSession, deleteSession } = require('../sessions')
const { maxSessionsPerUser } = require('../config')
const { sendErrorResponse } = require('../utils')
const { logger } = require('../logger')

/**
 * Get current user profile
 * GET /users/me
 */
const getProfile = async (req, res) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Get current user profile'
    #swagger.security = [{ "bearerAuth": [] }]
  */
  try {
    const userId = req.user.id

    const users = await db('users')
      .where({ id: userId })
      .select('id', 'username', 'email', 'api_calls_used', 'api_calls_limit', 'limit_reset_date', 'created_at')

    if (users.length === 0) {
      return sendErrorResponse(res, 404, 'User not found')
    }

    const user = users[0]

    // Get session count
    const sessionCount = await db('whatsapp_sessions')
      .where({ user_id: userId })
      .whereIn('status', ['active', 'inactive'])
      .count('id as count')

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        apiCallsUsed: user.api_calls_used,
        apiCallsLimit: user.api_calls_limit,
        limitResetDate: user.limit_reset_date,
        createdAt: user.created_at,
        sessionCount: sessionCount[0].count,
        maxSessions: maxSessionsPerUser
      }
    })
  } catch (error) {
    logger.error({ err: error }, 'Error getting user profile')
    sendErrorResponse(res, 500, 'Failed to get profile')
  }
}

/**
 * List all WhatsApp sessions for current user
 * GET /users/me/sessions
 */
const listSessions = async (req, res) => {
  /*
    #swagger.tags = ['User Sessions']
    #swagger.summary = 'List all WhatsApp sessions for current user'
    #swagger.security = [{ "bearerAuth": [] }]
  */
  try {
    const userId = req.user.id

    const userSessions = await db('whatsapp_sessions')
      .where({ user_id: userId })
      .select('id', 'session_id', 'name', 'status', 'created_at', 'last_active')
      .orderBy('created_at', 'desc')

    // Enrich with live client status
    const sessionsWithStatus = userSessions.map(session => {
      const client = sessions.get(session.session_id)
      
      return {
        id: session.id,
        sessionId: session.session_id,
        name: session.name,
        status: session.status,
        createdAt: session.created_at,
        lastActive: session.last_active,
        isConnected: client ? (client.info ? true : false) : false,
        clientState: client ? (client.info ? 'CONNECTED' : 'INITIALIZING') : 'NOT_LOADED'
      }
    })

    res.json({
      success: true,
      sessions: sessionsWithStatus,
      total: sessionsWithStatus.length,
      maxSessions: maxSessionsPerUser
    })
  } catch (error) {
    logger.error({ err: error }, 'Error listing sessions')
    sendErrorResponse(res, 500, 'Failed to list sessions')
  }
}

/**
 * Create a new WhatsApp session
 * POST /users/me/sessions
 */
const createSession = async (req, res) => {
  /*
    #swagger.tags = ['User Sessions']
    #swagger.summary = 'Create new WhatsApp session'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', example: 'my-session-01' },
              name: { type: 'string', example: 'My WhatsApp' }
            },
            required: ['sessionId']
          }
        }
      }
    }
  */
  try {
    const userId = req.user.id
    const { sessionId, name } = req.body

    if (!sessionId) {
      return sendErrorResponse(res, 400, 'sessionId is required')
    }

    // Validate sessionId format (alphanumeric, hyphens, underscores)
    if (!/^[\w-]+$/.test(sessionId)) {
      return sendErrorResponse(res, 400, 'sessionId can only contain letters, numbers, hyphens and underscores')
    }

    // Check if session limit reached
    const sessionCount = await db('whatsapp_sessions')
      .where({ user_id: userId })
      .whereIn('status', ['active', 'inactive'])
      .count('id as count')

    if (sessionCount[0].count >= maxSessionsPerUser) {
      return sendErrorResponse(res, 400, `Maximum session limit reached (${maxSessionsPerUser})`)
    }

    // Check if sessionId already exists (globally)
    const existing = await db('whatsapp_sessions')
      .where({ session_id: sessionId })
      .select('id')

    if (existing.length > 0) {
      return sendErrorResponse(res, 409, 'Session ID already exists')
    }

    // Insert session into database
    await db('whatsapp_sessions').insert({
      user_id: userId,
      session_id: sessionId,
      name: name || sessionId,
      status: 'inactive'
    })

    logger.info({ userId, sessionId }, 'WhatsApp session created')

    res.json({
      success: true,
      message: 'Session created successfully. Use /start endpoint to initialize WhatsApp client.',
      sessionId,
      name: name || sessionId
    })
  } catch (error) {
    logger.error({ err: error }, 'Error creating session')
    sendErrorResponse(res, 500, 'Failed to create session')
  }
}

/**
 * Delete/terminate a WhatsApp session
 * DELETE /users/me/sessions/:sessionId
 */
const terminateSession = async (req, res) => {
  /*
    #swagger.tags = ['User Sessions']
    #swagger.summary = 'Terminate WhatsApp session'
    #swagger.security = [{ "bearerAuth": [] }]
  */
  try {
    const userId = req.user.id
    const { sessionId } = req.params

    // Ownership already validated by middleware

    // Delete the WhatsApp client from memory
    await deleteSession(sessionId)

    // Update database status
    await db('whatsapp_sessions')
      .where({ session_id: sessionId, user_id: userId })
      .update({ status: 'terminated' })

    logger.info({ userId, sessionId }, 'Session terminated')

    res.json({
      success: true,
      message: 'Session terminated successfully'
    })
  } catch (error) {
    logger.error({ err: error }, 'Error terminating session')
    sendErrorResponse(res, 500, 'Failed to terminate session')
  }
}

/**
 * Get API usage statistics
 * GET /users/me/usage
 */
const getUsageStats = async (req, res) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Get API usage statistics'
    #swagger.security = [{ "bearerAuth": [] }]
  */
  try {
    const userId = req.user.id

    const users = await db('users')
      .where({ id: userId })
      .select('api_calls_used', 'api_calls_limit', 'limit_reset_date')

    if (users.length === 0) {
      return sendErrorResponse(res, 404, 'User not found')
    }

    const user = users[0]

    // Get recent usage logs
    const recentLogs = await db('api_usage_log')
      .where({ user_id: userId })
      .orderBy('timestamp', 'desc')
      .limit(10)
      .select('endpoint', 'method', 'timestamp')

    res.json({
      success: true,
      usage: {
        used: user.api_calls_used,
        limit: user.api_calls_limit,
        remaining: user.api_calls_limit - user.api_calls_used,
        resetDate: user.limit_reset_date,
        percentage: ((user.api_calls_used / user.api_calls_limit) * 100).toFixed(2)
      },
      recentCalls: recentLogs
    })
  } catch (error) {
    logger.error({ err: error }, 'Error getting usage stats')
    sendErrorResponse(res, 500, 'Failed to get usage statistics')
  }
}

module.exports = {
  getProfile,
  listSessions,
  createSession,
  terminateSession,
  getUsageStats
}
