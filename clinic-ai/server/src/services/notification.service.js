import { prisma } from "../config/prisma.js";
import { createHttpError } from "../utils/httpError.js";

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  message: true,
  link: true,
  appointmentId: true,
  isRead: true,
  createdAt: true,
};

/**
 * Lấy danh sách thông báo của người dùng (30 mục mới nhất)
 */
export async function listNotifications({ userId, limit = 30 }) {
  const take = Math.min(50, Math.max(1, Number(limit) || 30));
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: NOTIFICATION_SELECT,
  });
}

/**
 * Số thông báo chưa đọc
 */
export async function getUnreadCount(userId) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

/**
 * Đánh dấu một thông báo đã đọc
 */
export async function markRead(notificationId, userId) {
  const n = await prisma.notification.findUnique({ where: { id: notificationId }, select: { id: true, userId: true } });
  if (!n || n.userId !== userId) throw createHttpError(404, "NOT_FOUND", "Notification not found");
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
    select: NOTIFICATION_SELECT,
  });
}

/**
 * Đánh dấu tất cả thông báo đã đọc
 */
export async function markAllRead(userId) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

/**
 * Tạo thông báo mới và trả về bản ghi đầy đủ
 */
export async function createNotification({ userId, type, title, message, link, appointmentId }) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link: link ?? null,
      appointmentId: appointmentId ?? null,
    },
    select: NOTIFICATION_SELECT,
  });
}
