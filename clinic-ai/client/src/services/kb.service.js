import { api } from "./api";

export async function createKbDocument(payload) {
  const res = await api.post("/kb/documents", payload);
  return res.data;
}

export async function processKbDocument(id, payload) {
  const res = await api.post(`/kb/documents/${id}/process`, payload);
  return res.data;
}

export async function listKbDocuments(params) {
  const res = await api.get("/kb/documents", { params });
  return res.data;
}

export async function importKbExcel({ file, autoProcess = true }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("autoProcess", autoProcess ? "true" : "false");

  const res = await api.post("/kb/documents/import-excel", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getKbDocument(id) {
  const res = await api.get(`/kb/documents/${id}`);
  return res.data;
}

export async function updateKbDocument(id, payload) {
  const res = await api.put(`/kb/documents/${id}`, payload);
  return res.data;
}

export async function deleteKbDocument(id) {
  const res = await api.delete(`/kb/documents/${id}`);
  return res.data;
}
