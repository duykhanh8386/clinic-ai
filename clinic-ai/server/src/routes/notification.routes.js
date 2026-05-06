import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as notificationController from "../controllers/notification.controller.js";

const router = Router();

// GET  /notifications          – danh sách + unreadCount
router.get("/notifications", requireAuth, notificationController.list);

// GET  /notifications/unread-count
router.get("/notifications/unread-count", requireAuth, notificationController.unreadCount);

// PATCH /notifications/:id/read  – đánh dấu 1 đã đọc
router.patch("/notifications/:id/read", requireAuth, notificationController.markOneRead);

// PATCH /notifications/read-all  – đánh dấu tất cả đã đọc
router.patch("/notifications/read-all", requireAuth, notificationController.markAllRead);

export default router;
