import { notificationService } from './notificationService';
import socketService from './socketService';
import { User } from '../models/User';
import { UserRole } from '../types';

export class RealTimeNotificationService {
  private static instance: RealTimeNotificationService;

  private constructor() {}

  public static getInstance(): RealTimeNotificationService {
    if (!RealTimeNotificationService.instance) {
      RealTimeNotificationService.instance = new RealTimeNotificationService();
    }
    return RealTimeNotificationService.instance;
  }

  /**
   * Trigger real-time notification when stock level changes
   */
  async triggerStockLevelNotification(
    productId: string,
    productName: string,
    partNo: string,
    currentStock: number,
    threshold: number,
    alertType: 'low_stock' | 'out_of_stock' | 'over_stock',
    location: string,
    room?: string,
    rack?: string
  ): Promise<void> {
    try {
      const recipients = await notificationService.getInventoryNotificationRecipients();
      
      if (recipients.length === 0) {
        console.log('No recipients found for inventory notifications');
        return;
      }

      const priority: 'low' | 'medium' | 'high' | 'urgent' = 
        alertType === 'out_of_stock' ? 'urgent' : 
        alertType === 'low_stock' ? 'high' : 'medium';

      const title = alertType === 'low_stock' ? 'Low Stock Alert' :
                   alertType === 'out_of_stock' ? 'Out of Stock Alert' : 'Overstock Alert';

      const message = alertType === 'low_stock' ? 
        `Product "${productName}" (${partNo}) is running low on stock. Current: ${currentStock}, Minimum: ${threshold}. Location: ${location}${room ? ` - ${room}` : ''}${rack ? ` - ${rack}` : ''}` :
        alertType === 'out_of_stock' ?
        `Product "${productName}" (${partNo}) is completely out of stock. Location: ${location}${room ? ` - ${room}` : ''}${rack ? ` - ${rack}` : ''}` :
        `Product "${productName}" (${partNo}) is overstocked. Current: ${currentStock}, Maximum: ${threshold}. Location: ${location}${room ? ` - ${room}` : ''}${rack ? ` - ${rack}` : ''}`;

      // Create notification in database
      await notificationService.createInventoryNotification(
        alertType,
        productId,
        productName,
        partNo,
        currentStock,
        threshold,
        location,
        room,
        rack
      );

      // Send real-time notification via WebSocket
      if (socketService) {
        // Get the notification from the service to send via WebSocket
        const notification = await notificationService.createNotification({
          userId: recipients[0], // Create for first recipient
          type: alertType,
          title,
          message,
          priority,
          category: 'inventory',
          productId,
          metadata: {
            currentStock,
            threshold,
            location,
            room,
            rack,
            alertType
          },
          actionUrl: `/inventory/products/${productId}`
        });

        await socketService.sendNotification(notification, recipients);
      }

      console.log(`✅ Real-time ${alertType} notification triggered for product: ${productName}`);
    } catch (error) {
      console.error(`Error triggering ${alertType} notification:`, error);
      throw error;
    }
  }

  /**
   * Trigger real-time notification when customer is assigned
   */
  async triggerCustomerAssignmentNotification(
    customerId: string,
    customerName: string,
    assignedToId: string,
    assignedByName: string
  ): Promise<void> {
    try {
      const notification = await notificationService.createAssignmentNotification(
        assignedToId,
        customerId,
        customerName
      );

      // Send real-time notification via WebSocket
      if (socketService) {
        await socketService.sendNotification(notification, [assignedToId]);
      }

      console.log(`✅ Real-time customer assignment notification triggered for: ${customerName}`);
    } catch (error) {
      console.error('Error triggering customer assignment notification:', error);
      throw error;
    }
  }

  /**
   * Trigger real-time notification when customer status changes
   */
  async triggerCustomerStatusChangeNotification(
    customerId: string,
    customerName: string,
    oldStatus: string,
    newStatus: string,
    updatedBy: string,
    recipientId: string
  ): Promise<void> {
    try {
      const notification = await notificationService.createStatusChangeNotification(
        recipientId,
        customerId,
        customerName,
        oldStatus,
        newStatus
      );

      // Send real-time notification via WebSocket
      if (socketService) {
        await socketService.sendNotification(notification, [recipientId]);
      }

      console.log(`✅ Real-time customer status change notification triggered for: ${customerName}`);
    } catch (error) {
      console.error('Error triggering customer status change notification:', error);
      throw error;
    }
  }

  /**
   * Trigger real-time notification for follow-up reminders
   */
  async triggerFollowUpNotification(
    customerId: string,
    customerName: string,
    followUpDate: Date,
    recipientId: string
  ): Promise<void> {
    try {
      const notification = await notificationService.createFollowUpNotification(
        recipientId,
        customerId,
        customerName,
        followUpDate
      );

      // Send real-time notification via WebSocket
      if (socketService) {
        await socketService.sendNotification(notification, [recipientId]);
      }

      console.log(`✅ Real-time follow-up notification triggered for: ${customerName}`);
    } catch (error) {
      console.error('Error triggering follow-up notification:', error);
      throw error;
    }
  }

  /**
   * Trigger real-time notification for payment received
   */
  async triggerPaymentReceivedNotification(
    paymentId: string,
    amount: number,
    customerName: string,
    recipientId: string
  ): Promise<void> {
    try {
      const notification = await notificationService.createNotification({
        userId: recipientId,
        type: 'payment_due',
        title: 'Payment Received',
        message: `Payment of ₹${amount.toLocaleString()} received from ${customerName}`,
        priority: 'medium',
        category: 'payment',
        customerId: paymentId,
        metadata: {
          amount,
          customerName,
          action: 'view_payment'
        },
        actionUrl: `/payments/${paymentId}`
      });

      // Send real-time notification via WebSocket
      if (socketService) {
        await socketService.sendNotification(notification, [recipientId]);
      }

      console.log(`✅ Real-time payment received notification triggered for: ${customerName}`);
    } catch (error) {
      console.error('Error triggering payment received notification:', error);
      throw error;
    }
  }

  /**
   * Trigger real-time notification for invoice created
   */
  async triggerInvoiceCreatedNotification(
    invoiceId: string,
    invoiceNumber: string,
    customerName: string,
    amount: number,
    recipientId: string
  ): Promise<void> {
    try {
      const notification = await notificationService.createNotification({
        userId: recipientId,
        type: 'general',
        title: 'Invoice Created',
        message: `Invoice #${invoiceNumber} created for ${customerName} - ₹${amount.toLocaleString()}`,
        priority: 'medium',
        category: 'payment',
        customerId: invoiceId,
        metadata: {
          invoiceNumber,
          customerName,
          amount,
          action: 'view_invoice'
        },
        actionUrl: `/invoices/${invoiceId}`
      });

      // Send real-time notification via WebSocket
      if (socketService) {
        await socketService.sendNotification(notification, [recipientId]);
      }

      console.log(`✅ Real-time invoice created notification triggered for: ${customerName}`);
    } catch (error) {
      console.error('Error triggering invoice created notification:', error);
      throw error;
    }
  }

  /**
   * Trigger real-time notification for AMC expiry
   */
  async triggerAMCExpiryNotification(
    customerId: string,
    customerName: string,
    amcExpiryDate: Date,
    recipientIds: string[]
  ): Promise<void> {
    try {
      const notification = await notificationService.createNotification({
        userId: recipientIds[0], // Create for first recipient, then broadcast
        type: 'amc_expiry',
        title: 'AMC Expiry Reminder',
        message: `AMC for customer ${customerName} expires on ${amcExpiryDate.toLocaleDateString()}`,
        priority: 'high',
        category: 'service',
        customerId: customerId,
        metadata: {
          customerName,
          expiryDate: amcExpiryDate,
          action: 'view_customer'
        },
        actionUrl: `/customers/${customerId}`
      });

      // Send real-time notification via WebSocket to all recipients
      if (socketService) {
        await socketService.sendNotification(notification, recipientIds);
      }

      console.log(`✅ Real-time AMC expiry notification triggered for: ${customerName}`);
    } catch (error) {
      console.error('Error triggering AMC expiry notification:', error);
      throw error;
    }
  }

  /**
   * Trigger real-time notification for service reminders
   */
  async triggerServiceReminderNotification(
    customerId: string,
    customerName: string,
    serviceType: string,
    dueDate: Date,
    recipientIds: string[]
  ): Promise<void> {
    try {
      const notification = await notificationService.createNotification({
        userId: recipientIds[0], // Create for first recipient, then broadcast
        type: 'service_reminder',
        title: 'Service Reminder',
        message: `${serviceType} service for customer ${customerName} is due on ${dueDate.toLocaleDateString()}`,
        priority: 'medium',
        category: 'service',
        customerId: customerId,
        metadata: {
          customerName,
          serviceType,
          dueDate,
          action: 'view_customer'
        },
        actionUrl: `/customers/${customerId}`
      });

      // Send real-time notification via WebSocket to all recipients
      if (socketService) {
        await socketService.sendNotification(notification, recipientIds);
      }

      console.log(`✅ Real-time service reminder notification triggered for: ${customerName}`);
    } catch (error) {
      console.error('Error triggering service reminder notification:', error);
      throw error;
    }
  }

  /**
   * Broadcast system message to all online users
   */
  async broadcastSystemMessage(
    message: string,
    messageType: 'info' | 'warning' | 'error' | 'success' = 'info',
    filter?: (user: any) => boolean
  ): Promise<void> {
    try {
      if (socketService) {
        socketService.sendSystemMessage([], message, messageType);
        console.log(`✅ System message broadcasted: ${message}`);
      }
    } catch (error) {
      console.error('Error broadcasting system message:', error);
      throw error;
    }
  }

  /**
   * Send notification to users with specific module access
   */
  async sendModuleNotification(
    module: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    category: 'system' | 'general' = 'system',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Get users with access to the module
      const users = await User.find({
        $or: [
          { role: { $in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER] } },
          { 
            moduleAccess: { 
              $elemMatch: { 
                module: module, 
                access: true 
              } 
            } 
          }
        ],
        status: 'active'
      }).select('_id');

      if (users.length === 0) {
        console.log(`No users found with access to module: ${module}`);
        return;
      }

      const userIds = users.map(user => (user._id as any).toString());

      // Create notifications for all users
      const notifications = await notificationService.createBulkNotifications({
        userIds,
        type: 'system_alert',
        title,
        message,
        priority,
        category,
        metadata: metadata || {}
      });

      // Send real-time notifications via WebSocket
      for (const notification of notifications) {
        if (socketService) {
          await socketService.sendNotification(notification, [notification.userId.toString()]);
        }
      }

      console.log(`✅ Module notification sent to ${notifications.length} users for module: ${module}`);
    } catch (error) {
      console.error('Error sending module notification:', error);
      throw error;
    }
  }
}

export const realTimeNotificationService = RealTimeNotificationService.getInstance();
export default realTimeNotificationService; 