import { api } from "./api";

export async function getAppointmentNote(appointmentId) {
  const res = await api.get(`/appointments/${appointmentId}/note`);
  return res.data;
}

export async function upsertAppointmentNote(appointmentId, payload) {
  const res = await api.post(`/appointments/${appointmentId}/note`, payload);
  return res.data;
}
