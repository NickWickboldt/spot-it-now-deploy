import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../api/client';
import { useAuth } from './AuthContext';

// Types
export interface TypingEvent {
  userId: string;
  username: string;
  conversationId: string;
}

export interface ReadReceiptEvent {
  conversationId: string;
  messageIds: string[];
  readBy: string;
  readAt: string;
}

export interface MessageNotificationEvent {
  conversationId: string;
  message: any;
  senderId: string;
}

export interface NewMessageEvent {
  conversationId: string;
  message: any;
}

export interface UserStatusEvent {
  userId: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  // Connection management
  connect: () => void;
  disconnect: () => void;
  // Conversation management
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  // Typing indicators
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  // Read receipts
  markMessagesRead: (conversationId: string, messageIds: string[]) => void;
  // Event listeners
  onNewMessage: (callback: (event: NewMessageEvent) => void) => () => void;
  onMessageNotification: (callback: (event: MessageNotificationEvent) => void) => () => void;
  onTypingStart: (callback: (event: TypingEvent) => void) => () => void;
  onTypingStop: (callback: (event: TypingEvent) => void) => () => void;
  onMessagesRead: (callback: (event: ReadReceiptEvent) => void) => () => void;
  onUserOnline: (callback: (event: UserStatusEvent) => void) => () => void;
  onUserOffline: (callback: (event: UserStatusEvent) => void) => () => void;
  // Utility
  isUserOnline: (userId: string) => boolean;
  // Unread count
  unreadMessageCount: number;
  setUnreadMessageCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: (by?: number) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    // Return a mock context when provider is not available yet
    // This prevents crashes during initial render
    return {
      socket: null,
      isConnected: false,
      onlineUsers: new Set<string>(),
      connect: () => {},
      disconnect: () => {},
      joinConversation: () => {},
      leaveConversation: () => {},
      startTyping: () => {},
      stopTyping: () => {},
      markMessagesRead: () => {},
      onNewMessage: () => () => {},
      onMessageNotification: () => () => {},
      onTypingStart: () => () => {},
      onTypingStop: () => () => {},
      onMessagesRead: () => () => {},
      onUserOnline: () => () => {},
      onUserOffline: () => () => {},
      isUserOnline: () => false,
      unreadMessageCount: 0,
      setUnreadMessageCount: () => {},
      incrementUnreadCount: () => {},
      decrementUnreadCount: () => {},
    } as SocketContextType;
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // Get the socket server URL (same as API but without /api/v1)
  const getSocketUrl = useCallback(() => {
    // Remove /api/v1 from the BASE_URL
    const url = BASE_URL.replace('/api/v1', '');
    console.log('[Socket] Server URL:', url);
    return url;
  }, []);

  // Connect to socket
  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) {
      return;
    }

    console.log('[Socket] Connecting...');
    const socketUrl = getSocketUrl();

    const newSocket = io(socketUrl, {
      auth: { token },
      // Start with polling for reliability, then upgrade to websocket
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id, '| Transport:', newSocket.io.engine?.transport?.name);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      console.log('[Socket] Will retry with fallback transports...');
      setIsConnected(false);
    });

    // Log transport upgrades
    newSocket.io.engine?.on('upgrade', (transport: any) => {
      console.log('[Socket] Transport upgraded to:', transport.name);
    });

    // Track online users
    newSocket.on('user:online', (data: UserStatusEvent) => {
      setOnlineUsers((prev) => new Set([...prev, data.userId]));
    });

    newSocket.on('user:offline', (data: UserStatusEvent) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(data.userId);
        return updated;
      });
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [token, getSocketUrl]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('[Socket] Disconnecting...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  // Auto-connect when token is available
  useEffect(() => {
    if (token && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [token, user, connect, disconnect]);

  // Join a conversation room
  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('conversation:join', conversationId);
    }
  }, []);

  // Leave a conversation room
  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('conversation:leave', conversationId);
    }
  }, []);

  // Start typing indicator
  const startTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:start', { conversationId });
    }
  }, []);

  // Stop typing indicator
  const stopTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:stop', { conversationId });
    }
  }, []);

  // Mark messages as read
  const markMessagesRead = useCallback(
    (conversationId: string, messageIds: string[]) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('messages:read', { conversationId, messageIds });
      }
    },
    []
  );

  const onNewMessage = useCallback(
    (callback: (event: NewMessageEvent) => void) => {
      const socket = socketRef.current;
      if (socket) {
        socket.on('message:new', callback);
        return () => socket.off('message:new', callback);
      }
      return () => {};
    },
    []
  );

  const onMessageNotification = useCallback(
    (callback: (event: MessageNotificationEvent) => void) => {
      const socket = socketRef.current;
      if (socket) {
        socket.on('message:notification', callback);
        return () => socket.off('message:notification', callback);
      }
      return () => {};
    },
    []
  );

  const onTypingStart = useCallback(
    (callback: (event: TypingEvent) => void) => {
      const socket = socketRef.current;
      if (socket) {
        socket.on('typing:start', callback);
        return () => socket.off('typing:start', callback);
      }
      return () => {};
    },
    []
  );

  const onTypingStop = useCallback(
    (callback: (event: TypingEvent) => void) => {
      const socket = socketRef.current;
      if (socket) {
        socket.on('typing:stop', callback);
        return () => socket.off('typing:stop', callback);
      }
      return () => {};
    },
    []
  );

  const onMessagesRead = useCallback(
    (callback: (event: ReadReceiptEvent) => void) => {
      const socket = socketRef.current;
      if (socket) {
        socket.on('messages:read', callback);
        return () => socket.off('messages:read', callback);
      }
      return () => {};
    },
    []
  );

  const onUserOnline = useCallback(
    (callback: (event: UserStatusEvent) => void) => {
      const socket = socketRef.current;
      if (socket) {
        socket.on('user:online', callback);
        return () => socket.off('user:online', callback);
      }
      return () => {};
    },
    []
  );

  const onUserOffline = useCallback(
    (callback: (event: UserStatusEvent) => void) => {
      const socket = socketRef.current;
      if (socket) {
        socket.on('user:offline', callback);
        return () => socket.off('user:offline', callback);
      }
      return () => {};
    },
    []
  );

  // Check if a user is online
  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  // Unread count management
  const incrementUnreadCount = useCallback(() => {
    setUnreadMessageCount((prev) => prev + 1);
  }, []);

  const decrementUnreadCount = useCallback((by: number = 1) => {
    setUnreadMessageCount((prev) => Math.max(0, prev - by));
  }, []);

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    connect,
    disconnect,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markMessagesRead,
    onNewMessage,
    onMessageNotification,
    onTypingStart,
    onTypingStop,
    onMessagesRead,
    onUserOnline,
    onUserOffline,
    isUserOnline,
    unreadMessageCount,
    setUnreadMessageCount,
    incrementUnreadCount,
    decrementUnreadCount,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketProvider;
