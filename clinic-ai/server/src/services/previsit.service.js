import { prisma } from "../config/prisma.js";
import { createHttpError } from "../utils/httpError.js";
import { getDoctorProfileIdByUserId } from "./appointment.service.js";
import OpenAI from "openai";
import { env } from "../config/env.js";

// Ollama dùng OpenAI-compatible API
const ollamaClient = new OpenAI({
  baseURL: `${env.ollamaBaseUrl}/v1`,
  apiKey: "ollama",
});

/**
 * Tạo tóm tắt tiền khám bằng AI để bác sĩ đọc nhanh trước buổi khám.
 * Fire-and-forget — không ảnh hưởng flow chính nếu Ollama không khả dụng.
 */
async function generateAiSummary(formData) {
  if (env.ragGenerationProvider !== "ollama") return null;

  try {
    const lines = [];
    if (formData.symptoms?.length)
      lines.push(`- Triệu chứng: ${Array.isArray(formData.symptoms) ? formData.symptoms.join(", ") : formData.symptoms}`);
    if (formData.durationDays)
      lines.push(`- Thời gian triệu chứng: ${formData.durationDays} ngày`);
    if (formData.fever !== undefined)
      lines.push(`- Sốt: ${formData.fever ? "Có" : "Không"}`);
    if (formData.allergies?.length)
      lines.push(`- Dị ứng: ${Array.isArray(formData.allergies) ? formData.allergies.join(", ") : formData.allergies}`);
    if (formData.medicalHistory?.length)
      lines.push(`- Tiền sử bệnh: ${Array.isArray(formData.medicalHistory) ? formData.medicalHistory.join(", ") : formData.medicalHistory}`);
    if (formData.currentMedications?.length)
      lines.push(`- Thuốc đang dùng: ${Array.isArray(formData.currentMedications) ? formData.currentMedications.join(", ") : formData.currentMedications}`);
    if (formData.notes)
      lines.push(`- Ghi chú: ${formData.notes}`);

    if (!lines.length) return null;

    const prompt = [
      "Bạn là trợ lý y tế. Hãy tóm tắt ngắn gọn (tối đa 3-4 câu) thông tin tiền khám sau đây bằng tiếng Việt,",
      "tập trung vào điểm quan trọng nhất để bác sĩ nắm nhanh tình trạng bệnh nhân:",
      "",
      lines.join("\n"),
    ].join("\n");

    const completion = await ollamaClient.chat.completions.create({
      model: env.ollamaChatModel,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    return completion.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn("[PREVISIT] AI summary generation failed:", err?.message);
    return null;
  }
}

function normalizePrevisit(note) {
  return {
    id: note.id,
    appointmentId: note.appointmentId,
    formData: note.formData,
    aiSummary: note.aiSummary,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

async function findAppointmentWithAccess(appointmentId, user) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { id: true, email: true, fullName: true, phone: true } },
      doctor: { select: { id: true, fullName: true, specialty: true } },
      service: { select: { id: true, name: true } },
      previsitNote: true,
    },
  });

  if (!appointment) {
    throw createHttpError(404, "APPOINTMENT_NOT_FOUND", "Appointment not found");
  }

  if (user.role === "ADMIN") return appointment;

  if (user.role === "PATIENT" && appointment.patientId === user.id) {
    return appointment;
  }

  if (user.role === "DOCTOR") {
    const doctorId = await getDoctorProfileIdByUserId(user.id);
    if (appointment.doctorId === doctorId) {
      return appointment;
    }
  }

  throw createHttpError(403, "FORBIDDEN", "You do not have permission to access this appointment");
}

export async function upsertPrevisit({ appointmentId, user, formData }) {
  const appointment = await findAppointmentWithAccess(appointmentId, user);

  // Chỉ bệnh nhân sở hữu appointment hoặc admin được cập nhật phiếu tiền khám.
  if (user.role === "DOCTOR") {
    throw createHttpError(403, "FORBIDDEN", "Doctor cannot modify previsit form");
  }

  const note = await prisma.previsitNote.upsert({
    where: { appointmentId: appointment.id },
    update: { formData },
    create: {
      appointmentId: appointment.id,
      formData,
    },
  });

  // Sinh AI summary bất đồng bộ, cập nhật vào DB sau
  generateAiSummary(formData).then(async (aiSummary) => {
    if (aiSummary) {
      await prisma.previsitNote.update({
        where: { id: note.id },
        data: { aiSummary },
      }).catch((e) => console.error("[PREVISIT] update aiSummary failed:", e?.message));
    }
  });

  return normalizePrevisit(note);
}

export async function getPrevisit({ appointmentId, user }) {
  const appointment = await findAppointmentWithAccess(appointmentId, user);

  if (!appointment.previsitNote) {
    return null;
  }

  return normalizePrevisit(appointment.previsitNote);
}
