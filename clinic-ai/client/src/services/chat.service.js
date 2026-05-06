import { api } from "./api";

export async function createChatSession(payload = {}) {
  const res = await api.post("/chat/sessions", payload);
  return res.data;
}

export async function getChatSession(id) {
  const res = await api.get(`/chat/sessions/${id}`);
  return res.data;
}

export async function sendChatMessage(sessionId, payload) {
  const res = await api.post(`/chat/sessions/${sessionId}/messages`, payload);
  return res.data;
}

export async function sendGuestChatMessage(payload) {
  const res = await api.post("/chat/guest/message", payload);
  return res.data;
}
