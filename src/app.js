require('./routes')
const express = require('express')
const cors = require('cors')
const { routes } = require('./routes')
const { maxAttachmentSize, basePath, trustProxy } = require('./config')

const app = express()

// Initialize Express app
app.disable('x-powered-by')

// Configure trust proxy for reverse proxy compatibility
if (trustProxy) {
  app.set('trust proxy', true)
}

// Enable CORS for all origins
app.use(cors())

app.use(express.json({ limit: maxAttachmentSize + 1000000 }))
app.use(express.urlencoded({ limit: maxAttachmentSize + 1000000, extended: true }))

// Mount routes with configurable base path
app.use(basePath, routes)

module.exports = app
