import { Request, Response, NextFunction } from 'express';
import { Notification, INotification } from '../models/Notification';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

// @desc    Get user notifications with pagination
// @route   GET /api/v1/notifications
// @access  Private
export const getUserNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isRead = req.query.isRead ? req.query.isRead === 'true' : undefined;
    const type = req.query.type as string;

    const skip = (page - 1) * limit;
    const userId = req.user!.id;

    // Build query
    const query: any = { recipientId: userId };
    if (isRead !== undefined) {
      query.isRead = isRead;
    }
    if (type) {
      query.type = type;
    }

    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('entityId', 'name email phone') // Populate related entity
      .lean();

    // Get total count for pagination
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      recipientId: userId, 
      isRead: false 
    });

    const response: APIResponse = {
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
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
export const markNotificationRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId },
      { isRead: true },
      { new: true }
    );

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
// @route   PATCH /api/v1/notifications/mark-all-read
// @access  Private
export const markAllNotificationsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const result = await Notification.updateMany(
      { recipientId: userId, isRead: false },
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
    next(new AppError('Failed to mark all notifications as read', 500));
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

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipientId: userId
    });

    if (!notification) {
      return next(new AppError('Notification not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Notification deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error deleting notification:', error);
    next(new AppError('Failed to delete notification', 500));
  }
};

// @desc    Get unread count
// @route   GET /api/v1/notifications/unread-count
// @access  Private
export const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false
    });

    const response: APIResponse = {
      success: true,
      message: 'Unread count retrieved',
      data: { unreadCount }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching unread count:', error);
    next(new AppError('Failed to fetch unread count', 500));
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
    const {
      recipientId,
      type,
      content,
      entityId,
      entityType,
      priority = 'medium',
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!recipientId || !type || !content || !entityId || !entityType) {
      return next(new AppError('Missing required notification fields', 400));
    }

    const notification = new Notification({
      recipientId,
      type,
      content,
      entityId,
      entityType,
      priority,
      metadata,
      isRead: false
    });

    await notification.save();

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

// Utility function to generate notifications (for internal use)
export const generateNotification = async (
  recipientId: string,
  type: INotification['type'],
  content: string,
  entityId: string,
  entityType: INotification['entityType'],
  priority: 'low' | 'medium' | 'high' = 'medium',
  metadata: Record<string, any> = {}
): Promise<INotification | null> => {
  try {
    const notification = new Notification({
      recipientId,
      type,
      content,
      entityId,
      entityType,
      priority,
      metadata,
      isRead: false
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error generating notification:', error);
    return null;
  }
};

// Utility function to generate multiple notifications
export const generateMultipleNotifications = async (
  notifications: Array<{
    recipientId: string;
    type: INotification['type'];
    content: string;
    entityId: string;
    entityType: INotification['entityType'];
    priority?: 'low' | 'medium' | 'high';
    metadata?: Record<string, any>;
  }>
): Promise<INotification[]> => {
  try {
    const notificationPromises = notifications.map(notification =>
      generateNotification(
        notification.recipientId,
        notification.type,
        notification.content,
        notification.entityId,
        notification.entityType,
        notification.priority,
        notification.metadata
      )
    );

    const results = await Promise.all(notificationPromises);
    return results.filter(Boolean) as INotification[];
  } catch (error) {
    console.error('Error generating multiple notifications:', error);
    return [];
  }
}; 