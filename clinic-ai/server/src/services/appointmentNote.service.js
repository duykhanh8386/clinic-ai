import { prisma } from "../config/prisma.js";
import { createHttpError } from "../utils/httpError.js";
import { getDoctorProfileIdByUserId } from "./appointment.service.js";

function normalize(note) {
  return {
    id: note.id,
    appointmentId: note.appointmentId,
    diagnosis: note.diagnosis,
    prescriptionNotes: note.prescriptionNotes,
    followUpDays: note.followUpDays,
    notes: note.notes,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

async function assertDoctorAccess(appointmentId, user) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, doctorId: true, patientId: true, status: true },
  });

  if (!appointment) {
    throw createHttpError(404, "APPOINTMENT_NOT_FOUND", "Appointment not found");
  }

  if (user.role === "ADMIN") return appointment;

  if (user.role === "DOCTOR") {
    const doctorId = await getDoctorProfileIdByUserId(user.id);
    if (appointment.doctorId !== doctorId) {
      throw createHttpError(403, "FORBIDDEN", "You cannot access this appointment");
    }
    return appointment;
  }

  if (user.role === "PATIENT") {
    if (appointment.patientId !== user.id) {
      throw createHttpError(403, "FORBIDDEN", "You cannot access this appointment");
    }
    return appointment;
  }

  throw createHttpError(403, "FORBIDDEN", "Access denied");
}

/**
 * Tạo hoặc cập nhật ghi chú sau khám (chỉ bác sĩ sở hữu lịch hẹn hoặc admin).
 */
export async function upsertAppointmentNote({ appointmentId, user, diagnosis, prescriptionNotes, followUpDays, notes }) {
  const appointment = await assertDoctorAccess(appointmentId, user);

  // Chỉ bác sĩ và admin được ghi chú
  if (user.role === "PATIENT") {
    throw createHttpError(403, "FORBIDDEN", "Bệnh nhân không thể ghi chú sau khám");
  }

  // Bác sĩ chỉ có thể ghi sau khi đã khám xong (DONE) hoặc đang khám (CONFIRMED)
  if (user.role === "DOCTOR" && !["CONFIRMED", "DONE"].includes(appointment.status)) {
    throw createHttpError(400, "INVALID_STATUS", "Chỉ có thể thêm ghi chú khi lịch hẹn đang CONFIRMED hoặc DONE");
  }

  const note = await prisma.appointmentNote.upsert({
    where: { appointmentId },
    update: { diagnosis, prescriptionNotes, followUpDays: followUpDays ?? null, notes },
    create: { appointmentId, diagnosis, prescriptionNotes, followUpDays: followUpDays ?? null, notes },
  });

  return normalize(note);
}

/**
 * Lấy ghi chú sau khám (bác sĩ, bệnh nhân sở hữu, admin đều được xem).
 */
export async function getAppointmentNote({ appointmentId, user }) {
  await assertDoctorAccess(appointmentId, user);

  const note = await prisma.appointmentNote.findUnique({
    where: { appointmentId },
  });

  if (!note) return null;
  return normalize(note);
}
