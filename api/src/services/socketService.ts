import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { INotification } from '../models/Notification';
import { User } from '../models/User';
import mongoose from 'mongoose';

export interface SocketUser {
  userId: string;
  socketId: string;
  userRole: string;
  moduleAccess: string[];
}

export interface NotificationPayload {
  notification: INotification;
  recipients: string[];
  broadcast?: boolean;
}

export class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
      // Remove explicit path to use default Socket.IO path
    });

    this.setupEventHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    console.log('🔌 SocketService: Setting up event handlers');

    this.io.on('connection', (socket) => {
      console.log(`🔌 SocketService: New socket connection: ${socket.id}`);
      console.log(`🔌 SocketService: Socket transport: ${socket.conn.transport.name}`);
      console.log(`🔌 SocketService: Total connected sockets: ${this.io?.sockets.sockets.size || 0}`);

      // Handle user authentication
      socket.on('authenticate', async (data: { token: string; userId: string }) => {
        try {
          console.log(`🔌 SocketService: Authentication attempt for user: ${data.userId}`);
          
          // Verify user exists and get their details
          const user = await User.findById(data.userId).select('_id role moduleAccess status');
          
          if (!user || user.status !== 'active') {
            console.log(`❌ SocketService: Authentication failed - user not found or inactive: ${data.userId}`);
            socket.emit('authentication_error', { message: 'Invalid user or user inactive' });
            return;
          }

          // Store user connection info
          const socketUser: SocketUser = {
            userId: data.userId,
            socketId: socket.id,
            userRole: user.role,
            moduleAccess: user.moduleAccess?.map((m: any) => m.module) || []
          };

          this.connectedUsers.set(socket.id, socketUser);
          
          // Store socket ID for user
          if (!this.userSockets.has(data.userId)) {
            this.userSockets.set(data.userId, []);
          }
          this.userSockets.get(data.userId)!.push(socket.id);

          console.log(`✅ SocketService: User ${data.userId} authenticated on socket ${socket.id}`);
          console.log(`🔌 SocketService: User ${data.userId} now has ${this.userSockets.get(data.userId)?.length || 0} connected socket(s)`);
          console.log(`🔌 SocketService: Total users with sockets: ${this.userSockets.size}`);

          socket.emit('authenticated', { 
            message: 'Successfully authenticated',
            user: {
              id: user._id,
              role: user.role,
              moduleAccess: socketUser.moduleAccess
            }
          });
        } catch (error) {
          console.error('SocketService: Authentication error:', error);
          socket.emit('authentication_error', { message: 'Authentication failed' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          // Remove socket from user's socket list
          const userSockets = this.userSockets.get(user.userId);
          if (userSockets) {
            const index = userSockets.indexOf(socket.id);
            if (index > -1) {
              userSockets.splice(index, 1);
            }
            if (userSockets.length === 0) {
              this.userSockets.delete(user.userId);
            }
          }
          
          this.connectedUsers.delete(socket.id);
          // User disconnected
        }
      });

      // Handle join room (for specific notifications)
      socket.on('join_room', (room: string) => {
        socket.join(room);
      });

      // Handle leave room
      socket.on('leave_room', (room: string) => {
        socket.leave(room);
      });

      // Handle typing indicators
      socket.on('typing_start', (data: { room: string; userId: string; userName: string }) => {
        socket.to(data.room).emit('user_typing', {
          userId: data.userId,
          userName: data.userName,
          isTyping: true
        });
      });

      socket.on('typing_stop', (data: { room: string; userId: string }) => {
        socket.to(data.room).emit('user_typing', {
          userId: data.userId,
          isTyping: false
        });
      });
    });
  }

  /**
   * Send notification to specific users
   */
  async sendNotification(notification: INotification, recipientIds: string[]): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    try {
      console.log(`🔔 SocketService: Attempting to send notification "${notification.title}" to users:`, recipientIds);
      
      // Populate notification data
      const populatedNotification = await notification.populate([
        { path: 'customerId', select: 'name email phone' },
        { path: 'productId', select: 'name partNo' },
        { path: 'createdBy', select: 'firstName lastName' }
      ]);

      const notificationData = {
        _id: populatedNotification._id,
        type: populatedNotification.type,
        title: populatedNotification.title,
        message: populatedNotification.message,
        priority: populatedNotification.priority,
        category: populatedNotification.category,
        isRead: populatedNotification.isRead,
        customerId: populatedNotification.customerId,
        productId: populatedNotification.productId,
        createdBy: populatedNotification.createdBy,
        metadata: populatedNotification.metadata,
        actionUrl: populatedNotification.actionUrl,
        createdAt: populatedNotification.createdAt
      };

      let sentCount = 0;

      for (const recipientId of recipientIds) {
        const userSockets = this.userSockets.get(recipientId);
        
        console.log(`🔔 SocketService: User ${recipientId} has ${userSockets?.length || 0} connected socket(s)`);
        
        if (userSockets && userSockets.length > 0) {
          // Send to all user's connected sockets
          for (const socketId of userSockets) {
            this.io.to(socketId).emit('new_notification', {
              type: 'notification',
              data: notificationData
            });
            sentCount++;
            console.log(`🔔 SocketService: Sent to socket ${socketId}`);
          }
        } else {
          console.log(`🔔 SocketService: No connected sockets for user ${recipientId}`);
        }
      }

      // Notification sent successfully
    } catch (error) {
      // Handle error silently
    }
  }

  /**
   * Send notification to all connected users (broadcast)
   */
  async broadcastNotification(notification: INotification, filter?: (user: SocketUser) => boolean): Promise<void> {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    try {
      // Populate notification data
      const populatedNotification = await notification.populate([
        { path: 'customerId', select: 'name email phone' },
        { path: 'productId', select: 'name partNo' },
        { path: 'createdBy', select: 'firstName lastName' }
      ]);

      const notificationData = {
        _id: populatedNotification._id,
        type: populatedNotification.type,
        title: populatedNotification.title,
        message: populatedNotification.message,
        priority: populatedNotification.priority,
        category: populatedNotification.category,
        isRead: populatedNotification.isRead,
        customerId: populatedNotification.customerId,
        productId: populatedNotification.productId,
        createdBy: populatedNotification.createdBy,
        metadata: populatedNotification.metadata,
        actionUrl: populatedNotification.actionUrl,
        createdAt: populatedNotification.createdAt
      };

      // Filter users if filter function provided
      let targetUsers = Array.from(this.connectedUsers.values());
      if (filter) {
        targetUsers = targetUsers.filter(filter);
      }

      // Send to filtered users
      for (const user of targetUsers) {
        const userSockets = this.userSockets.get(user.userId);
        if (userSockets) {
          for (const socketId of userSockets) {
            this.io.to(socketId).emit('new_notification', {
              type: 'notification',
              data: notificationData
            });
          }
        }
      }

      console.log(`📢 Broadcasted notification "${notification.title}" to ${targetUsers.length} user(s)`);
    } catch (error) {
      console.error('Error broadcasting notification via socket:', error);
    }
  }

  /**
   * Send system message to specific users
   */
  sendSystemMessage(userIds: string[], message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): void {
    if (!this.io) return;

    const systemMessage = {
      type: 'system_message',
      data: {
        message,
        messageType: type,
        timestamp: new Date().toISOString()
      }
    };

    for (const userId of userIds) {
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        for (const socketId of userSockets) {
          this.io.to(socketId).emit('system_message', systemMessage);
        }
      }
    }
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get user's connected sockets
   */
  getUserSockets(userId: string): string[] {
    return this.userSockets.get(userId) || [];
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.length > 0;
  }

  /**
   * Get online users for a specific module
   */
  getOnlineUsersForModule(module: string): string[] {
    const onlineUsers: string[] = [];
    
    for (const [userId, user] of this.connectedUsers) {
      if (user.moduleAccess.includes(module)) {
        onlineUsers.push(user.userId);
      }
    }
    
    return [...new Set(onlineUsers)]; // Remove duplicates
  }

  /**
   * Emit event to specific room
   */
  emitToRoom(room: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(room).emit(event, data);
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;
    
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      for (const socketId of userSockets) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }
}

export const socketService = SocketService.getInstance();
export default socketService; 