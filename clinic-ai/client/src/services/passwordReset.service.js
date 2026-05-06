import { api } from "./api";

export const requestPasswordReset = async (email) =>
  (await api.post("/auth/forgot-password/request", { email })).data;

export const resendPasswordResetOtp = async (resetId) =>
  (await api.post("/auth/forgot-password/resend", { resetId })).data;

export const verifyPasswordResetOtp = async ({ resetId, code }) =>
  (await api.post("/auth/forgot-password/verify", { resetId, code })).data;

export const confirmPasswordReset = async ({ resetId, password, confirmPassword }) =>
  (await api.post("/auth/forgot-password/reset", { resetId, password, confirmPassword })).data;
