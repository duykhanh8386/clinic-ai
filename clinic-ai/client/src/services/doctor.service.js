import { api } from "./api";

export async function listDoctors(params) {
  const res = await api.get("/doctors", { params });
  return res.data;
}

export async function getDoctor(id) {
  const res = await api.get(`/doctors/${id}`);
  return res.data;
}

export async function createDoctor(payload) {
  const res = await api.post("/doctors", payload);
  return res.data;
}

export async function updateDoctor(id, payload) {
  const res = await api.put(`/doctors/${id}`, payload);
  return res.data;
}

export async function updateServiceDoctor(id, payload) {
  const res = await api.put(`/doctors/${id}/services`, payload);
  return res.data;
}

export async function listDoctorAvailabilityRanges(id, params) {
  const res = await api.get(`/doctors/${id}/availability-ranges`, { params });
  return res.data;
}

export async function getDoctorAvailabilityRange(id, rangeId) {
  const res = await api.get(`/doctors/${id}/availability-ranges/${rangeId}`);
  return res.data;
}

export async function createDoctorAvailabilityRange(id, payload) {
  const res = await api.post(`/doctors/${id}/availability-ranges`, payload);
  return res.data;
}

export async function updateDoctorAvailabilityRange(id, rangeId, payload) {
  const res = await api.put(`/doctors/${id}/availability-ranges/${rangeId}`, payload);
  return res.data;
}

export async function deleteDoctorAvailabilityRange(id, rangeId) {
  const res = await api.delete(`/doctors/${id}/availability-ranges/${rangeId}`);
  return res.data;
}

export async function getDoctorAvailability(id) {
  const res = await api.get(`/doctors/${id}/availability`);
  return res.data;
}

export async function toggleDoctorStatus(id) {
  const res = await api.patch(`/doctors/${id}/status`);
  return res.data;
}

export async function uploadDoctorAvatar(id, file) {
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await api.patch(`/doctors/${id}/avatar`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
