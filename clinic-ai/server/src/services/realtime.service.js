const doctorStreams = new Map();
const patientStreams = new Map();

function writeSseEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function ensureDoctorSet(doctorId) {
  if (!doctorStreams.has(doctorId)) {
    doctorStreams.set(doctorId, new Set());
  }
  return doctorStreams.get(doctorId);
}

function ensurePatientSet(patientId) {
  if (!patientStreams.has(patientId)) {
    patientStreams.set(patientId, new Set());
  }
  return patientStreams.get(patientId);
}

export function subscribeDoctorAppointmentStream({ doctorId, res }) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const clients = ensureDoctorSet(doctorId);
  clients.add(res);

  writeSseEvent(res, "connected", {
    connected: true,
    doctorId,
    at: new Date().toISOString(),
  });

  const heartbeat = setInterval(() => {
    writeSseEvent(res, "ping", { at: new Date().toISOString() });
  }, 25000);

  return () => {
    clearInterval(heartbeat);
    const set = doctorStreams.get(doctorId);
    if (!set) return;

    set.delete(res);
    if (set.size === 0) {
      doctorStreams.delete(doctorId);
    }
  };
}

export function subscribePatientAppointmentStream({ patientId, res }) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const clients = ensurePatientSet(patientId);
  clients.add(res);

  writeSseEvent(res, "connected", {
    connected: true,
    patientId,
    at: new Date().toISOString(),
  });

  const heartbeat = setInterval(() => {
    writeSseEvent(res, "ping", { at: new Date().toISOString() });
  }, 25000);

  return () => {
    clearInterval(heartbeat);
    const set = patientStreams.get(patientId);
    if (!set) return;

    set.delete(res);
    if (set.size === 0) {
      patientStreams.delete(patientId);
    }
  };
}

export function publishDoctorAppointmentCreated({ appointment }) {
  const doctorId = appointment?.doctorId;
  if (!doctorId) return;

  const clients = doctorStreams.get(doctorId);
  if (!clients || clients.size === 0) return;

  const payload = {
    type: "appointment_created",
    appointment,
    at: new Date().toISOString(),
  };

  for (const client of clients) {
    try {
      writeSseEvent(client, "appointment_created", payload);
    } catch {
      // Bỏ qua lỗi từng client; cleanup sẽ diễn ra khi socket close.
    }
  }
}

export function publishPatientAppointmentStatusUpdated({ appointment, actorRole }) {
  const patientId = appointment?.patientId;
  if (!patientId) return;

  const clients = patientStreams.get(patientId);
  if (!clients || clients.size === 0) return;

  const payload = {
    type: "appointment_status_updated",
    appointment,
    actorRole,
    at: new Date().toISOString(),
  };

  for (const client of clients) {
    try {
      writeSseEvent(client, "appointment_status_updated", payload);
    } catch {
      // Bỏ qua lỗi từng client; cleanup sẽ diễn ra khi socket close.
    }
  }
}

/**
 * Push thông báo tới bác sĩ qua SSE (doctorId = DoctorProfile.id)
 */
export function publishDoctorNotification({ doctorId, notification }) {
  if (!doctorId) return;
  const clients = doctorStreams.get(doctorId);
  if (!clients || clients.size === 0) return;

  for (const client of clients) {
    try {
      writeSseEvent(client, "notification", { notification, at: new Date().toISOString() });
    } catch {
      // ignore
    }
  }
}

/**
 * Push thông báo tới bệnh nhân qua SSE (patientId = User.id)
 */
export function publishPatientNotification({ patientId, notification }) {
  if (!patientId) return;
  const clients = patientStreams.get(patientId);
  if (!clients || clients.size === 0) return;

  for (const client of clients) {
    try {
      writeSseEvent(client, "notification", { notification, at: new Date().toISOString() });
    } catch {
      // ignore
    }
  }
}
