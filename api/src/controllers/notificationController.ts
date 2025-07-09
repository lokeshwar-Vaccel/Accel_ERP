import { Request, Response, NextFunction } from 'express';
import { Notification, INotification } from '../models/Notification';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

// @desc    Get user notifications
// @route   GET /api/v1/notifications
// @access  Private
export const getUserNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20, type, isRead } = req.query;
    const userId = req.user!.id;

    // Build query
    const query: any = { userId };
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const notifications = await Notification.find(query)
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

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

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    ).populate('customerId', 'name email phone');

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

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    const response: APIResponse = {
      success: true,
      message: 'All notifications marked as read',
      data: { updatedCount: result.modifiedCount }
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

    const notification = await Notification.findOneAndDelete({ _id: id, userId });

    if (!notification) {
      return next(new AppError('Notification not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Notification deleted successfully',
      data: { notification }
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

    const [unreadCount, totalCount, typeStats] = await Promise.all([
      Notification.countDocuments({ userId, isRead: false }),
      Notification.countDocuments({ userId }),
      Notification.aggregate([
        { $match: { userId: new (require('mongoose')).Types.ObjectId(userId) } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Notification statistics retrieved successfully',
      data: {
        unreadCount,
        totalCount,
        typeStats: typeStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      }
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
    const { userId, customerId, type, title, message, priority = 'medium', metadata } = req.body;

    // Validate required fields
    if (!userId || !type || !title || !message) {
      return next(new AppError('User ID, type, title, and message are required', 400));
    }

    const notification = new Notification({
      userId,
      customerId,
      type,
      title,
      message,
      priority,
      metadata,
      createdBy: req.user!.id
    });

    await notification.save();

    const populatedNotification = await notification.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'createdBy', select: 'firstName lastName email' }
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Notification created successfully',
      data: { notification: populatedNotification }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating notification:', error);
    next(new AppError('Failed to create notification', 500));
  }
};

// Utility function to create notifications (for internal use)
export const createNotificationForUser = async (
  userId: string,
  type: INotification['type'],
  title: string,
  message: string,
  options: {
    customerId?: string;
    priority?: 'low' | 'medium' | 'high';
    metadata?: Record<string, any>;
    createdBy?: string;
  } = {}
): Promise<INotification> => {
  try {
    const notification = new Notification({
      userId,
      customerId: options.customerId,
      type,
      title,
      message,
      priority: options.priority || 'medium',
      metadata: options.metadata || {},
      createdBy: options.createdBy
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification for user:', error);
    throw error;
  }
};

// Utility function to create customer assignment notification
export const createAssignmentNotification = async (
  userId: string,
  customerId: string,
  customerName: string
): Promise<INotification> => {
  return createNotificationForUser(
    userId,
    'assignment',
    'New Customer Assignment',
    `You have been assigned a new customer: ${customerName}`,
    {
      customerId,
      priority: 'high',
      metadata: { assignmentType: 'new_customer' }
    }
  );
};

// Utility function to create status change notification
export const createStatusChangeNotification = async (
  userId: string,
  customerId: string,
  customerName: string,
  oldStatus: string,
  newStatus: string
): Promise<INotification> => {
  return createNotificationForUser(
    userId,
    'status_change',
    'Customer Status Updated',
    `Customer ${customerName} status changed from "${oldStatus}" to "${newStatus}"`,
    {
      customerId,
      priority: 'medium',
      metadata: { oldStatus, newStatus }
    }
  );
};

// Utility function to create follow-up reminder notification
export const createFollowUpNotification = async (
  userId: string,
  customerId: string,
  customerName: string,
  followUpDate: Date
): Promise<INotification> => {
  return createNotificationForUser(
    userId,
    'follow_up',
    'Follow-up Reminder',
    `Follow-up reminder for customer ${customerName} on ${followUpDate.toLocaleDateString()}`,
    {
      customerId,
      priority: 'high',
      metadata: { followUpDate }
    }
  );
};