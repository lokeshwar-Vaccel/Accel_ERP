import { apiClient } from './api';
// Notification types
export type NotificationType = 
  | 'assignment' 
  | 'status_change' 
  | 'contact_update' 
  | 'follow_up' 
  | 'payment_received' 
  | 'invoice_created';

export type EntityType = 'customer' | 'invoice' | 'contact' | 'payment';

// Notification data interface
export interface NotificationData {
  recipientId: string;
  type: NotificationType;
  content: string;
  entityId: string;
  entityType: EntityType;
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

// Notification service class
class NotificationService {
  private static instance: NotificationService;
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Create a notification
  async createNotification(data: NotificationData) {
    try {
      const response = await apiClient.notifications.create(data);
      return response;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  // Create customer assignment notification
  async createCustomerAssignmentNotification(
    customerId: string,
    customerName: string,
    assignedToId: string,
    assignedByName: string
  ) {
    return this.createNotification({
      recipientId: assignedToId,
      type: 'assignment',
      content: `New customer "${customerName}" has been assigned to you by ${assignedByName}`,
      entityId: customerId,
      entityType: 'customer',
      priority: 'medium',
      metadata: {
        customerName,
        assignedByName,
        action: 'view_customer'
      }
    });
  }

  // Create customer status change notification
  async createStatusChangeNotification(
    customerId: string,
    customerName: string,
    oldStatus: string,
    newStatus: string,
    updatedBy: string,
    recipientId: string
  ) {
    return this.createNotification({
      recipientId,
      type: 'status_change',
      content: `Customer "${customerName}" status changed from ${oldStatus} to ${newStatus} by ${updatedBy}`,
      entityId: customerId,
      entityType: 'customer',
      priority: 'medium',
      metadata: {
        customerName,
        oldStatus,
        newStatus,
        updatedBy,
        action: 'view_customer'
      }
    });
  }

  // Create contact update notification
  async createContactUpdateNotification(
    customerId: string,
    customerName: string,
    contactType: string,
    updatedBy: string,
    recipientId: string
  ) {
    return this.createNotification({
      recipientId,
      type: 'contact_update',
      content: `New ${contactType} contact added for customer "${customerName}" by ${updatedBy}`,
      entityId: customerId,
      entityType: 'contact',
      priority: 'low',
      metadata: {
        customerName,
        contactType,
        updatedBy,
        action: 'view_contact_history'
      }
    });
  }

  // Create follow-up reminder notification
  async createFollowUpNotification(
    customerId: string,
    customerName: string,
    followUpDate: string,
    recipientId: string
  ) {
    return this.createNotification({
      recipientId,
      type: 'follow_up',
      content: `Follow-up reminder for customer "${customerName}" scheduled for ${followUpDate}`,
      entityId: customerId,
      entityType: 'customer',
      priority: 'high',
      metadata: {
        customerName,
        followUpDate,
        action: 'schedule_follow_up'
      }
    });
  }

  // Create payment received notification
  async createPaymentReceivedNotification(
    paymentId: string,
    amount: number,
    customerName: string,
    recipientId: string
  ) {
    return this.createNotification({
      recipientId,
      type: 'payment_received',
      content: `Payment of ₹${amount.toLocaleString()} received from ${customerName}`,
      entityId: paymentId,
      entityType: 'payment',
      priority: 'medium',
      metadata: {
        amount,
        customerName,
        action: 'view_payment'
      }
    });
  }

  // Create invoice created notification
  async createInvoiceCreatedNotification(
    invoiceId: string,
    invoiceNumber: string,
    customerName: string,
    amount: number,
    recipientId: string
  ) {
    return this.createNotification({
      recipientId,
      type: 'invoice_created',
      content: `Invoice #${invoiceNumber} created for ${customerName} - ₹${amount.toLocaleString()}`,
      entityId: invoiceId,
      entityType: 'invoice',
      priority: 'medium',
      metadata: {
        invoiceNumber,
        customerName,
        amount,
        action: 'view_invoice'
      }
    });
  }

  // Initialize real-time notifications (Server-Sent Events)
  initializeRealTimeNotifications(userId: string, onNotification: (notification: any) => void) {
    try {
      // Close existing connection
      if (this.eventSource) {
        this.eventSource.close();
      }

      // Create new EventSource connection
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      this.eventSource = new EventSource(`${baseUrl}/api/v1/notifications/stream?userId=${userId}`);

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          onNotification(notification);
        } catch (error) {
          console.error('Error parsing notification data:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('Real-time notification connection error:', error);
        this.handleReconnect(userId, onNotification);
      };

    } catch (error) {
      console.error('Failed to initialize real-time notifications:', error);
    }
  }

  // Handle reconnection for real-time notifications
  private handleReconnect(userId: string, onNotification: (notification: any) => void) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      setTimeout(() => {
        this.initializeRealTimeNotifications(userId, onNotification);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Close real-time notification connection
  closeRealTimeNotifications() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // Bulk create notifications
  async createBulkNotifications(notifications: NotificationData[]) {
    try {
      const promises = notifications.map(notification => 
        this.createNotification(notification)
      );
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');
      
      if (failed.length > 0) {
        console.warn(`${failed.length} notifications failed to create`);
      }
      
      return {
        successful: successful.length,
        failed: failed.length,
        results
      };
    } catch (error) {
      console.error('Failed to create bulk notifications:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats() {
    try {
      // This would need to be implemented in the backend
      const response = await apiClient.notifications.getAll({ stats: true });
      return response;
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
export default notificationService; 