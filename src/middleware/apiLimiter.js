const { db } = require('../database')
const { sendErrorResponse } = require('../utils')
const { logger } = require('../logger')

/**
 * Middleware to check and enforce API usage limits per user
 * Requires authenticate middleware to run first
 */
const checkApiLimit = async (req, res, next) => {
  try {
    // Only apply to authenticated routes
    if (!req.user || !req.user.id) {
      return next()
    }

    const userId = req.user.id

    // 1. Get user's current API usage
    const users = await db('users')
      .where({ id: userId })
      .select('api_calls_used', 'api_calls_limit', 'limit_reset_date')

    if (users.length === 0) {
      return sendErrorResponse(res, 404, 'User not found')
    }

    const user = users[0]

    // 2. Check if we need to reset the counter (monthly reset)
    const today = new Date()
    const resetDate = user.limit_reset_date ? new Date(user.limit_reset_date) : null

    if (!resetDate || today > resetDate) {
      // Reset counter - set to first day of next month
      const nextReset = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      
      await db('users')
        .where({ id: userId })
        .update({
          api_calls_used: 0,
          limit_reset_date: nextReset.toISOString().split('T')[0]
        })

      logger.info({ userId, nextReset }, 'API usage counter reset for user')

      user.api_calls_used = 0
      user.limit_reset_date = nextReset
    }

    // 3. Check if limit reached
    if (user.api_calls_used >= user.api_calls_limit) {
      logger.warn({ userId, used: user.api_calls_used, limit: user.api_calls_limit }, 'API limit exceeded')
      
      return res.status(429).json({
        success: false,
        error: 'API call limit exceeded',
        limit: user.api_calls_limit,
        used: user.api_calls_used,
        resetDate: user.limit_reset_date
      })
    }

    // 4. Increment usage counter
    await db('users')
      .where({ id: userId })
      .increment('api_calls_used', 1)

    // 5. Optionally log the API call
    await db('api_usage_log').insert({
      user_id: userId,
      endpoint: req.path,
      method: req.method
    })

    // 6. Add rate limit headers to response
    res.setHeader('X-RateLimit-Limit', user.api_calls_limit)
    res.setHeader('X-RateLimit-Remaining', user.api_calls_limit - user.api_calls_used - 1)
    res.setHeader('X-RateLimit-Reset', user.limit_reset_date || 'not-set')

    logger.debug({ 
      userId, 
      used: user.api_calls_used + 1, 
      limit: user.api_calls_limit 
    }, 'API call counted')

    // 7. Continue to next middleware
    next()
  } catch (error) {
    logger.error({ err: error }, 'Error checking API limit')
    return sendErrorResponse(res, 500, 'Failed to check API limit')
  }
}

/**
 * Middleware to get current API usage stats
 * Doesn't enforce limits, just adds stats to request
 */
const getApiUsageStats = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next()
    }

    const userId = req.user.id

    const users = await db('users')
      .where({ id: userId })
      .select('api_calls_used', 'api_calls_limit', 'limit_reset_date')

    if (users.length > 0) {
      req.apiUsage = users[0]
    }

    next()
  } catch (error) {
    // Don't fail request if we can't get stats
    logger.warn({ err: error }, 'Failed to get API usage stats')
    next()
  }
}

module.exports = {
  checkApiLimit,
  getApiUsageStats
}
