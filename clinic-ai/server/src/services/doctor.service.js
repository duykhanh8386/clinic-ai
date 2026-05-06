import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { createHttpError } from "../utils/httpError.js";
import { startOfDay, endOfDay, formatDateKey } from "../utils/bookingDate.js";
import { normalizeService } from "./service.service.js";
import { resolveSpecialtyInput } from "./specialty.service.js";

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function hhmmToMinutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function normalizeDoctor(doctor) {
  return {
    id: doctor.id,
    userId: doctor.userId,
    fullName: doctor.fullName,
    specialtyId: doctor.specialtyId ?? doctor.specialtyRef?.id ?? null,
    specialty: doctor.specialtyRef?.name ?? doctor.specialty,
    bio: doctor.bio,
    avatarUrl: doctor.avatarUrl ?? null,
    phone: doctor.user?.phone ?? null,
    // isActive lấy từ bảng User liên kết
    isActive: doctor.user?.isActive ?? true,
    services: doctor.services?.map((item) => normalizeService(item.service)) ?? [],
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
  };
}

function normalizeAvailabilityRange(range) {
  return {
    id: range.id,
    doctorId: range.doctorId,
    title: range.title,
    // Trả về chuỗi YYYY-MM-DD theo giờ địa phương để tránh lệch ngày do UTC offset
    fromDate: formatDateKey(range.fromDate),
    toDate: formatDateKey(range.toDate),
    isActive: range.isActive,
    createdAt: range.createdAt,
    updatedAt: range.updatedAt,
    rules:
      range.rules?.map((rule) => ({
        id: rule.id,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
      })) ?? [],
  };
}

async function getDoctorOrThrow(doctorId, include = {}) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: {
      // Luôn lấy isActive của user để normalizeDoctor có thể expose ra
      user: { select: { id: true, isActive: true, phone: true } },
      specialtyRef: true,
      ...include,
    },
  });

  if (!doctor) {
    throw createHttpError(404, "DOCTOR_NOT_FOUND", "Doctor not found");
  }

  return doctor;
}

async function getAvailabilityRangeOrThrow(doctorId, rangeId) {
  const range = await prisma.availabilityRange.findFirst({
    where: { id: rangeId, doctorId },
    include: {
      rules: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!range) {
    throw createHttpError(404, "AVAILABILITY_RANGE_NOT_FOUND", "Availability range not found");
  }

  return range;
}

function validateRangePayload(payload) {
  const fromDate = startOfDay(payload.fromDate);
  const toDate = startOfDay(payload.toDate);

  if (fromDate > toDate) {
    throw createHttpError(400, "INVALID_DATE_RANGE", "fromDate must be before or equal to toDate");
  }

  for (const rule of payload.rules) {
    if (hhmmToMinutes(rule.startTime) >= hhmmToMinutes(rule.endTime)) {
      throw createHttpError(400, "INVALID_RULE", "startTime must be before endTime");
    }
  }

  return { fromDate, toDate };
}

export async function listDoctors({
  page = 1,
  limit = 10,
  specialty,
  specialtyId,
  search,
  serviceId,
  includeInactive = false,
}) {
  const safePage = toInt(page, 1);
  const safeLimit = Math.min(toInt(limit, 10), 50);

  const and = [];
  if (specialtyId) {
    and.push({ specialtyId });
  } else if (specialty) {
    and.push({
      OR: [
        { specialty: { contains: specialty, mode: "insensitive" } },
        { specialtyRef: { name: { contains: specialty, mode: "insensitive" } } },
      ],
    });
  }
  if (search) {
    and.push({
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { specialty: { contains: search, mode: "insensitive" } },
        { specialtyRef: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  const where = {
    ...(!includeInactive ? { user: { isActive: true } } : {}),
    ...(serviceId ? { services: { some: { serviceId } } } : {}),
    ...(and.length ? { AND: and } : {}),
  };

  const [total, doctors] = await prisma.$transaction([
    prisma.doctorProfile.count({ where }),
    prisma.doctorProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: {
        user: { select: { id: true, isActive: true, phone: true } },
        specialtyRef: true,
        services: { include: { service: { include: { specialtyRef: true } } } },
      },
    }),
  ]);

  return {
    items: doctors.map(normalizeDoctor),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

export async function getDoctorById(doctorId, { includeInactive = false } = {}) {
  const doctor = await getDoctorOrThrow(doctorId, {
    services: { include: { service: { include: { specialtyRef: true } } } },
  });

  if (!includeInactive && doctor.user?.isActive === false) {
    throw createHttpError(404, "DOCTOR_NOT_FOUND", "Doctor not found");
  }

  return normalizeDoctor(doctor);
}

export async function createDoctor({
  email,
  password,
  fullName,
  phone,
  specialtyId,
  specialty,
  bio,
  serviceIds = [],
}) {
  const existedUser = await prisma.user.findUnique({ where: { email } });
  if (existedUser) {
    throw createHttpError(409, "EMAIL_EXISTS", "Email already exists");
  }

  const uniqueServiceIds = [...new Set(serviceIds ?? [])];

  if (uniqueServiceIds.length) {
    const serviceCount = await prisma.service.count({ where: { id: { in: uniqueServiceIds } } });
    if (serviceCount !== uniqueServiceIds.length) {
      throw createHttpError(400, "SERVICE_ID_INVALID", "One or more serviceIds are invalid");
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const resolvedSpecialty = await resolveSpecialtyInput(
      { specialtyId, specialty },
      { tx, createByName: true, required: true }
    );

    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "DOCTOR",
        fullName,
        phone: phone ?? null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    const doctor = await tx.doctorProfile.create({
      data: {
        userId: user.id,
        fullName,
        specialtyId: resolvedSpecialty.id,
        specialty: resolvedSpecialty.name,
        bio: bio ?? null,
        services: uniqueServiceIds.length
          ? {
              create: uniqueServiceIds.map((serviceId) => ({ serviceId })),
            }
          : undefined,
      },
      include: {
        user: { select: { id: true, isActive: true, phone: true } },
        specialtyRef: true,
        services: { include: { service: { include: { specialtyRef: true } } } },
      },
    });

    return {
      user,
      doctor: normalizeDoctor(doctor),
    };
  });

  return result;
}

export async function updateDoctorProfile(doctorId, payload) {
  const doctor = await getDoctorOrThrow(doctorId);

  const userData = {};
  if (typeof payload.fullName === "string") userData.fullName = payload.fullName;
  if ("phone" in payload) userData.phone = payload.phone || null;

  const doctorData = {};
  if (typeof payload.fullName === "string") doctorData.fullName = payload.fullName;
  if (payload.specialtyId || payload.specialty) {
    const resolvedSpecialty = await resolveSpecialtyInput(payload, {
      createByName: true,
      required: true,
    });
    doctorData.specialtyId = resolvedSpecialty.id;
    doctorData.specialty = resolvedSpecialty.name;
  }
  if ("bio" in payload) doctorData.bio = payload.bio || null;

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(userData).length) {
      await tx.user.update({
        where: { id: doctor.userId },
        data: userData,
      });
    }

    return tx.doctorProfile.update({
      where: { id: doctorId },
      data: doctorData,
      include: {
        user: { select: { id: true, isActive: true, phone: true } },
        specialtyRef: true,
        services: { include: { service: { include: { specialtyRef: true } } } },
      },
    });
  });

  return normalizeDoctor(updated);
}

export async function setDoctorServices(doctorId, serviceIds) {
  await getDoctorOrThrow(doctorId);

  const uniqueServiceIds = [...new Set(serviceIds ?? [])];
  if (uniqueServiceIds.length) {
    const serviceCount = await prisma.service.count({ where: { id: { in: uniqueServiceIds } } });
    if (serviceCount !== uniqueServiceIds.length) {
      throw createHttpError(400, "SERVICE_ID_INVALID", "One or more serviceIds are invalid");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.doctorService.deleteMany({ where: { doctorId } });
    if (uniqueServiceIds.length) {
      await tx.doctorService.createMany({
        data: uniqueServiceIds.map((serviceId) => ({ doctorId, serviceId })),
        skipDuplicates: true,
      });
    }
  });

  const updated = await getDoctorOrThrow(doctorId, {
    services: { include: { service: { include: { specialtyRef: true } } } },
  });

  return normalizeDoctor(updated);
}

export async function createAvailabilityRange(doctorId, payload) {
  await getDoctorOrThrow(doctorId);

  const { fromDate, toDate } = validateRangePayload(payload);

  const created = await prisma.$transaction(async (tx) => {
    const range = await tx.availabilityRange.create({
      data: {
        doctorId,
        title: payload.title || null,
        fromDate,
        toDate,
      },
    });

    await tx.availabilityRule.createMany({
      data: payload.rules.map((rule) => ({
        rangeId: range.id,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
        slotMinutes: rule.slotMinutes,
      })),
    });

    return tx.availabilityRange.findUnique({
      where: { id: range.id },
      include: {
        rules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });
  });

  return normalizeAvailabilityRange(created);
}

export async function updateAvailabilityRange(doctorId, rangeId, payload) {
  await getAvailabilityRangeOrThrow(doctorId, rangeId);

  const { fromDate, toDate } = validateRangePayload(payload);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.availabilityRule.deleteMany({
      where: { rangeId },
    });

    await tx.availabilityRange.update({
      where: { id: rangeId },
      data: {
        title: payload.title || null,
        fromDate,
        toDate,
      },
    });

    await tx.availabilityRule.createMany({
      data: payload.rules.map((rule) => ({
        rangeId,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
        slotMinutes: rule.slotMinutes,
      })),
    });

    return tx.availabilityRange.findUnique({
      where: { id: rangeId },
      include: {
        rules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });
  });

  return normalizeAvailabilityRange(updated);
}

export async function listAvailabilityRanges(doctorId, filters = {}) {
  await getDoctorOrThrow(doctorId);

  const where = {
    doctorId,
    ...(filters.from || filters.to
      ? {
          AND: [
            ...(filters.from
              ? [{ toDate: { gte: startOfDay(filters.from) } }]
              : []),
            ...(filters.to
              ? [{ fromDate: { lte: endOfDay(filters.to) } }]
              : []),
          ],
        }
      : {}),
  };

  const ranges = await prisma.availabilityRange.findMany({
    where,
    orderBy: [{ fromDate: "asc" }, { createdAt: "asc" }],
    include: {
      rules: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });

  return ranges.map(normalizeAvailabilityRange);
}

export async function getAvailabilityRangeById(doctorId, rangeId) {
  const range = await getAvailabilityRangeOrThrow(doctorId, rangeId);
  return normalizeAvailabilityRange(range);
}

export async function deleteAvailabilityRange(doctorId, rangeId) {
  await getAvailabilityRangeOrThrow(doctorId, rangeId);

  // Check appointments first (higher priority error)
  const appointmentCount = await prisma.appointment.count({
    where: {
      slot: { availabilityRangeId: rangeId },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  if (appointmentCount > 0) {
    throw createHttpError(
      409,
      "AVAILABILITY_RANGE_HAS_APPOINTMENTS",
      `Cannot delete availability range because it has ${appointmentCount} active appointment(s)`
    );
  }

  const slotCount = await prisma.slot.count({
    where: { availabilityRangeId: rangeId },
  });

  if (slotCount > 0) {
    throw createHttpError(
      409,
      "AVAILABILITY_RANGE_HAS_SLOTS",
      "Cannot delete availability range because slots already exist"
    );
  }

  await prisma.availabilityRange.delete({
    where: { id: rangeId },
  });

  return { id: rangeId, deleted: true };
}
/**
 * Bật/tắt trạng thái hoạt động của bác sĩ.
 * Khi inactive, bác sĩ không thể đăng nhập và không hiển thị ở danh sách công khai.
 */
export async function toggleDoctorStatus(doctorId) {
  const doctor = await getDoctorOrThrow(doctorId);

  const updated = await prisma.user.update({
    where: { id: doctor.userId },
    data: { isActive: !doctor.user.isActive },
    select: { id: true, isActive: true },
  });

  return { doctorId, userId: doctor.userId, isActive: updated.isActive };
}

export async function updateDoctorAvatar(doctorId, avatarUrl) {
  await getDoctorOrThrow(doctorId);

  const updated = await prisma.doctorProfile.update({
    where: { id: doctorId },
    data: { avatarUrl },
    include: {
      user: { select: { id: true, isActive: true, phone: true } },
      specialtyRef: true,
      services: { include: { service: { include: { specialtyRef: true } } } },
    },
  });

  return normalizeDoctor(updated);
}
