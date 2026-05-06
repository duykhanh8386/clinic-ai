import { prisma } from "../config/prisma.js";
import {
  addMinutes,
  combineDateAndTime,
  diffHoursFromNow,
  endOfDay,
  formatDateKey,
  getDatesInRange,
  startOfDay,
} from "../utils/bookingDate.js";
import { createHttpError } from "../utils/httpError.js";
import { createNotification } from "./notification.service.js";
import { publishDoctorNotification } from "./realtime.service.js";

function formatDateShort(date) {
  return new Date(date).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeSlot(slot) {
  return {
    id: slot.id,
    doctorId: slot.doctorId,
    serviceId: slot.serviceId,
    availabilityRangeId: slot.availabilityRangeId,
    startAt: slot.startAt,
    endAt: slot.endAt,
    status: slot.status,
    doctor: slot.doctor
      ? {
          id: slot.doctor.id,
          fullName: slot.doctor.fullName,
          specialty: slot.doctor.specialty,
        }
      : undefined,
    service: slot.service
      ? {
          id: slot.service.id,
          name: slot.service.name,
          price: slot.service.price,
          durationMinutes: slot.service.durationMinutes,
        }
      : undefined,
    isPast: diffHoursFromNow(slot.startAt) < 0,
  };
}

function isPastStartAt(date, now = new Date()) {
  return new Date(date).getTime() < now.getTime();
}

async function assertDoctorVisible(doctorId, includeInactive) {
  if (includeInactive) return;

  const doctor = await prisma.doctorProfile.findFirst({
    where: { id: doctorId, user: { isActive: true } },
    select: { id: true },
  });

  if (!doctor) {
    throw createHttpError(404, "DOCTOR_NOT_FOUND", "Doctor not found");
  }
}

export async function generateSlots({ doctorId, serviceId, rangeId, selectedRuleIds }) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: {
      services: true,
    },
  });

  if (!doctor) {
    throw createHttpError(404, "DOCTOR_NOT_FOUND", "Doctor not found");
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw createHttpError(404, "SERVICE_NOT_FOUND", "Service not found");
  }

  const range = await prisma.availabilityRange.findFirst({
    where: {
      id: rangeId,
      doctorId,
      isActive: true,
    },
    include: {
      rules: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!range) {
    throw createHttpError(404, "AVAILABILITY_RANGE_NOT_FOUND", "Availability range not found");
  }

  const hasAssignedService = doctor.services.some((item) => item.serviceId === serviceId);
  if (!hasAssignedService) {
    throw createHttpError(400, "SERVICE_NOT_ASSIGNED", "Doctor is not assigned to this service");
  }

  if (!range.rules.length) {
    throw createHttpError(400, "AVAILABILITY_RULES_REQUIRED", "Availability range has no rules");
  }

  const now = new Date();
  const records = [];
  let requestedCount = 0;
  let skippedPast = 0;
  // Tập hợp các time window [startTime, endTime) cho từng (ngày, rule) sẽ được generate.
  // Dùng để kiểm tra xem bác sĩ đã có slot của dịch vụ KHÁC nằm trong block đó chưa.
  const windows = [];

  // Nếu client gửi selectedRuleIds, chỉ sinh slot cho các rule đó.
  // Không gửi hoặc mảng rỗng → sinh tất cả rule trong range.
  const allowedRuleIds =
    Array.isArray(selectedRuleIds) && selectedRuleIds.length > 0
      ? new Set(selectedRuleIds)
      : null;

  for (const currentDate of getDatesInRange(range.fromDate, range.toDate)) {
    const currentDow = currentDate.getDay();
    let dayRules = range.rules.filter((rule) => rule.dayOfWeek === currentDow);

    // Lọc theo rule ID được chọn (ca cụ thể) nếu có
    if (allowedRuleIds) {
      dayRules = dayRules.filter((rule) => allowedRuleIds.has(rule.id));
    }
    if (!dayRules.length) continue;

    const dateKey = formatDateKey(currentDate);

    for (const rule of dayRules) {
      // Thời lượng slot luôn bằng dưration của dịch vụ — không dùng slotMinutes của rule
      const slotMinutes = Number(service.durationMinutes) || 20;
      const ruleStart = combineDateAndTime(dateKey, rule.startTime);
      let cursor = ruleStart;
      const boundary = combineDateAndTime(dateKey, rule.endTime);
      const beforeCount = records.length;

      // Ghi lại window của ca này để kiểm tra xen kẽ

      while (cursor < boundary) {
        const endCursor = addMinutes(cursor, slotMinutes);
        requestedCount += 1;
        if (isPastStartAt(cursor, now)) {
          skippedPast += 1;
          cursor = addMinutes(cursor, slotMinutes);
          continue;
        }
        // Không kiểm tra endCursor > boundary — endTime được hiểu là thời điểm bắt đầu cuối cùng,
        // slot vẫn được tạo nếu nó BẮT ĐẦU trước endTime dù kết thúc sau endTime.

        records.push({
          doctorId,
          serviceId,
          availabilityRangeId: range.id,
          startAt: new Date(cursor),
          endAt: endCursor,
        });

        cursor = addMinutes(cursor, slotMinutes);
      }

      if (records.length > beforeCount) {
        windows.push({
          start: new Date(Math.max(ruleStart.getTime(), now.getTime())),
          end: new Date(boundary),
        });
      }
    }
  }

  if (!records.length) {
    if (skippedPast > 0) {
      throw createHttpError(400, "PAST_SLOT_NOT_ALLOWED", "Cannot generate slots in the past");
    }
    return { created: 0, requested: requestedCount, skipped: 0, skippedPast, conflicts: [] };
  }

  // ── Kiểm tra xen kẽ ca làm việc ──────────────────────────────────────────
  // Không cho phép chèn dịch vụ này vào bất kỳ time block [startTime, endTime)
  // mà bác sĩ đã có slot của dịch vụ KHÁC (cả hai chiều).
  if (windows.length > 0) {
    const rangeMin = windows.reduce((m, w) => (w.start < m ? w.start : m), windows[0].start);
    const rangeMax = windows.reduce((m, w) => (w.end > m ? w.end : m), windows[0].end);

    const otherServiceSlots = await prisma.slot.findMany({
      where: {
        doctorId,
        serviceId: { not: serviceId },
        startAt: { gte: rangeMin, lte: rangeMax },
      },
      select: {
        startAt: true,
        service: { select: { id: true, name: true } },
      },
    });

    const interleaved = otherServiceSlots.filter((slot) =>
      windows.some((w) => slot.startAt >= w.start && slot.startAt < w.end)
    );

    if (interleaved.length > 0) {
      const occupiedNames = [...new Set(interleaved.map((s) => s.service?.name).filter(Boolean))];
      throw createHttpError(
        409,
        "TIME_BLOCK_OCCUPIED",
        `Ca làm việc đã bị chiếm bởi dịch vụ khác: ${occupiedNames.join(", ")}. Không thể chèn dịch vụ "${service.name}" vào cùng ca.`
      );
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Tìm slot đã tồn tại trùng startAt của cùng bác sĩ TRƯỚC khi insert
  // để trả về thông tin chi tiết cho admin
  const conflictingSlots = await prisma.slot.findMany({
    where: {
      doctorId,
      startAt: { in: records.map((r) => r.startAt) },
    },
    select: {
      startAt: true,
      service: { select: { id: true, name: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const createResult = await prisma.slot.createMany({
    data: records,
    skipDuplicates: true,
  });

  return {
    created: createResult.count,
    requested: requestedCount,
    skipped: records.length - createResult.count,
    skippedPast,
    conflicts: conflictingSlots.map((s) => ({
      startAt: s.startAt,
      serviceName: s.service?.name ?? "—",
    })),
  };
}

export async function generateSlotsDirect({ doctorId, serviceId, fromDate, toDate, rules }) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: { services: true },
  });
  if (!doctor) throw createHttpError(404, "DOCTOR_NOT_FOUND", "Doctor not found");

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) throw createHttpError(404, "SERVICE_NOT_FOUND", "Service not found");

  const hasAssignedService = doctor.services.some((item) => item.serviceId === serviceId);
  if (!hasAssignedService)
    throw createHttpError(400, "SERVICE_NOT_ASSIGNED", "Doctor is not assigned to this service");

  const now = new Date();
  const records = [];
  let requestedCount = 0;
  let skippedPast = 0;
  const windows = [];
  const slotMinutes = Number(service.durationMinutes) || 20;

  for (const currentDate of getDatesInRange(fromDate, toDate)) {
    const currentDow = currentDate.getDay();
    const dayRules = rules.filter((r) => r.dayOfWeek === currentDow);
    if (!dayRules.length) continue;

    const dateKey = formatDateKey(currentDate);
    for (const rule of dayRules) {
      const ruleStart = combineDateAndTime(dateKey, rule.startTime);
      let cursor = ruleStart;
      const boundary = combineDateAndTime(dateKey, rule.endTime);
      const beforeCount = records.length;

      while (cursor < boundary) {
        const endCursor = addMinutes(cursor, slotMinutes);
        requestedCount += 1;
        if (isPastStartAt(cursor, now)) {
          skippedPast += 1;
          cursor = addMinutes(cursor, slotMinutes);
          continue;
        }
        records.push({ doctorId, serviceId, startAt: new Date(cursor), endAt: endCursor });
        cursor = addMinutes(cursor, slotMinutes);
      }

      if (records.length > beforeCount) {
        windows.push({
          start: new Date(Math.max(ruleStart.getTime(), now.getTime())),
          end: new Date(boundary),
        });
      }
    }
  }

  if (!records.length) {
    if (skippedPast > 0) {
      throw createHttpError(400, "PAST_SLOT_NOT_ALLOWED", "Cannot generate slots in the past");
    }
    return { created: 0, requested: requestedCount, skipped: 0, skippedPast, conflicts: [] };
  }

  if (windows.length > 0) {
    const rangeMin = windows.reduce((m, w) => (w.start < m ? w.start : m), windows[0].start);
    const rangeMax = windows.reduce((m, w) => (w.end > m ? w.end : m), windows[0].end);

    const otherServiceSlots = await prisma.slot.findMany({
      where: {
        doctorId,
        serviceId: { not: serviceId },
        startAt: { gte: rangeMin, lte: rangeMax },
      },
      select: { startAt: true, service: { select: { id: true, name: true } } },
    });

    const interleaved = otherServiceSlots.filter((slot) =>
      windows.some((w) => slot.startAt >= w.start && slot.startAt < w.end)
    );
    if (interleaved.length > 0) {
      const occupiedNames = [...new Set(interleaved.map((s) => s.service?.name).filter(Boolean))];
      throw createHttpError(
        409,
        "TIME_BLOCK_OCCUPIED",
        `Ca làm việc đã bị chiếm bởi dịch vụ khác: ${occupiedNames.join(", ")}. Không thể chèn dịch vụ "${service.name}" vào cùng ca.`
      );
    }
  }

  const conflictingSlots = await prisma.slot.findMany({
    where: { doctorId, startAt: { in: records.map((r) => r.startAt) } },
    select: { startAt: true, service: { select: { id: true, name: true } } },
    orderBy: { startAt: "asc" },
  });

  const createResult = await prisma.slot.createMany({ data: records, skipDuplicates: true });

  // Fire-and-forget: thông báo bác sĩ khi admin tạo slot
  if (createResult.count > 0 && doctor.userId) {
    const fromStr = formatDateShort(fromDate);
    const toStr = formatDateShort(toDate);
    createNotification({
      userId: doctor.userId,
      type: "SLOTS_GENERATED",
      title: "Lịch làm việc mới",
      message: `Admin đã tạo ${createResult.count} ca làm việc dịch vụ “${service.name}” cho bạn từ ${fromStr} đến ${toStr}.`,
      link: `/dashboard/doctor/schedule`,
    }).then((notif) => {
      publishDoctorNotification({ doctorId, notification: notif });
    }).catch((e) => console.error("[NOTIF] slot generated notify failed:", e?.message));
  }

  return {
    created: createResult.count,
    requested: requestedCount,
    skipped: records.length - createResult.count,
    skippedPast,
    conflicts: conflictingSlots.map((s) => ({ startAt: s.startAt, serviceName: s.service?.name ?? "—" })),
  };
}

export async function listSlots({
  doctorId,
  serviceId,
  date,
  status = "AVAILABLE",
  includeInactive = false,
}) {
  await assertDoctorVisible(doctorId, includeInactive);

  const now = new Date();
  const items = await prisma.slot.findMany({
    where: {
      doctorId,
      serviceId,
      status,
      startAt: {
        gte: startOfDay(date) > now ? startOfDay(date) : now,
        lte: endOfDay(date),
      },
    },
    orderBy: { startAt: "asc" },
    include: {
      doctor: true,
      service: true,
    },
  });

  return items.map(normalizeSlot);
}

export async function listSlotsByRange({
  doctorId,
  serviceId,
  from,
  to,
  status,
  includeInactive = false,
}) {
  await assertDoctorVisible(doctorId, includeInactive);

  const items = await prisma.slot.findMany({
    where: {
      doctorId,
      ...(serviceId ? { serviceId } : {}),
      ...(status ? { status } : {}),
      startAt: {
        gte: startOfDay(from),
        lte: endOfDay(to),
      },
    },
    orderBy: { startAt: "asc" },
    include: {
      doctor: true,
      service: true,
    },
  });

  return items.map(normalizeSlot);
}
