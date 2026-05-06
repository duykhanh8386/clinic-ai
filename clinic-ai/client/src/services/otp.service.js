import { api } from "./api";

export const requestEmailOtp = async () => (await api.post("/auth/verify-email/request")).data;
export const confirmEmailOtp = async (code) => (await api.post("/auth/verify-email/confirm", { code })).data;