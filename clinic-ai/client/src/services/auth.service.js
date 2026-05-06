import { api } from "./api";

export async function login(payload) {
  const res = await api.post("/auth/login", payload);
  return res.data;
}

export async function register(payload) {
  const res = await api.post("/auth/register", payload);
  return res.data;
}

export async function refresh() {
  const res = await api.post("/auth/refresh");
  return res.data;
}

export async function getMe(accessToken) {
  const config = accessToken
    ? { headers: { Authorization: `Bearer ${accessToken}` } }
    : undefined;

  const res = await api.get("/me", config);
  return res.data;
}

export async function logout() {
  const res = await api.post("/auth/logout");
  return res.data;
}

export async function updateMe(payload) {
  const res = await api.patch("/me", payload);
  return res.data;
}