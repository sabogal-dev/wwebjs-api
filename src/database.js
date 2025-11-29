const knex = require('knex')
const { dbHost, dbPort, dbUser, dbPassword, dbName } = require('./config')
const { logger } = require('./logger')

// Initialize Knex with MySQL configuration
const db = knex({
  client: 'mysql2',
  connection: {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    charset: 'utf8mb4'
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  },
  debug: false
})

// Test database connection
const testConnection = async () => {
  try {
    await db.raw('SELECT 1')
    logger.info('✓ MySQL database connected successfully')
    return true
  } catch (error) {
    logger.error({ err: error }, '✗ Failed to connect to MySQL database')
    return false
  }
}

// Initialize database tables if they don't exist
const initializeTables = async () => {
  try {
    // Check if users table exists
    const usersTableExists = await db.schema.hasTable('users')
    if (!usersTableExists) {
      logger.info('Creating users table...')
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary()
        table.string('username', 255).notNullable().unique()
        table.string('email', 255).nullable()
        table.string('password_hash', 255).notNullable()
        table.integer('api_calls_used').defaultTo(0)
        table.integer('api_calls_limit').defaultTo(1000)
        table.date('limit_reset_date').nullable()
        table.timestamp('created_at').defaultTo(db.fn.now())
        table.index('username')
      })
      logger.info('✓ Users table created')
    }

    // Check if whatsapp_sessions table exists
    const sessionsTableExists = await db.schema.hasTable('whatsapp_sessions')
    if (!sessionsTableExists) {
      logger.info('Creating whatsapp_sessions table...')
      await db.schema.createTable('whatsapp_sessions', (table) => {
        table.increments('id').primary()
        table.integer('user_id').unsigned().notNullable()
        table.string('session_id', 255).notNullable().unique()
        table.string('name', 255).nullable()
        table.enum('status', ['active', 'inactive', 'terminated']).defaultTo('inactive')
        table.timestamp('created_at').defaultTo(db.fn.now())
        table.timestamp('last_active').nullable()
        table.foreign('user_id').references('users.id').onDelete('CASCADE')
        table.index(['user_id', 'status'])
        table.index('session_id')
      })
      logger.info('✓ Whatsapp_sessions table created')
    }

    // Check if api_usage_log table exists
    const logsTableExists = await db.schema.hasTable('api_usage_log')
    if (!logsTableExists) {
      logger.info('Creating api_usage_log table...')
      await db.schema.createTable('api_usage_log', (table) => {
        table.increments('id').primary()
        table.integer('user_id').unsigned().notNullable()
        table.string('endpoint', 255).nullable()
        table.string('method', 10).nullable()
        table.timestamp('timestamp').defaultTo(db.fn.now())
        table.foreign('user_id').references('users.id').onDelete('CASCADE')
        table.index(['user_id', 'timestamp'])
      })
      logger.info('✓ Api_usage_log table created')
    }

    logger.info('✓ Database tables initialized')
    return true
  } catch (error) {
    logger.error({ err: error }, '✗ Failed to initialize database tables')
    return false
  }
}

module.exports = {
  db,
  testConnection,
  initializeTables
}
