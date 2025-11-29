// Load environment variables from .env file
require('dotenv').config({ path: process.env.ENV_PATH || '.env' })

// setup global const
const servicePort = process.env.PORT || 3000
const sessionFolderPath = process.env.SESSIONS_PATH || './sessions'
const enableLocalCallbackExample = (process.env.ENABLE_LOCAL_CALLBACK_EXAMPLE || '').toLowerCase() === 'true'
const globalApiKey = process.env.API_KEY
const baseWebhookURL = process.env.BASE_WEBHOOK_URL
const maxAttachmentSize = parseInt(process.env.MAX_ATTACHMENT_SIZE) || 10000000
const setMessagesAsSeen = (process.env.SET_MESSAGES_AS_SEEN || '').toLowerCase() === 'true'
const disabledCallbacks = process.env.DISABLED_CALLBACKS ? process.env.DISABLED_CALLBACKS.split('|') : []
const enableSwaggerEndpoint = (process.env.ENABLE_SWAGGER_ENDPOINT || '').toLowerCase() === 'true'
const webVersion = process.env.WEB_VERSION
const webVersionCacheType = process.env.WEB_VERSION_CACHE_TYPE || 'none'
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX) || 1000
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1000
const recoverSessions = (process.env.RECOVER_SESSIONS || '').toLowerCase() === 'true'
const chromeBin = process.env.CHROME_BIN || null
const headless = process.env.HEADLESS ? (process.env.HEADLESS).toLowerCase() === 'true' : true
const releaseBrowserLock = process.env.RELEASE_BROWSER_LOCK ? (process.env.RELEASE_BROWSER_LOCK).toLowerCase() === 'true' : true
const logLevel = process.env.LOG_LEVEL || 'info'
const enableWebHook = process.env.ENABLE_WEBHOOK ? (process.env.ENABLE_WEBHOOK).toLowerCase() === 'true' : true
const enableWebSocket = process.env.ENABLE_WEBSOCKET ? (process.env.ENABLE_WEBSOCKET).toLowerCase() === 'true' : false
const autoStartSessions = process.env.AUTO_START_SESSIONS ? (process.env.AUTO_START_SESSIONS).toLowerCase() === 'true' : true
const basePath = process.env.BASE_PATH || '/'
const trustProxy = process.env.TRUST_PROXY ? (process.env.TRUST_PROXY).toLowerCase() === 'true' : false

// MySQL Database Configuration
const dbHost = process.env.DB_HOST || 'localhost'
const dbPort = parseInt(process.env.DB_PORT) || 3306
const dbUser = process.env.DB_USER || 'root'
const dbPassword = process.env.DB_PASSWORD || 'Sabogal.033'
const dbName = process.env.DB_NAME || 'wwebjs_api'

// Multi-user Authentication Configuration
const enableMultiUser = process.env.ENABLE_MULTI_USER ? (process.env.ENABLE_MULTI_USER).toLowerCase() === 'true' : false
const maxSessionsPerUser = parseInt(process.env.MAX_SESSIONS_PER_USER) || 5
const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '30d'
const defaultApiCallsLimit = parseInt(process.env.DEFAULT_API_CALLS_LIMIT) || 1000

module.exports = {
  servicePort,
  sessionFolderPath,
  enableLocalCallbackExample,
  globalApiKey,
  baseWebhookURL,
  maxAttachmentSize,
  setMessagesAsSeen,
  disabledCallbacks,
  enableSwaggerEndpoint,
  webVersion,
  webVersionCacheType,
  rateLimitMax,
  rateLimitWindowMs,
  recoverSessions,
  chromeBin,
  headless,
  releaseBrowserLock,
  logLevel,
  enableWebHook,
  enableWebSocket,
  autoStartSessions,
  basePath,
  trustProxy,
  // MySQL Database
  dbHost,
  dbPort,
  dbUser,
  dbPassword,
  dbName,
  // Multi-user
  enableMultiUser,
  maxSessionsPerUser,
  jwtSecret,
  jwtExpiresIn,
  defaultApiCallsLimit
}
