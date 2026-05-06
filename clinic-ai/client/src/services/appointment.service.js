import { api } from "./api";

export async function createAppointment(payload) {
  const res = await api.post("/appointments", payload);
  return res.data;
}

export async function listAppointments(params) {
  const res = await api.get("/appointments", { params });
  return res.data;
}

export async function getAppointment(id) {
  const res = await api.get(`/appointments/${id}`);
  return res.data;
}

export async function cancelAppointment(id, payload = {}) {
  const res = await api.post(`/appointments/${id}/cancel`, payload);
  return res.data;
}

export async function rescheduleAppointment(id, payload) {
  const res = await api.post(`/appointments/${id}/reschedule`, payload);
  return res.data;
}

export async function updateAppointmentStatus(id, payload) {
  const res = await api.patch(`/appointments/${id}/status`, payload);
  return res.data;
}