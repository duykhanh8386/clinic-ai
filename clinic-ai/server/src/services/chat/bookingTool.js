/**
 * Booking Tool — Week 7
 *
 * Được gọi khi intent = "booking".
 * Truy vấn DB để trả về danh sách bác sĩ và slot trống gần nhất
 * theo dịch vụ (nếu mention) để bot trả lời có căn cứ.
 */

import { prisma } from "../../config/prisma.js";

/**
 * Lấy danh sách bác sĩ hoạt động (tối đa 5) kèm dịch vụ.
 */
async function getActiveDoctors() {
  const doctors = await prisma.doctorProfile.findMany({
    where: { user: { isActive: true } },
    take: 5,
    include: {
      services: { include: { service: { select: { id: true, name: true, price: true, durationMinutes: true } } } },
    },
  });

  return doctors.map((d) => ({
    id: d.id,
    fullName: d.fullName,
    specialty: d.specialty,
    services: d.services.map((s) => s.service),
  }));
}

/**
 * Lấy slot trống sắp tới (trong 7 ngày tới, tối đa 5 slot mỗi bác sĩ).
 */
async function getUpcomingAvailableSlots(doctorIds) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (!doctorIds?.length) return [];

  const slots = await prisma.slot.findMany({
    where: {
      doctorId: { in: doctorIds },
      status: "AVAILABLE",
      startAt: { gte: now, lte: in7Days },
    },
    orderBy: { startAt: "asc" },
    take: 10,
    include: {
      service: { select: { name: true } },
    },
  });

  return slots.map((s) => ({
    doctorId: s.doctorId,
    serviceName: s.service?.name,
    startAt: s.startAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    slotId: s.id,
  }));
}

/**
 * Tổng hợp context booking để đưa vào prompt.
 * @returns {string}
 */
export async function buildBookingContext() {
  try {
    const [doctors, slots] = await Promise.all([
      getActiveDoctors(),
      getActiveDoctors().then((docs) => getUpcomingAvailableSlots(docs.map((d) => d.id))),
    ]);

    if (!doctors.length) {
      return "Hiện tại chưa có bác sĩ nào khả dụng trong hệ thống.";
    }

    const doctorLines = doctors
      .map((d) => {
        const services = d.services.map((s) => `${s.name} (${s.price?.toLocaleString("vi-VN") || "?"}đ/${s.durationMinutes}ph)`).join(", ");
        return `- Bác sĩ ${d.fullName} | Chuyên khoa: ${d.specialty} | Dịch vụ: ${services || "chưa có"}`;
      })
      .join("\n");

    const slotLines = slots.length
      ? slots
          .map((s) => `- [${s.serviceName}] tại ${s.startAt}`)
          .join("\n")
      : "Không có slot trống trong 7 ngày tới.";

    return [
      "=== DANH SÁCH BÁC SĨ ===",
      doctorLines,
      "",
      "=== SLOT TRỐNG GẦN NHẤT (7 NGÀY) ===",
      slotLines,
      "",
      "Để đặt lịch: Vào mục [Đặt lịch khám], chọn dịch vụ → chọn bác sĩ → chọn ngày & giờ → xác nhận.",
    ].join("\n");
  } catch (err) {
    console.error("[BOOKING_TOOL] error:", err?.message);
    return "Không thể tải thông tin đặt lịch lúc này.";
  }
}
