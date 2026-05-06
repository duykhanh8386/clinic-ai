import * as notificationService from "../services/notification.service.js";

export async function list(req, res, next) {
  try {
    const notifications = await notificationService.listNotifications({ userId: req.user.id });
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, data: notifications, meta: { unreadCount } });
  } catch (err) {
    next(err);
  }
}

export async function unreadCount(req, res, next) {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
}

export async function markOneRead(req, res, next) {
  try {
    const notification = await notificationService.markRead(req.params.id, req.user.id);
    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    await notificationService.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
