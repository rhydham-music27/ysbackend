import { Request, Response, NextFunction } from 'express';
import Notification from '../models/Notification';
import { createNotification } from '../services/notificationService';
import { NotificationType, NotificationCategory, NotificationPriority } from '../types/enums';

export async function createNotificationController(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, type, category, priority, title, message, metadata, expiresAt } = req.body;

    const expiresAtDate = expiresAt ? new Date(expiresAt) : undefined;

    const notification = await createNotification({
      userId,
      type,
      category,
      priority: priority || NotificationPriority.MEDIUM,
      title,
      message,
      metadata,
      expiresAt: expiresAtDate,
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    const { category, isRead, limit } = req.query as Record<string, string>;

    const query: Record<string, any> = { user: user._id };

    if (category) {
      query.category = category;
    }

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 50);

    res.status(200).json({
      success: true,
      data: { notifications, count: notifications.length },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUnreadNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    const notifications = await Notification.findUnreadByUser(user._id.toString());

    res.status(200).json({
      success: true,
      data: { notifications, count: notifications.length },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    const unreadCount = await Notification.getUnreadCount(user._id.toString());

    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.user.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage your own notifications.',
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
}

export async function markAsUnread(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.user.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage your own notifications.',
      });
    }

    await notification.markAsUnread();

    res.status(200).json({
      success: true,
      message: 'Notification marked as unread',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    const result = await Notification.markAllAsRead(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: { updatedCount: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.user.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage your own notifications.',
      });
    }

    await Notification.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAllNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    const result = await Notification.deleteMany({ user: user._id });

    res.status(200).json({
      success: true,
      message: 'All notifications deleted',
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    next(error);
  }
}

