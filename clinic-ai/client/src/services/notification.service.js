import { api } from "./api";

/** GET /notifications — list + unreadCount */
export function listNotifications() {
  return api.get("/notifications").then((r) => r.data);
}

/** GET /notifications/unread-count */
export function getUnreadCount() {
  return api.get("/notifications/unread-count").then((r) => r.data);
}

/** PATCH /notifications/:id/read */
export function markNotificationRead(id) {
  return api.patch(`/notifications/${id}/read`).then((r) => r.data);
}

/** PATCH /notifications/read-all */
export function markAllNotificationsRead() {
  return api.patch("/notifications/read-all").then((r) => r.data);
}
