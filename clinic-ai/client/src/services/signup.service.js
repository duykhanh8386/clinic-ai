import { api } from "./api";

export const signupStart = async (payload) => (await api.post("/auth/signup/start", payload)).data;
export const signupResend = async (signupId) => (await api.post("/auth/signup/resend", { signupId })).data;
export const signupVerify = async ({ signupId, code }) => (await api.post("/auth/signup/verify", { signupId, code })).data;