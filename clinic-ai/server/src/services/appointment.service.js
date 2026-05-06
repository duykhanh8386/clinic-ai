import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { endOfDay, startOfDay, diffHoursFromNow } from "../utils/bookingDate.js";
import { createHttpError } from "../utils/httpError.js";
import {
  sendBookingConfirmEmail,
  sendAppointmentConfirmedEmail,
  sendAppointmentCancelledEmail,
} from "../utils/mailer.sendgrid.js";
import { createNotification } from "./notification.service.js";
import {
  publishDoctorNotification,
  publishDoctorAppointmentCreated,
  publishPatientNotification,
  publishPatientAppointmentStatusUpdated,
} from "./realtime.service.js";

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function formatDateTime(date) {
  return new Date(date).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function toDateParam(date) {
  // Returns YYYY-MM-DD in local Asia/Ho_Chi_Minh time
  return new Date(date).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

function normalizeAppointment(appointment) {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    serviceId: appointment.serviceId,
    slotId: appointment.slotId,
    status: appointment.status,
    reason: appointment.reason,
    cancelNote: appointment.cancelNote,
    slotStartAt: appointment.slotStartAt,
    slotEndAt: appointment.slotEndAt,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
    patient: appointment.patient
      ? {
          id: appointment.patient.id,
          email: appointment.patient.email,
          fullName: appointment.patient.fullName,
          phone: appointment.patient.phone,
        }
      : undefined,
    doctor: appointment.doctor
      ? {
          id: appointment.doctor.id,
          userId: appointment.doctor.userId,
          fullName: appointment.doctor.fullName,
          specialty: appointment.doctor.specialty,
        }
      : undefined,
    service: appointment.service
      ? {
          id: appointment.service.id,
          name: appointment.service.name,
          price: appointment.service.price,
          durationMinutes: appointment.service.durationMinutes,
        }
      : undefined,
    slot: appointment.slot
      ? {
          id: appointment.slot.id,
          startAt: appointment.slot.startAt,
          endAt: appointment.slot.endAt,
          status: appointment.slot.status,
        }
      : undefined,
    priceSnapshot: appointment.priceSnapshot ?? null,
    previsitNote: appointment.previsitNote
      ? {
          id: appointment.previsitNote.id,
          formData: appointment.previsitNote.formData,
          aiSummary: appointment.previsitNote.aiSummary,
          updatedAt: appointment.previsitNote.updatedAt,
        }
      : null,
  };
}

export async function getDoctorProfileIdByUserId(userId) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!doctor) {
    throw createHttpError(404, "DOCTOR_PROFILE_NOT_FOUND", "Doctor profile not found");
  }

  return doctor.id;
}

async function findAppointmentOrThrow(id) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: true,
      doctor: true,
      service: true,
      slot: true,
      previsitNote: true,
    },
  });

  if (!appointment) {
    throw createHttpError(404, "APPOINTMENT_NOT_FOUND", "Appointment not found");
  }

  return appointment;
}

async function assertAppointmentAccess(user, appointment) {
  if (user.role === "ADMIN") return;
  if (user.role === "PATIENT" && appointment.patientId === user.id) return;

  if (user.role === "DOCTOR") {
    const doctorId = await getDoctorProfileIdByUserId(user.id);
    if (appointment.doctorId === doctorId) return;
  }

  throw createHttpError(403, "FORBIDDEN", "You do not have permission to access this appointment");
}

function assertCancelableStatus(appointment) {
  if (["DONE", "CANCELED"].includes(appointment.status)) {
    throw createHttpError(400, "INVALID_APPOINTMENT_STATUS", "Appointment can no longer be changed");
  }
}

function assertRescheduleWindow(appointment, user) {
  if (user.role === "ADMIN") return;

  const hoursUntilStart = diffHoursFromNow(appointment.slotStartAt);
  if (hoursUntilStart < env.bookingRescheduleMinHours) {
    throw createHttpError(
      400,
      "RESCHEDULE_WINDOW_EXPIRED",
      `Chỉ có thể đổi lịch trước ít nhất ${env.bookingRescheduleMinHours} tiếng trước giờ khám`
    );
  }
}

function assertCancelWindow(appointment, user) {
  if (user.role === "ADMIN") return;

  const hoursUntilStart = diffHoursFromNow(appointment.slotStartAt);
  if (hoursUntilStart < env.bookingCancelMinHours) {
    throw createHttpError(
      400,
      "CANCEL_WINDOW_EXPIRED",
      `Chỉ có thể hủy lịch trước ít nhất ${env.bookingCancelMinHours} tiếng trước giờ khám`
    );
  }
}

export async function createAppointment({ patientUserId, slotId, reason }) {
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: {
      doctor: { include: { user: { select: { isActive: true } } } },
      service: true,
    },
  });

  if (!slot) {
    throw createHttpError(404, "SLOT_NOT_FOUND", "Slot not found");
  }

  if (slot.status !== "AVAILABLE") {
    throw createHttpError(409, "SLOT_NOT_AVAILABLE", "This slot is no longer available");
  }

  if (slot.startAt <= new Date()) {
    throw createHttpError(400, "SLOT_IN_PAST", "Cannot book a slot in the past");
  }

  if (slot.doctor?.user?.isActive === false) {
    throw createHttpError(404, "DOCTOR_NOT_FOUND", "Doctor not found");
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const updated = await tx.slot.updateMany({
      where: { id: slotId, status: "AVAILABLE" },
      data: { status: "BOOKED" },
    });

    if (updated.count !== 1) {
      throw createHttpError(409, "SLOT_NOT_AVAILABLE", "This slot was booked by another request");
    }

    return tx.appointment.create({
      data: {
        patientId: patientUserId,
        doctorId: slot.doctorId,
        serviceId: slot.serviceId,
        slotId: slot.id,
        reason,
        slotStartAt: slot.startAt,
        slotEndAt: slot.endAt,
        priceSnapshot: slot.service?.price ?? null,
      },
      include: {
        patient: true,
        doctor: true,
        service: true,
        slot: true,
      },
    });
  });

  // Fire-and-forget: gửi email xác nhận cho bệnh nhân
  if (appointment.patient?.email) {
    sendBookingConfirmEmail({
      to: appointment.patient.email,
      patientName: appointment.patient.fullName || appointment.patient.email,
      doctorName: appointment.doctor?.fullName || "Bác sĩ",
      serviceName: appointment.service?.name || "Dịch vụ",
      slotStartAt: appointment.slotStartAt,
      reason: appointment.reason,
    }).catch((e) => console.error("[MAILER] booking confirm failed:", e?.message));
  }

  // Lưu notification cho bác sĩ trước khi trả kết quả, để bác sĩ đăng nhập sau vẫn thấy.
  if (appointment.doctor?.userId) {
    const patientName = appointment.patient?.fullName || appointment.patient?.email || "Bệnh nhân";
    const timeStr = formatDateTime(appointment.slotStartAt);
    try {
      const notif = await createNotification({
        userId: appointment.doctor.userId,
        type: "APPOINTMENT_NEW",
        title: "Lịch hẹn mới",
        message: `${patientName} đặt lịch ${appointment.service?.name || "dịch vụ"} lúc ${timeStr}`,
        link: `/dashboard/doctor/appointments?from=${toDateParam(appointment.slotStartAt)}&id=${appointment.id}`,
        appointmentId: appointment.id,
      });
      publishDoctorNotification({ doctorId: appointment.doctorId, notification: notif });
    } catch (e) {
      console.error("[NOTIF] doctor appointment_new failed:", e?.message);
    }
  }

  publishDoctorAppointmentCreated({ appointment: normalizeAppointment(appointment) });

  // Fire-and-forget: thông báo cho bệnh nhân (đặt lịch thành công)
  createNotification({
    userId: appointment.patientId,
    type: "APPOINTMENT_NEW",
    title: "Đặt lịch thành công",
    message: `Lịch khám với BS. ${appointment.doctor?.fullName || "Bác sĩ"} lúc ${formatDateTime(appointment.slotStartAt)} đã được ghi nhận. Vui lòng chờ xác nhận.`,
    link: `/appointments?id=${appointment.id}`,
    appointmentId: appointment.id,
  }).then((notif) => {
    publishPatientNotification({ patientId: appointment.patientId, notification: notif });
  }).catch((e) => console.error("[NOTIF] patient appointment_new failed:", e?.message));

  return normalizeAppointment(appointment);
}

export async function listAppointments({
  user,
  page = 1,
  limit = 10,
  status,
  doctorId,
  serviceId,
  from,
  to,
  search,
  sortBy = "slotStartAt",
  sortOrder = "asc",
}) {
  const safePage = toInt(page, 1);
  const safeLimit = Math.min(toInt(limit, 10), 200);

  let where = {};

  if (user.role === "PATIENT") {
    where.patientId = user.id;
  } else if (user.role === "DOCTOR") {
    const ownDoctorId = await getDoctorProfileIdByUserId(user.id);
    where.doctorId = ownDoctorId;
  } else if (user.role === "ADMIN" && doctorId) {
    where.doctorId = doctorId;
  }

  if (status) {
    where.status = status;
  }

  if (serviceId) {
    where.serviceId = serviceId;
  }

  if (from || to) {
    where.slotStartAt = {
      ...(from ? { gte: startOfDay(from) } : {}),
      ...(to ? { lte: endOfDay(to) } : {}),
    };
  }

  if (search) {
    where.OR = [
      { patient: { fullName: { contains: search, mode: "insensitive" } } },
      { patient: { email: { contains: search, mode: "insensitive" } } },
      { doctor: { fullName: { contains: search, mode: "insensitive" } } },
      { service: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const orderBy = {
    [sortBy === "createdAt" ? "createdAt" : "slotStartAt"]: sortOrder === "desc" ? "desc" : "asc",
  };

  const [total, items] = await prisma.$transaction([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: {
        patient: true,
        doctor: true,
        service: true,
        slot: true,
        previsitNote: {
          select: { id: true, updatedAt: true },
        },
      },
    }),
  ]);

  return {
    items: items.map(normalizeAppointment),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

export async function getAppointmentById({ id, user }) {
  const appointment = await findAppointmentOrThrow(id);
  await assertAppointmentAccess(user, appointment);
  return normalizeAppointment(appointment);
}

function assertStatusTransition(currentStatus, nextStatus) {
  const allowed = {
    PENDING: ["CONFIRMED", "CANCELED"],
    CONFIRMED: ["DONE", "CANCELED"],
    DONE: [],
    CANCELED: [],
  };

  if (!allowed[currentStatus]?.includes(nextStatus)) {
    throw createHttpError(
      400,
      "INVALID_STATUS_TRANSITION",
      `Cannot move appointment from ${currentStatus} to ${nextStatus}`
    );
  }
}

export async function cancelAppointment({ id, user, note }) {
  const appointment = await findAppointmentOrThrow(id);
  await assertAppointmentAccess(user, appointment);
  assertCancelableStatus(appointment);
  assertCancelWindow(appointment, user);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.slot.update({
      where: { id: appointment.slotId },
      data: { status: "AVAILABLE" },
    });

    return tx.appointment.update({
      where: { id },
      data: { status: "CANCELED", cancelNote: note ?? null },
      include: {
        patient: true,
        doctor: true,
        service: true,
        slot: true,
      },
    });
  });

  // Fire-and-forget: thông báo hủy cho bệnh nhân
  if (updated.patient?.email) {
    sendAppointmentCancelledEmail({
      to: updated.patient.email,
      patientName: updated.patient.fullName || updated.patient.email,
      doctorName: updated.doctor?.fullName || "Bác sĩ",
      serviceName: updated.service?.name || "Dịch vụ",
      slotStartAt: updated.slotStartAt,
      cancelNote: updated.cancelNote,
    }).catch((e) => console.error("[MAILER] cancel notify failed:", e?.message));
  }

  const cancelTimeStr = formatDateTime(updated.slotStartAt);

  // Fire-and-forget: thông báo SSE+DB cho bệnh nhân (xác nhận đã hủy)
  createNotification({
    userId: updated.patientId,
    type: "APPOINTMENT_CANCELLED",
    title: "Lịch hẹn đã bị hủy",
    message: `Lịch hẹn với BS. ${updated.doctor?.fullName || "Bác sĩ"} lúc ${cancelTimeStr} đã bị hủy.`,
    link: `/appointments?id=${updated.id}`,
    appointmentId: updated.id,
  }).then((notif) => {
    publishPatientNotification({ patientId: updated.patientId, notification: notif });
    publishPatientAppointmentStatusUpdated({ appointment: normalizeAppointment(updated), actorRole: user?.role || "UNKNOWN" });
  }).catch((e) => console.error("[NOTIF] patient cancel notify failed:", e?.message));

  // Fire-and-forget: thông báo SSE+DB cho bác sĩ (bệnh nhân/admin đã hủy lịch)
  if (updated.doctor?.userId) {
    const patientName = updated.patient?.fullName || updated.patient?.email || "Bệnh nhân";
    createNotification({
      userId: updated.doctor.userId,
      type: "APPOINTMENT_CANCELLED",
      title: "Lịch hẹn đã bị hủy",
      message: `Bệnh nhân ${patientName} đã hủy lịch hẹn lúc ${cancelTimeStr}.`,
      link: `/dashboard/doctor/appointments?from=${toDateParam(updated.slotStartAt)}&id=${updated.id}`,
      appointmentId: updated.id,
    }).then((notif) => {
      publishDoctorNotification({ doctorId: updated.doctorId, notification: notif });
    }).catch((e) => console.error("[NOTIF] doctor cancel notify failed:", e?.message));
  }

  return normalizeAppointment(updated);
}

export async function rescheduleAppointment({ id, user, newSlotId }) {
  const appointment = await findAppointmentOrThrow(id);
  await assertAppointmentAccess(user, appointment);
  assertCancelableStatus(appointment);
  assertRescheduleWindow(appointment, user);

  const newSlot = await prisma.slot.findUnique({
    where: { id: newSlotId },
  });

  if (!newSlot) {
    throw createHttpError(404, "SLOT_NOT_FOUND", "New slot not found");
  }

  if (newSlot.status !== "AVAILABLE") {
    throw createHttpError(409, "SLOT_NOT_AVAILABLE", "New slot is no longer available");
  }

  if (newSlot.startAt <= new Date()) {
    throw createHttpError(400, "SLOT_IN_PAST", "Cannot reschedule to a past slot");
  }

  if (newSlot.doctorId !== appointment.doctorId || newSlot.serviceId !== appointment.serviceId) {
    throw createHttpError(
      400,
      "SLOT_DOCTOR_SERVICE_MISMATCH",
      "New slot must belong to the same doctor and service"
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const locked = await tx.slot.updateMany({
      where: { id: newSlotId, status: "AVAILABLE" },
      data: { status: "BOOKED" },
    });

    if (locked.count !== 1) {
      throw createHttpError(409, "SLOT_NOT_AVAILABLE", "New slot was booked by another request");
    }

    // Free the old slot
    await tx.slot.update({
      where: { id: appointment.slotId },
      data: { status: "AVAILABLE" },
    });

    return tx.appointment.update({
      where: { id },
      data: {
        slotId: newSlot.id,
        slotStartAt: newSlot.startAt,
        slotEndAt: newSlot.endAt,
        status: "PENDING",
        cancelNote: null,
      },
      include: {
        patient: true,
        doctor: true,
        service: true,
        slot: true,
      },
    });
  });

  const rescheduleTimeStr = formatDateTime(updated.slotStartAt);
  const reschedulePatientName = updated.patient?.fullName || updated.patient?.email || "Bệnh nhân";

  // Fire-and-forget: thông báo bác sĩ (bệnh nhân đổi lịch)
  if (updated.doctor?.userId) {
    createNotification({
      userId: updated.doctor.userId,
      type: "APPOINTMENT_RESCHEDULED",
      title: "Lịch hẹn đã được dời",
      message: `Bệnh nhân ${reschedulePatientName} đã dời lịch sang ${rescheduleTimeStr}.`,
      link: `/dashboard/doctor/appointments?from=${toDateParam(updated.slotStartAt)}&id=${updated.id}`,
      appointmentId: updated.id,
    }).then((notif) => {
      publishDoctorNotification({ doctorId: updated.doctorId, notification: notif });
    }).catch((e) => console.error("[NOTIF] doctor reschedule notify failed:", e?.message));
  }

  // Fire-and-forget: thông báo bệnh nhân (xác nhận đổi lịch thành công)
  createNotification({
    userId: updated.patientId,
    type: "APPOINTMENT_RESCHEDULED",
    title: "Đổi lịch thành công",
    message: `Lịch hẹn với BS. ${updated.doctor?.fullName || "Bác sĩ"} đã được dời sang ${rescheduleTimeStr}. Vui lòng chờ xác nhận lại.`,
    link: `/appointments?id=${updated.id}`,
    appointmentId: updated.id,
  }).then((notif) => {
    publishPatientNotification({ patientId: updated.patientId, notification: notif });
  }).catch((e) => console.error("[NOTIF] patient reschedule notify failed:", e?.message));

  return normalizeAppointment(updated);
}

export async function updateAppointmentStatus({ id, user, status }) {
  const appointment = await findAppointmentOrThrow(id);

  if (user.role === "DOCTOR") {
    const doctorId = await getDoctorProfileIdByUserId(user.id);
    if (appointment.doctorId !== doctorId) {
      throw createHttpError(403, "FORBIDDEN", "You cannot update this appointment");
    }
  } else if (user.role !== "ADMIN") {
    throw createHttpError(403, "FORBIDDEN", "You cannot update this appointment");
  }

  assertStatusTransition(appointment.status, status);

  // Không cho phép hoàn tất lịch hẹn trước khi thời gian khám diễn ra
  if (status === "DONE" && new Date(appointment.slotStartAt) > new Date()) {
    throw createHttpError(
      400,
      "APPOINTMENT_NOT_STARTED",
      "Cannot mark appointment as done before the scheduled time"
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (status === "CANCELED") {
      await tx.slot.update({
        where: { id: appointment.slotId },
        data: { status: "AVAILABLE" },
      });
    }

    return tx.appointment.update({
      where: { id },
      data: { status },
      include: {
        patient: true,
        doctor: true,
        service: true,
        slot: true,
        previsitNote: true,
      },
    });
  });

  // Fire-and-forget: thông báo khi bác sĩ xác nhận hoặc hủy lịch
  if (updated.patient?.email) {
    if (status === "CONFIRMED") {
      sendAppointmentConfirmedEmail({
        to: updated.patient.email,
        patientName: updated.patient.fullName || updated.patient.email,
        doctorName: updated.doctor?.fullName || "Bác sĩ",
        serviceName: updated.service?.name || "Dịch vụ",
        slotStartAt: updated.slotStartAt,
      }).catch((e) => console.error("[MAILER] confirm notify failed:", e?.message));
    } else if (status === "CANCELED") {
      sendAppointmentCancelledEmail({
        to: updated.patient.email,
        patientName: updated.patient.fullName || updated.patient.email,
        doctorName: updated.doctor?.fullName || "Bác sĩ",
        serviceName: updated.service?.name || "Dịch vụ",
        slotStartAt: updated.slotStartAt,
        cancelNote: null,
      }).catch((e) => console.error("[MAILER] cancel notify failed:", e?.message));
    }
  }

  // Lưu notification trạng thái để bệnh nhân mở web sau vẫn thấy thông báo.
  const statusNotifMap = {
    CONFIRMED: {
      type: "APPOINTMENT_CONFIRMED",
      title: "Lịch hẹn đã được xác nhận",
      message: `Lịch khám với BS. ${updated.doctor?.fullName || "Bác sĩ"} lúc ${formatDateTime(updated.slotStartAt)} đã được xác nhận.`,
    },
    CANCELED: {
      type: "APPOINTMENT_CANCELLED",
      title: "Lịch hẹn đã bị hủy",
      message: `Lịch khám với BS. ${updated.doctor?.fullName || "Bác sĩ"} lúc ${formatDateTime(updated.slotStartAt)} đã bị hủy.`,
    },
    DONE: {
      type: "APPOINTMENT_DONE",
      title: "Lịch hẹn hoàn thành",
      message: `Lịch khám với BS. ${updated.doctor?.fullName || "Bác sĩ"} lúc ${formatDateTime(updated.slotStartAt)} đã hoàn thành.`,
    },
  };

  if (statusNotifMap[status]) {
    const { type: notifType, title, message } = statusNotifMap[status];
    try {
      const notif = await createNotification({
        userId: updated.patientId,
        type: notifType,
        title,
        message,
        link: `/appointments?id=${updated.id}`,
        appointmentId: updated.id,
      });
      publishPatientNotification({ patientId: updated.patientId, notification: notif });
    } catch (e) {
      console.error("[NOTIF] patient status update notify failed:", e?.message);
    }
  }

  publishPatientAppointmentStatusUpdated({ appointment: normalizeAppointment(updated), actorRole: user?.role || "DOCTOR" });

  return normalizeAppointment(updated);
}
