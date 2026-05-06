import cron from "node-cron";
import { prisma } from "../config/prisma.js";
import { createNotification } from "./notification.service.js";
import {
  publishDoctorNotification,
  publishPatientNotification,
} from "./realtime.service.js";

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
  return new Date(date).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

/**
 * Mỗi phút: tìm lịch PENDING sắp đến trong 60 phút → thông báo bác sĩ.
 * Chỉ gửi 1 lần (kiểm tra xem đã có notification APPOINTMENT_EXPIRING chưa).
 */
async function checkExpiringAppointments() {
  const now = new Date();
  const target = new Date(now.getTime() + 60 * 60 * 1000); // T+60min
  const windowMs = 90 * 1000; // cửa sổ ±90 giây

  try {
    const expiring = await prisma.appointment.findMany({
      where: {
        status: "PENDING",
        slotStartAt: {
          gte: new Date(target.getTime() - windowMs),
          lte: new Date(target.getTime() + windowMs),
        },
        notifications: {
          none: { type: "APPOINTMENT_EXPIRING" },
        },
      },
      include: {
        patient: { select: { id: true, fullName: true, email: true } },
        doctor: { select: { id: true, userId: true, fullName: true } },
        service: { select: { name: true } },
      },
    });

    for (const appt of expiring) {
      const timeStr = formatDateTime(appt.slotStartAt);
      const patientName = appt.patient?.fullName || appt.patient?.email || "Bệnh nhân";

      const notification = await createNotification({
        userId: appt.doctor.userId,
        type: "APPOINTMENT_EXPIRING",
        title: "Lịch hẹn sắp hết hạn xác nhận",
        message: `Lịch hẹn với ${patientName} lúc ${timeStr} chưa được xác nhận. Vui lòng xác nhận trong 1 tiếng.`,
        link: `/dashboard/doctor/appointments?from=${toDateParam(appt.slotStartAt)}&id=${appt.id}`,
        appointmentId: appt.id,
      });

      publishDoctorNotification({ doctorId: appt.doctor.id, notification });
    }
  } catch (err) {
    console.error("[scheduler] checkExpiringAppointments error:", err.message);
  }
}

/**
 * Mỗi phút: tìm lịch PENDING đã qua giờ hẹn → tự động hủy + thông báo cả hai phía.
 */
async function checkAutoCancel() {
  const now = new Date();

  try {
    const overdue = await prisma.appointment.findMany({
      where: {
        status: "PENDING",
        slotStartAt: { lte: now },
      },
      include: {
        patient: { select: { id: true, fullName: true, email: true } },
        doctor: { select: { id: true, userId: true, fullName: true } },
        service: { select: { name: true } },
      },
    });

    for (const appt of overdue) {
      const timeStr = formatDateTime(appt.slotStartAt);
      const patientName = appt.patient?.fullName || appt.patient?.email || "Bệnh nhân";
      const doctorName = appt.doctor?.fullName || "Bác sĩ";

      const canceled = await prisma.$transaction(async (tx) => {
        const result = await tx.appointment.updateMany({
          where: { id: appt.id, status: "PENDING" },
          data: {
            status: "CANCELED",
            cancelNote: "Tự động hủy do bác sĩ không xác nhận trước giờ hẹn",
          },
        });

        if (result.count === 0) return false;

        await tx.slot.updateMany({
          where: { id: appt.slotId },
          data: { status: "AVAILABLE" },
        });

        return true;
      });

      if (!canceled) continue;

      // Thông báo cho bệnh nhân
      const patientNotif = await createNotification({
        userId: appt.patientId,
        type: "APPOINTMENT_AUTO_CANCELLED",
        title: "Lịch hẹn đã bị hủy tự động",
        message: `Lịch hẹn với bác sĩ ${doctorName} lúc ${timeStr} đã bị hủy tự động do bác sĩ không xác nhận đúng hạn. Bạn có thể đặt lịch lại.`,
        link: `/appointments?id=${appt.id}`,
        appointmentId: appt.id,
      });
      publishPatientNotification({ patientId: appt.patientId, notification: patientNotif });

      // Thông báo cho bác sĩ
      const doctorNotif = await createNotification({
        userId: appt.doctor.userId,
        type: "APPOINTMENT_AUTO_CANCELLED",
        title: "Lịch hẹn đã tự động bị hủy",
        message: `Lịch hẹn với bệnh nhân ${patientName} lúc ${timeStr} đã tự động bị hủy do không xác nhận đúng hạn.`,
        link: `/dashboard/doctor/appointments?from=${toDateParam(appt.slotStartAt)}&id=${appt.id}`,
        appointmentId: appt.id,
      });
      publishDoctorNotification({ doctorId: appt.doctor.id, notification: doctorNotif });
    }
  } catch (err) {
    console.error("[scheduler] checkAutoCancel error:", err.message);
  }
}

/**
 * Khởi động tất cả cron job.
 * Gọi 1 lần duy nhất từ server.js khi server start.
 */
export function startScheduler() {
  // Mỗi phút kiểm tra cả hai
  cron.schedule("* * * * *", async () => {
    await checkExpiringAppointments();
    await checkAutoCancel();
  });

  console.log("✅ Appointment scheduler started (runs every minute)");
}
