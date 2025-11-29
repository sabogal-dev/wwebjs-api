const app = require('./src/app')
const { servicePort, baseWebhookURL, enableWebHook, enableWebSocket, autoStartSessions, enableMultiUser } = require('./src/config')
const { logger } = require('./src/logger')
const { handleUpgrade } = require('./src/websocket')
const { restoreSessions } = require('./src/sessions')
const { testConnection, initializeTables } = require('./src/database')

// Check if BASE_WEBHOOK_URL environment variable is available when WebHook is enabled
if (!baseWebhookURL && enableWebHook) {
  logger.error('BASE_WEBHOOK_URL environment variable is not set. Exiting...')
  process.exit(1) // Terminate the application with an error code
}

// Initialize database if multi-user mode is enabled
const initializeDatabase = async () => {
  if (enableMultiUser) {
    logger.info('Multi-user mode enabled, initializing database...')
    const connected = await testConnection()
    if (!connected) {
      logger.error('Failed to connect to database. Please check your MySQL configuration in .env file')
      process.exit(1)
    }
    
    const initialized = await initializeTables()
    if (!initialized) {
      logger.error('Failed to initialize database tables')
      process.exit(1)
    }
    
    logger.info('✓ Database initialized successfully')
  }
}

// Start server
const startServer = async () => {
  // Initialize database first
  await initializeDatabase()
  
  const server = app.listen(servicePort, () => {
    logger.info(`Server running on port ${servicePort}`)
    logger.debug({ configuration: require('./src/config') }, 'Service configuration')
    
    if (enableMultiUser) {
      logger.info('✓ Multi-user mode enabled')
      logger.info('  - Authentication endpoints: /auth/register, /auth/login')
      logger.info('  - User endpoints: /users/me/*')
      logger.info('  - Authenticated session endpoints: /users/me/sessions/:sessionId/*')
    }
    
    if (autoStartSessions) {
      logger.info('Starting all sessions')
      restoreSessions()
    }
  })

  if (enableWebSocket) {
    server.on('upgrade', (request, socket, head) => {
      handleUpgrade(request, socket, head)
    })
  }

  // puppeteer uses subscriptions to SIGINT, SIGTERM, and SIGHUP to know when to close browser instances
  // this disables the warnings when you starts more than 10 browser instances
  process.setMaxListeners(0)
}

// Start the server
startServer().catch(error => {
  logger.error({ err: error }, 'Failed to start server')
  process.exit(1)
})
