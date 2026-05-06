import { api } from "./api";

export async function upsertPrevisit(appointmentId, payload) {
  const res = await api.post(`/appointments/${appointmentId}/previsit`, payload);
  return res.data;
}

export async function getPrevisit(appointmentId) {
  const res = await api.get(`/appointments/${appointmentId}/previsit`);
  return res.data;
}
