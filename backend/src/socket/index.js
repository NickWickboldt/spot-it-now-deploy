import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { User } from '../models/user.model.js';
import { log } from '../utils/logger.util.js';

// Store for tracking online users: userId -> Set of socketIds
const onlineUsers = new Map();
// Store for tracking which user is in which conversation (for typing indicators)
const userConversations = new Map();

/**
 * Initialize Socket.io with the HTTP server
 * @param {import('http').Server} httpServer - The HTTP server instance
 * @returns {Server} The Socket.io server instance
 */
export const initializeSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded._id).select(
        '-password -refreshToken'
      );

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (error) {
      log.error('socket-auth', 'Socket authentication failed', {
        error: error.message,
      });
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    log.info('socket-connection', `User connected`, {
      userId,
      socketId: socket.id,
    });

    // Add user to online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Notify friends that user is online
    socket.broadcast.emit('user:online', { userId });

    // Join user's personal room for direct messages
    socket.join(`user:${userId}`);

    // --- Event Handlers ---

    // Join a conversation room
    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      userConversations.set(socket.id, conversationId);
      log.debug('socket-conversation', 'User joined conversation', {
        userId,
        conversationId,
      });
    });

    // Leave a conversation room
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      userConversations.delete(socket.id);
      // Also stop typing when leaving
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        userId,
        conversationId,
      });
    });

    // Typing indicator start
    socket.on('typing:start', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        userId,
        username: socket.user.username,
        conversationId,
      });
    });

    // Typing indicator stop
    socket.on('typing:stop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        userId,
        conversationId,
      });
    });

    // Mark messages as read
    socket.on('messages:read', (data) => {
      const { conversationId, messageIds } = data;
      // Notify other participant that messages were read
      socket.to(`conversation:${conversationId}`).emit('messages:read', {
        conversationId,
        messageIds,
        readBy: userId,
        readAt: new Date().toISOString(),
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      log.info('socket-disconnect', `User disconnected`, {
        userId,
        socketId: socket.id,
        reason,
      });

      // Remove socket from online users
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Notify friends that user is offline
          socket.broadcast.emit('user:offline', { userId });
        }
      }

      // Clean up conversation tracking
      userConversations.delete(socket.id);
    });

    // Error handling
    socket.on('error', (error) => {
      log.error('socket-error', 'Socket error', {
        userId,
        socketId: socket.id,
        error: error.message,
      });
    });
  });

  // Store io instance globally for use in other parts of the app
  global.io = io;

  log.info('socket-init', 'Socket.io initialized successfully');
  return io;
};

/**
 * Get the Socket.io server instance
 * @returns {Server|null}
 */
export const getIO = () => {
  return global.io || null;
};

/**
 * Check if a user is currently online
 * @param {string} userId
 * @returns {boolean}
 */
export const isUserOnline = (userId) => {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
};

/**
 * Get all online user IDs
 * @returns {string[]}
 */
export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

/**
 * Emit an event to a specific user (all their connected sockets)
 * @param {string} userId
 * @param {string} event
 * @param {any} data
 */
export const emitToUser = (userId, event, data) => {
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Emit an event to a conversation room
 * @param {string} conversationId
 * @param {string} event
 * @param {any} data
 */
export const emitToConversation = (conversationId, event, data) => {
  const io = getIO();
  if (io) {
    io.to(`conversation:${conversationId}`).emit(event, data);
  }
};

/**
 * Emit a new message to conversation participants
 * @param {string} conversationId
 * @param {Object} message
 * @param {string} senderId
 */
export const emitNewMessage = (conversationId, message, senderId) => {
  const io = getIO();
  if (io) {
    // Emit to the conversation room (for users currently viewing)
    io.to(`conversation:${conversationId}`).emit('message:new', {
      conversationId,
      message,
    });

    // Also emit to the recipient's user room (for notification badge updates)
    if (message.recipient) {
      const recipientId = message.recipient.toString();
      if (recipientId !== senderId) {
        io.to(`user:${recipientId}`).emit('message:notification', {
          conversationId,
          message,
          senderId,
        });
      }
    }
  }
};

/**
 * Emit read receipt to a conversation
 * @param {string} conversationId
 * @param {string[]} messageIds
 * @param {string} readByUserId
 */
export const emitReadReceipt = (conversationId, messageIds, readByUserId) => {
  const io = getIO();
  if (io) {
    io.to(`conversation:${conversationId}`).emit('messages:read', {
      conversationId,
      messageIds,
      readBy: readByUserId,
      readAt: new Date().toISOString(),
    });
  }
};

export default {
  initializeSocketIO,
  getIO,
  isUserOnline,
  getOnlineUsers,
  emitToUser,
  emitToConversation,
  emitNewMessage,
  emitReadReceipt,
};
