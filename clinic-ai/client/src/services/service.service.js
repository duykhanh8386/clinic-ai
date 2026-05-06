import { api } from "./api";

export async function listServices(params = {}) {
  const res = await api.get("/services", { params });
  return res.data; // { success, data, meta }
}

export async function getService(id) {
  const res = await api.get(`/services/${id}`);
  return res.data;
}

export async function putService(id,payload) {
  const res = await api.put(`/services/${id}`,payload);
  return res.data;
}

export async function postService(payload) {
  const res = await api.post(`/services`, payload);
  return res.data;
}

export async function deleteService(id) {
  const res = await api.delete(`/services/${id}`);
  return res.data;
}
