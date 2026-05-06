import { api } from "./api";

export async function getAdminStats(params) {
  const res = await api.get("/admin/stats", { params });
  return res.data;
}

// ── User management ──────────────────────────────────────────────────────────
export async function listAdminUsers(params) {
  const res = await api.get("/admin/users", { params });
  return res.data;
}

export async function updateAdminUser(id, data) {
  const res = await api.patch(`/admin/users/${id}`, data);
  return res.data;
}

export async function toggleAdminUserStatus(id) {
  const res = await api.patch(`/admin/users/${id}/toggle-status`);
  return res.data;
}

export async function createAdminUser(data) {
  const res = await api.post("/admin/users", data);
  return res.data;
}

export async function updateDoctorPassword(id, data) {
  const res = await api.patch(`/admin/users/${id}/password`, data);
  return res.data;
}
