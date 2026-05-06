import { api } from "./api";

function buildStreamUrl() {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  const baseUrl = String(api.defaults.baseURL || "").replace(/\/$/, "");
  return `${baseUrl}/appointments/stream?access_token=${encodeURIComponent(token)}`;
}

export function createDoctorAppointmentEventSource() {
  const streamUrl = buildStreamUrl();
  if (!streamUrl) return null;

  return new EventSource(streamUrl, { withCredentials: true });
}

export function createPatientAppointmentEventSource() {
  const streamUrl = buildStreamUrl();
  if (!streamUrl) return null;

  return new EventSource(streamUrl, { withCredentials: true });
}
