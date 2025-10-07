import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { addNotification, updateNotification, removeNotification } from '../redux/notifications/notificationSlice';
import { toast } from 'react-hot-toast';

interface UseWebSocketProps {
  userId: string;
  authToken: string;
  enabled?: boolean;
}

interface WebSocketMessage {
  type: 'notification' | 'system_message' | 'user_typing';
  data: any;
}

export const useWebSocket = ({ userId, authToken, enabled = true }: UseWebSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useDispatch();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  // Initialize WebSocket connection
  const connect = useCallback(() => {
    if (!enabled || !userId || !authToken) {
      console.log('🔌 WebSocket: Connection disabled or missing credentials:', { enabled, hasUserId: !!userId, hasToken: !!authToken });
      return;
    }

    try {
      console.log('🔌 WebSocket: Starting connection process...');
      
      // Close existing connection
      if (socketRef.current) {
        socketRef.current.close();
      }

      // Create new connection
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('🔌 WebSocket: Connecting to:', baseUrl);
      
      socketRef.current = io(baseUrl, {
        transports: ['websocket', 'polling'],
        auth: {
          token: authToken
        }
        // Remove explicit path to use default Socket.IO path
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('🔌 WebSocket: Connected to server with ID:', socketRef.current?.id);
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        // Authenticate with the server
        console.log('🔌 WebSocket: Sending authentication for user:', userId);
        socketRef.current?.emit('authenticate', {
          token: authToken,
          userId: userId
        });
      });

      socketRef.current.on('authenticated', (data: any) => {
        console.log('✅ WebSocket: Successfully authenticated:', data);
      });

      socketRef.current.on('authentication_error', (error: any) => {
        console.error('❌ WebSocket: Authentication failed:', error);
        setConnectionError(error.message || 'Authentication failed');
        setIsConnected(false);
      });

      socketRef.current.on('disconnect', (reason: string) => {
        console.log('🔌 WebSocket: Disconnected from server. Reason:', reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not manually disconnected
        if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < maxReconnectAttempts) {
          setTimeout(() => {
            reconnectAttemptsRef.current++;
            console.log(`🔄 WebSocket: Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            connect();
          }, reconnectDelay * reconnectAttemptsRef.current);
        }
      });

      socketRef.current.on('connect_error', (error: Error) => {
        console.error('❌ WebSocket: Connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      });

      // Message events
      socketRef.current.on('new_notification', (message: WebSocketMessage) => {
        console.log('📨 WebSocket: Received new_notification event:', message);
        if (message.type === 'notification') {
          console.log('📨 WebSocket: Processing notification:', message.data);
          
          // Add notification to Redux store
          dispatch(addNotification(message.data));
          
          // Show toast notification
          toast.success(message.data.title, {
            duration: 5000,
            position: 'top-right'
          });
        }
      });

      socketRef.current.on('system_message', (message: WebSocketMessage) => {
        if (message.type === 'system_message') {
          // Show toast for system messages
          const toastType = message.data.messageType === 'error' ? 'error' :
                           message.data.messageType === 'warning' ? 'error' :
                           message.data.messageType === 'success' ? 'success' : 'default';
          
          if (toastType === 'default') {
            toast(message.data.message, {
              duration: 4000,
              position: 'top-right'
            });
          } else {
            toast[toastType](message.data.message, {
              duration: 4000,
              position: 'top-right'
            });
          }
        }
      });

      socketRef.current.on('user_typing', (data: any) => {
        // Handle typing indicators if needed
      });

    } catch (error) {
      setConnectionError('Failed to connect to notification service');
    }
  }, [enabled, userId, authToken, dispatch]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
    setConnectionError(null);
  }, []);

  // Join a room for specific notifications
  const joinRoom = useCallback((room: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_room', room);
    }
  }, [isConnected]);

  // Leave a room
  const leaveRoom = useCallback((room: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave_room', room);
    }
  }, [isConnected]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((room: string, isTyping: boolean, userName: string) => {
    if (socketRef.current && isConnected) {
      if (isTyping) {
        socketRef.current.emit('typing_start', { room, userId, userName });
      } else {
        socketRef.current.emit('typing_stop', { room, userId });
      }
    }
  }, [isConnected, userId]);

  // Effect to manage connection lifecycle
  useEffect(() => {
    if (enabled && userId && authToken) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, userId, authToken, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionError,
    joinRoom,
    leaveRoom,
    sendTypingIndicator,
    reconnect: connect
  };
}; 