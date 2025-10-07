import { Notification, INotification } from '../models/Notification';
import { User } from '../models/User';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import socketService from './socketService';

export interface NotificationData {
  userId: string;
  type: INotification['type'];
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'inventory' | 'customer' | 'service' | 'payment' | 'system' | 'general';
  customerId?: string;
  productId?: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
  createdBy?: string;
}

export interface BulkNotificationData {
  userIds: string[];
  type: INotification['type'];
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'inventory' | 'customer' | 'service' | 'payment' | 'system' | 'general';
  customerId?: string;
  productId?: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
  createdBy?: string;
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Create a single notification
   */
  async createNotification(data: NotificationData): Promise<INotification> {
    try {
      const notification = new Notification({
        userId: new mongoose.Types.ObjectId(data.userId),
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority || 'medium',
        category: data.category || 'general',
        customerId: data.customerId ? new mongoose.Types.ObjectId(data.customerId) : undefined,
        productId: data.productId ? new mongoose.Types.ObjectId(data.productId) : undefined,
        metadata: data.metadata || {},
        actionUrl: data.actionUrl,
        createdBy: data.createdBy ? new mongoose.Types.ObjectId(data.createdBy) : undefined
      });

      await notification.save();
      
      // Populate references for return
      await notification.populate([
        { path: 'customerId', select: 'name email phone' },
        { path: 'productId', select: 'name partNo' },
        { path: 'createdBy', select: 'firstName lastName' }
      ]);

      // Send real-time notification via WebSocket
      await this.sendRealTimeNotification(notification, [data.userId]);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   */
  async createBulkNotifications(data: BulkNotificationData): Promise<INotification[]> {
    try {
      const notifications = data.userIds.map(userId => ({
        userId: new mongoose.Types.ObjectId(userId),
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority || 'medium',
        category: data.category || 'general',
        customerId: data.customerId ? new mongoose.Types.ObjectId(data.customerId) : undefined,
        productId: data.productId ? new mongoose.Types.ObjectId(data.productId) : undefined,
        metadata: data.metadata || {},
        actionUrl: data.actionUrl,
        createdBy: data.createdBy ? new mongoose.Types.ObjectId(data.createdBy) : undefined
      }));

      const createdNotifications = await Notification.insertMany(notifications);
      
      // Populate references
      const populatedNotifications = await Notification.populate(createdNotifications, [
        { path: 'customerId', select: 'name email phone' },
        { path: 'productId', select: 'name partNo' },
        { path: 'createdBy', select: 'firstName lastName' }
      ]);

      // Send real-time notifications via WebSocket
      for (const notification of populatedNotifications) {
        await this.sendRealTimeNotification(notification, [notification.userId.toString()]);
      }

      return populatedNotifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get users who should receive inventory notifications
   */
  async getInventoryNotificationRecipients(): Promise<string[]> {
    try {
      const users = await User.find({
        $or: [
          { role: { $in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER] } },
          { 
            moduleAccess: { 
              $elemMatch: { 
                module: 'inventory_management', 
                access: true 
              } 
            } 
          }
        ],
        status: 'active'
      }).select('_id');

      return users.map(user => (user._id as mongoose.Types.ObjectId).toString());
    } catch (error) {
      console.error('Error getting inventory notification recipients:', error);
      throw error;
    }
  }

  /**
   * Get users who should receive customer notifications
   */
  async getCustomerNotificationRecipients(): Promise<string[]> {
    try {
      const users = await User.find({
        $or: [
          { role: { $in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER] } },
          { 
            moduleAccess: { 
              $elemMatch: { 
                module: 'lead_management', 
                access: true 
              } 
            } 
          }
        ],
        status: 'active'
      }).select('_id');

      return users.map(user => (user._id as mongoose.Types.ObjectId).toString());
    } catch (error) {
      console.error('Error getting customer notification recipients:', error);
      throw error;
    }
  }

  /**
   * Get users who should receive service notifications
   */
  async getServiceNotificationRecipients(): Promise<string[]> {
    try {
      const users = await User.find({
        $or: [
          { role: { $in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER] } },
          { 
            moduleAccess: { 
              $elemMatch: { 
                module: 'service_management', 
                access: true 
              } 
            } 
          }
        ],
        status: 'active'
      }).select('_id');

      return users.map(user => (user._id as mongoose.Types.ObjectId).toString());
    } catch (error) {
      console.error('Error getting service notification recipients:', error);
      throw error;
    }
  }

  /**
   * Get users who should receive payment notifications
   */
  async getPaymentNotificationRecipients(): Promise<string[]> {
    try {
      const users = await User.find({
        $or: [
          { role: { $in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER] } },
          { 
            moduleAccess: { 
              $elemMatch: { 
                module: 'billing', 
                access: true 
              } 
            } 
          }
        ],
        status: 'active'
      }).select('_id');

      return users.map(user => (user._id as mongoose.Types.ObjectId).toString());
    } catch (error) {
      console.error('Error getting payment notification recipients:', error);
      throw error;
    }
  }

  /**
   * Get all admin users for system notifications
   */
  async getAdminUsers(): Promise<string[]> {
    try {
      const users = await User.find({
        role: { $in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
        status: 'active'
      }).select('_id');

      return users.map(user => (user._id as mongoose.Types.ObjectId).toString());
    } catch (error) {
      console.error('Error getting admin users:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId: new mongoose.Types.ObjectId(userId) },
        { isRead: true },
        { new: true }
      ).populate([
        { path: 'customerId', select: 'name email phone' },
        { path: 'productId', select: 'name partNo' },
        { path: 'createdBy', select: 'firstName lastName' }
      ]);

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await Notification.updateMany(
        { userId: new mongoose.Types.ObjectId(userId), isRead: false },
        { isRead: true }
      );

      return result.modifiedCount;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await Notification.deleteOne({
        _id: notificationId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getUserNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    try {
      const [total, unread, categoryStats, priorityStats] = await Promise.all([
        Notification.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
        Notification.countDocuments({ userId: new mongoose.Types.ObjectId(userId), isRead: false }),
        Notification.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId) } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Notification.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId) } },
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ])
      ]);

      const byCategory = categoryStats.reduce((acc: any, stat: any) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      const byPriority = priorityStats.reduce((acc: any, stat: any) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      return { total, unread, byCategory, byPriority };
    } catch (error) {
      console.error('Error getting user notification stats:', error);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  /**
   * Send real-time notification via WebSocket
   */
  private async sendRealTimeNotification(notification: INotification, recipientIds: string[]): Promise<void> {
    try {
      // Send via WebSocket if available
      if (socketService) {
        await socketService.sendNotification(notification, recipientIds);
      }
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      // Don't throw error - notification is still saved to database
    }
  }

  /**
   * Create inventory notification with real-time delivery
   */
  async createInventoryNotification(
    type: 'low_stock' | 'out_of_stock' | 'over_stock',
    productId: string,
    productName: string,
    partNo: string,
    currentStock: number,
    threshold: number,
    location: string,
    room?: string,
    rack?: string
  ): Promise<void> {
    try {
      const recipients = await this.getInventoryNotificationRecipients();
      
      if (recipients.length === 0) {
        return;
      }

      const priority: 'low' | 'medium' | 'high' | 'urgent' = 
        type === 'out_of_stock' ? 'urgent' : 
        type === 'low_stock' ? 'high' : 'medium';

      const title = type === 'low_stock' ? 'Low Stock Alert' :
                   type === 'out_of_stock' ? 'Out of Stock Alert' : 'Overstock Alert';

      const message = type === 'low_stock' ? 
        `Product "${productName}" (${partNo}) is running low on stock. Current: ${currentStock}, Minimum: ${threshold}. Location: ${location}${room ? ` - ${room}` : ''}${rack ? ` - ${rack}` : ''}` :
        type === 'out_of_stock' ?
        `Product "${productName}" (${partNo}) is completely out of stock. Location: ${location}${room ? ` - ${room}` : ''}${rack ? ` - ${rack}` : ''}` :
        `Product "${productName}" (${partNo}) is overstocked. Current: ${currentStock}, Maximum: ${threshold}. Location: ${location}${room ? ` - ${room}` : ''}${rack ? ` - ${rack}` : ''}`;

      const notificationData = {
        userIds: recipients,
        type,
        title,
        message,
        priority,
        category: 'inventory' as const,
        productId,
        metadata: {
          currentStock,
          threshold,
          location,
          room,
          rack,
          alertType: type
        },
        actionUrl: `/inventory/products/${productId}`
      };

      await this.createBulkNotifications(notificationData);
    } catch (error) {
      console.error(`Error creating ${type} notification:`, error);
      throw error;
    }
  }

  /**
   * Create customer assignment notification with real-time delivery
   */
  async createAssignmentNotification(
    userId: string,
    customerId: string,
    customerName: string
  ): Promise<INotification> {
    try {
      const notification = new Notification({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'assignment',
        title: 'New Customer Assignment',
        message: `You have been assigned a new customer: ${customerName}`,
        priority: 'high',
        category: 'customer',
        customerId: new mongoose.Types.ObjectId(customerId),
        metadata: { assignmentType: 'new_customer' },
        actionUrl: `/customers/${customerId}`
      });

      await notification.save();
      
      // Populate references for return
      await notification.populate([
        { path: 'customerId', select: 'name email phone' },
        { path: 'createdBy', select: 'firstName lastName' }
      ]);

      // Send real-time notification
      await this.sendRealTimeNotification(notification, [userId]);

      return notification;
    } catch (error) {
      console.error('Error creating assignment notification:', error);
      throw error;
    }
  }

  /**
   * Create customer status change notification with real-time delivery
   */
  async createStatusChangeNotification(
    userId: string,
    customerId: string,
    customerName: string,
    oldStatus: string,
    newStatus: string
  ): Promise<INotification> {
    try {
      const notification = new Notification({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'status_change',
        title: 'Customer Status Updated',
        message: `Customer ${customerName} status changed from "${oldStatus}" to "${newStatus}"`,
        priority: 'medium',
        category: 'customer',
        customerId: new mongoose.Types.ObjectId(customerId),
        metadata: { oldStatus, newStatus },
        actionUrl: `/customers/${customerId}`
      });

      await notification.save();
      
      // Populate references for return
      await notification.populate([
        { path: 'customerId', select: 'name email phone' },
        { path: 'createdBy', select: 'firstName lastName' }
      ]);

      // Send real-time notification
      await this.sendRealTimeNotification(notification, [userId]);

      return notification;
    } catch (error) {
      console.error('Error creating status change notification:', error);
      throw error;
    }
  }

  /**
   * Create follow-up reminder notification with real-time delivery
   */
  async createFollowUpNotification(
    userId: string,
    customerId: string,
    customerName: string,
    followUpDate: Date
  ): Promise<INotification> {
    try {
      const notification = new Notification({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'follow_up',
        title: 'Follow-up Reminder',
        message: `Follow-up reminder for customer ${customerName} on ${followUpDate.toLocaleDateString()}`,
        priority: 'high',
        category: 'customer',
        customerId: new mongoose.Types.ObjectId(customerId),
        metadata: { followUpDate },
        actionUrl: `/customers/${customerId}`
      });

      await notification.save();
      
      // Populate references for return
      await notification.populate([
        { path: 'customerId', select: 'name email phone' },
        { path: 'createdBy', select: 'firstName lastName' }
      ]);

      // Send real-time notification
      await this.sendRealTimeNotification(notification, [userId]);

      return notification;
    } catch (error) {
      console.error('Error creating follow-up notification:', error);
      throw error;
    }
  }
}

export const notificationService = NotificationService.getInstance();
export default notificationService; 