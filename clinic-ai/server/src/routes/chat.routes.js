import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { chatRateLimit } from "../middleware/chatRateLimit.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import {
  chatSessionIdParamSchema,
  createChatMessageSchema,
  createChatSessionSchema,
} from "../schemas/chat.schema.js";
import * as chatController from "../controllers/chat.controller.js";

const router = Router();

// Guest endpoint — không yêu cầu đăng nhập, không lưu DB
router.post("/chat/guest/message", chatRateLimit, validateBody(createChatMessageSchema), chatController.guestMessage);

router.post("/chat/sessions", requireAuth, validateBody(createChatSessionSchema), chatController.createSession);
router.get("/chat/sessions/:id", requireAuth, validateParams(chatSessionIdParamSchema), chatController.getSession);
router.post(
  "/chat/sessions/:id/messages",
  requireAuth,
  chatRateLimit,
  validateParams(chatSessionIdParamSchema),
  validateBody(createChatMessageSchema),
  chatController.addMessage
);

export default router;
