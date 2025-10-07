import { Request, Response, NextFunction } from 'express';
import { Notification, INotification } from '../models/Notification';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import notificationService from '../services/notificationService';
import inventoryNotificationService from '../services/inventoryNotificationService';

// @desc    Get user notifications
// @route   GET /api/v1/notifications
// @access  Private
export const getUserNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20, type, category, priority, isRead } = req.query;
    const userId = req.user!.id;

    // Build query
    const query: any = { userId: new (require('mongoose')).Types.ObjectId(userId) };
    if (type) query.type = type;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const notifications = await Notification.find(query)
      .populate('customerId', 'name email phone')
      .populate('productId', 'name partNo')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId: new (require('mongoose')).Types.ObjectId(userId), isRead: false });

    const response: APIResponse = {
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        unreadCount
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    next(new AppError('Failed to fetch notifications', 500));
  }
};

// @desc    Get notifications by category
// @route   GET /api/v1/notifications/category/:category
// @access  Private
export const getNotificationsByCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;
    const userId = req.user!.id;

    // Use the notification service instead of static method
    const notifications = await Notification.find({ 
      userId: new (require('mongoose')).Types.ObjectId(userId),
      category 
    })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .populate('customerId', 'name email phone')
    .populate('productId', 'name partNo')
    .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: `${category} notifications retrieved successfully`,
      data: { notifications }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching notifications by category:', error);
    next(new AppError('Failed to fetch notifications by category', 500));
  }
};

// @desc    Get urgent notifications
// @route   GET /api/v1/notifications/urgent
// @access  Private
export const getUrgentNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Use the notification service instead of static method
    const notifications = await Notification.find({ 
      userId: new (require('mongoose')).Types.ObjectId(userId),
      priority: 'urgent',
      isRead: false 
    })
    .sort({ createdAt: -1 })
    .populate('customerId', 'name email phone')
    .populate('productId', 'name partNo')
    .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'Urgent notifications retrieved successfully',
      data: { notifications }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching urgent notifications:', error);
    next(new AppError('Failed to fetch urgent notifications', 500));
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private
export const markNotificationAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const notification = await notificationService.markAsRead(id, userId);

    if (!notification) {
      return next(new AppError('Notification not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    next(new AppError('Failed to mark notification as read', 500));
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/v1/notifications/read-all
// @access  Private
export const markAllNotificationsAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const updatedCount = await notificationService.markAllAsRead(userId);

    const response: APIResponse = {
      success: true,
      message: 'All notifications marked as read',
      data: { updatedCount }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    next(new AppError('Failed to mark notifications as read', 500));
  }
};

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
export const deleteNotification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const deleted = await notificationService.deleteNotification(id, userId);

    if (!deleted) {
      return next(new AppError('Notification not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Notification deleted successfully',
      data: { deleted: true }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error deleting notification:', error);
    next(new AppError('Failed to delete notification', 500));
  }
};

// @desc    Get notification statistics
// @route   GET /api/v1/notifications/stats
// @access  Private
export const getNotificationStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const stats = await notificationService.getUserNotificationStats(userId);

    const response: APIResponse = {
      success: true,
      message: 'Notification statistics retrieved successfully',
      data: stats
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    next(new AppError('Failed to fetch notification statistics', 500));
  }
};

// @desc    Create notification (internal use)
// @route   POST /api/v1/notifications/create
// @access  Private
export const createNotification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notificationData = req.body;

    // Validate required fields
    if (!notificationData.userId || !notificationData.type || !notificationData.title || !notificationData.message) {
      return next(new AppError('User ID, type, title, and message are required', 400));
    }

    const notification = await notificationService.createNotification({
      ...notificationData,
      createdBy: req.user!.id
    });

    const response: APIResponse = {
      success: true,
      message: 'Notification created successfully',
      data: { notification }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating notification:', error);
    next(new AppError('Failed to create notification', 500));
  }
};

// @desc    Create bulk notifications (internal use)
// @route   POST /api/v1/notifications/create-bulk
// @access  Private
export const createBulkNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bulkData = req.body;

    // Validate required fields
    if (!bulkData.userIds || !bulkData.type || !bulkData.title || !bulkData.message) {
      return next(new AppError('User IDs, type, title, and message are required', 400));
    }

    const notifications = await notificationService.createBulkNotifications({
      ...bulkData,
      createdBy: req.user!.id
    });

    const response: APIResponse = {
      success: true,
      message: 'Bulk notifications created successfully',
      data: { notifications, count: notifications.length }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    next(new AppError('Failed to create bulk notifications', 500));
  }
};

// @desc    Get low stock summary
// @route   GET /api/v1/notifications/low-stock-summary
// @access  Private
export const getLowStockSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const summary = await inventoryNotificationService.getLowStockSummary();

    const response: APIResponse = {
      success: true,
      message: 'Low stock summary retrieved successfully',
      data: { summary }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching low stock summary:', error);
    next(new AppError('Failed to fetch low stock summary', 500));
  }
};

// @desc    Manually trigger low stock notifications
// @route   POST /api/v1/notifications/trigger-low-stock
// @access  Private (Admin only)
export const triggerLowStockNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notificationsCreated = await inventoryNotificationService.createLowStockNotifications();

    const response: APIResponse = {
      success: true,
      message: `Low stock notifications triggered successfully`,
      data: { notificationsCreated }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error triggering low stock notifications:', error);
    next(new AppError('Failed to trigger low stock notifications', 500));
  }
};

// @desc    Get low stock items
// @route   GET /api/v1/notifications/low-stock-items
// @access  Private
export const getLowStockItems = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lowStockItems = await inventoryNotificationService.checkLowStockItems();
    const outOfStockItems = await inventoryNotificationService.checkOutOfStockItems();
    const overStockItems = await inventoryNotificationService.checkOverStockItems();

    const response: APIResponse = {
      success: true,
      message: 'Inventory status items retrieved successfully',
      data: {
        lowStockItems,
        outOfStockItems,
        overStockItems,
        totalLowStock: lowStockItems.length,
        totalOutOfStock: outOfStockItems.length,
        totalOverStock: overStockItems.length
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    next(new AppError('Failed to fetch low stock items', 500));
  }
};

