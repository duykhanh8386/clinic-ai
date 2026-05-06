import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});
function getAccessToken() {
  return localStorage.getItem("accessToken");
}
function setAccessToken(token) {
  localStorage.setItem("accessToken", token);
}
function clearSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("me");
}

let refreshPromise = null;

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url;
    const errorCode = error.response?.data?.error?.code;

    if (!original) {
      return Promise.reject(error);
    }

    if (errorCode === "ACCOUNT_INACTIVE") {
      clearSession();
      if (!(typeof url === "string" && url.includes("/auth/"))) {
        window.location.assign("/login");
      }
      return Promise.reject(error);
    }

    // Do not attempt refresh for auth calls themselves (login, refresh, register, signup, etc.)
    if (status === 401 && !original._retry && !(typeof url === "string" && url.includes("/auth/"))) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = api
          .post("/auth/refresh")
          .then((r) => {
            const newToken = r.data?.data?.accessToken;
            if (newToken) setAccessToken(newToken);
            return newToken || null;
          })
          .catch(() => {
            clearSession();
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    return Promise.reject(error);
  }
);
