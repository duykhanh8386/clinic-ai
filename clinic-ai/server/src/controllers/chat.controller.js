import * as chatService from "../services/chat.service.js";

export async function guestMessage(req, res, next) {
  try {
    const data = await chatService.processGuestMessage({
      content: req.body.content,
      topK: req.body.topK ?? 5,
    });
    res.json({ success: true, data, meta: null });
  } catch (error) {
    next(error);
  }
}

export async function createSession(req, res, next) {
  try {
    const data = await chatService.createChatSession({
      user: req.user,
      appointmentId: req.body.appointmentId,
    });

    res.status(201).json({ success: true, data, meta: null });
  } catch (error) {
    next(error);
  }
}

export async function getSession(req, res, next) {
  try {
    const data = await chatService.getChatSession({
      id: req.params.id,
      user: req.user,
    });

    res.json({ success: true, data, meta: null });
  } catch (error) {
    next(error);
  }
}

export async function addMessage(req, res, next) {
  try {
    const data = await chatService.addChatMessage({
      sessionId: req.params.id,
      user: req.user,
      content: req.body.content,
      topK: req.body.topK,
    });

    res.status(201).json({ success: true, data, meta: null });
  } catch (error) {
    next(error);
  }
}
