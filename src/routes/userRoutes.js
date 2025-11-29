const express = require('express')
const router = express.Router()
const userSessionController = require('../controllers/userSessionController')
const { authenticate } = require('../middleware/auth')
const { validateUserOwnsSession } = require('../middleware/userSession')
const { checkApiLimit } = require('../middleware/apiLimiter')

// Import original routers to mount them under authenticated paths
const sessionController = require('../controllers/sessionController')
const clientController = require('../controllers/clientController')
const chatController = require('../controllers/chatController')
const groupChatController = require('../controllers/groupChatController')
const messageController = require('../controllers/messageController')
const contactController = require('../controllers/contactController')
const channelController = require('../controllers/channelController')
const middleware = require('../middleware')

// All routes require authentication
router.use(authenticate)

/**
 * User Profile Routes
 * Base path: /users/me
 */

// Get current user profile
router.get('/', userSessionController.getProfile)

// Get API usage statistics
router.get('/usage', userSessionController.getUsageStats)

/**
 * User Session Management Routes
 * Base path: /users/me/sessions
 */

// List all sessions for current user
router.get('/sessions', userSessionController.listSessions)

// Create new session
router.post('/sessions', userSessionController.createSession)

// Delete/terminate specific session
router.delete('/sessions/:sessionId', 
  validateUserOwnsSession,
  userSessionController.terminateSession
)

/**
 * Authenticated WhatsApp Operations
 * Base path: /users/me/sessions/:sessionId
 * 
 * These routes mount the original session/client/message/etc controllers
 * but with authentication and ownership validation applied first
 */

// Apply ownership validation and API limiting to all session-specific operations
const sessionGuard = [validateUserOwnsSession, checkApiLimit]

// ===== SESSION OPERATIONS =====
router.get('/sessions/:sessionId/start', sessionGuard, sessionController.startSession)
router.get('/sessions/:sessionId/stop', sessionGuard, sessionController.stopSession)
router.get('/sessions/:sessionId/status', sessionGuard, sessionController.statusSession)
router.get('/sessions/:sessionId/qr', sessionGuard, sessionController.sessionQrCode)
router.get('/sessions/:sessionId/qr/image', sessionGuard, sessionController.sessionQrCodeImage)
router.post('/sessions/:sessionId/requestPairingCode', sessionGuard, sessionController.requestPairingCode)
router.get('/sessions/:sessionId/restart', sessionGuard, sessionController.restartSession)
router.get('/sessions/:sessionId/screenshot', sessionGuard, sessionController.getPageScreenshot)

// ===== CLIENT OPERATIONS (principales) =====
router.post('/sessions/:sessionId/sendMessage', sessionGuard, clientController.sendMessage)
router.get('/sessions/:sessionId/getClassInfo', sessionGuard, clientController.getClassInfo)
router.post('/sessions/:sessionId/isRegisteredUser', sessionGuard, clientController.isRegisteredUser)
router.post('/sessions/:sessionId/getNumberId', sessionGuard, clientController.getNumberId)
router.post('/sessions/:sessionId/getProfilePictureUrl', sessionGuard, clientController.getProfilePictureUrl)
router.post('/sessions/:sessionId/setDisplayName', sessionGuard, clientController.setDisplayName)
router.post('/sessions/:sessionId/setStatus', sessionGuard, clientController.setStatus)
router.get('/sessions/:sessionId/getContacts', sessionGuard, clientController.getContacts)
router.get('/sessions/:sessionId/getChats', sessionGuard, clientController.getChats)
router.post('/sessions/:sessionId/getCommonGroups', sessionGuard, clientController.getCommonGroups)
router.post('/sessions/:sessionId/getContactById', sessionGuard, clientController.getContactById)
router.post('/sessions/:sessionId/archiveChat', sessionGuard, clientController.archiveChat)
router.post('/sessions/:sessionId/unarchiveChat', sessionGuard, clientController.unarchiveChat)
router.post('/sessions/:sessionId/pinChat', sessionGuard, clientController.pinChat)
router.post('/sessions/:sessionId/unpinChat', sessionGuard, clientController.unpinChat)
router.post('/sessions/:sessionId/muteChat', sessionGuard, clientController.muteChat)
router.post('/sessions/:sessionId/unmuteChat', sessionGuard, clientController.unmuteChat)
router.post('/sessions/:sessionId/markChatUnread', sessionGuard, clientController.markChatUnread)
router.post('/sessions/:sessionId/getChatById', sessionGuard, clientController.getChatById)
router.post('/sessions/:sessionId/createGroup', sessionGuard, clientController.createGroup)
router.post('/sessions/:sessionId/getChatLabels', sessionGuard, clientController.getChatLabels)
router.get('/sessions/:sessionId/getLabels', sessionGuard, clientController.getLabels)
router.post('/sessions/:sessionId/getLabelById', sessionGuard, clientController.getLabelById)
router.post('/sessions/:sessionId/searchMessages', sessionGuard, clientController.searchMessages)
router.post('/sessions/:sessionId/sendPresenceAvailable', sessionGuard, clientController.sendPresenceAvailable)
router.post('/sessions/:sessionId/sendPresenceUnavailable', sessionGuard, clientController.sendPresenceUnavailable)
router.get('/sessions/:sessionId/getWWebVersion', sessionGuard, clientController.getWWebVersion)
router.post('/sessions/:sessionId/setProfilePicture', sessionGuard, clientController.setProfilePicture)
router.post('/sessions/:sessionId/deleteProfilePicture', sessionGuard, clientController.deleteProfilePicture)
router.post('/sessions/:sessionId/getContactLidAndPhone', sessionGuard, clientController.getContactLidAndPhone)

// ===== CHAT OPERATIONS =====
router.post('/sessions/:sessionId/fetchMessages', sessionGuard, chatController.fetchMessages)
router.post('/sessions/:sessionId/chat/sendSeen', sessionGuard, chatController.sendSeen)
router.post('/sessions/:sessionId/clearMessages', sessionGuard, chatController.clearMessages)
router.post('/sessions/:sessionId/deleteChat', sessionGuard, chatController.deleteChat)
router.post('/sessions/:sessionId/markUnread', sessionGuard, chatController.markUnread)

// ===== GROUP CHAT OPERATIONS =====
router.post('/sessions/:sessionId/group/addParticipants', sessionGuard, groupChatController.addParticipants)
router.post('/sessions/:sessionId/group/removeParticipants', sessionGuard, groupChatController.removeParticipants)
router.post('/sessions/:sessionId/group/promoteParticipants', sessionGuard, groupChatController.promoteParticipants)
router.post('/sessions/:sessionId/group/demoteParticipants', sessionGuard, groupChatController.demoteParticipants)
router.post('/sessions/:sessionId/group/setSubject', sessionGuard, groupChatController.setSubject)
router.post('/sessions/:sessionId/group/setDescription', sessionGuard, groupChatController.setDescription)
router.post('/sessions/:sessionId/group/setPicture', sessionGuard, groupChatController.setPicture)
router.post('/sessions/:sessionId/group/leave', sessionGuard, groupChatController.leave)
router.post('/sessions/:sessionId/group/revokeInvite', sessionGuard, groupChatController.revokeInvite)
router.post('/sessions/:sessionId/group/getInviteCode', sessionGuard, groupChatController.getInviteCode)

// ===== MESSAGE OPERATIONS =====
router.post('/sessions/:sessionId/message/downloadMedia', sessionGuard, messageController.downloadMedia)
router.post('/sessions/:sessionId/message/delete', sessionGuard, messageController.deleteMessage)
router.post('/sessions/:sessionId/message/edit', sessionGuard, messageController.edit)
router.post('/sessions/:sessionId/message/forward', sessionGuard, messageController.forward)
router.post('/sessions/:sessionId/message/react', sessionGuard, messageController.react)
router.post('/sessions/:sessionId/message/star', sessionGuard, messageController.star)
router.post('/sessions/:sessionId/message/reply', sessionGuard, messageController.reply)

// ===== CONTACT OPERATIONS =====
router.post('/sessions/:sessionId/contact/getClassInfo', sessionGuard, contactController.getClassInfo)
router.post('/sessions/:sessionId/blockContact', sessionGuard, contactController.block)
router.post('/sessions/:sessionId/contact/getAbout', sessionGuard, contactController.getAbout)
router.post('/sessions/:sessionId/contact/getChat', sessionGuard, contactController.getChat)
router.post('/sessions/:sessionId/unblockContact', sessionGuard, contactController.unblock)
router.post('/sessions/:sessionId/contact/getFormattedNumber', sessionGuard, contactController.getFormattedNumber)
router.post('/sessions/:sessionId/contact/getCountryCode', sessionGuard, contactController.getCountryCode)
router.post('/sessions/:sessionId/contact/getProfilePicUrl', sessionGuard, contactController.getProfilePicUrl)
router.post('/sessions/:sessionId/contact/getCommonGroups', sessionGuard, contactController.getCommonGroups)

// ===== CHANNEL OPERATIONS =====
router.post('/sessions/:sessionId/channel/getClassInfo', sessionGuard, channelController.getClassInfo)
router.post('/sessions/:sessionId/channel/sendMessage', sessionGuard, channelController.sendMessage)
router.post('/sessions/:sessionId/channel/fetchMessages', sessionGuard, channelController.fetchMessages)
router.post('/sessions/:sessionId/channel/sendSeen', sessionGuard, channelController.sendSeen)
router.post('/sessions/:sessionId/channel/mute', sessionGuard, channelController.mute)
router.post('/sessions/:sessionId/channel/unmute', sessionGuard, channelController.unmute)

module.exports = router
