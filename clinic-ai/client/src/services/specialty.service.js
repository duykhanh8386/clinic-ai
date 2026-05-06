import { api } from "./api";

export async function listSpecialties(params = {}) {
  const res = await api.get("/specialties", { params });
  return res.data;
}

export async function getSpecialty(id) {
  const res = await api.get(`/specialties/${id}`);
  return res.data;
}

export async function postSpecialty(payload) {
  const res = await api.post("/specialties", payload);
  return res.data;
}

export async function putSpecialty(id, payload) {
  const res = await api.put(`/specialties/${id}`, payload);
  return res.data;
}

export async function deleteSpecialty(id) {
  const res = await api.delete(`/specialties/${id}`);
  return res.data;
}
