import { api } from "./api";

export async function listSlots(params) {
  const res = await api.get("/slots", { params });
  return res.data;
}

export async function listSlotsByRange(params) {
  const res = await api.get("/slots/range", { params });
  return res.data;
}

export async function generateSlots(payload) {
  const res = await api.post("/slots/generate", payload);
  return res.data;
}