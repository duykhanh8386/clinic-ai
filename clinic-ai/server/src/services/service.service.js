import { prisma } from "../config/prisma.js";
import { createHttpError } from "../utils/httpError.js";
import { resolveSpecialtyInput } from "./specialty.service.js";

function toInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function normalizeService(service) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price,
    durationMinutes: service.durationMinutes,
    specialtyId: service.specialtyId ?? service.specialtyRef?.id ?? null,
    specialty: service.specialtyRef?.name ?? service.specialty ?? null,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

export async function listServices({ page = 1, limit = 10, search, doctorId, specialty, specialtyId }) {
  const safePage = toInt(page, 1);
  const safeLimit = Math.min(toInt(limit, 10), 200);

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
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { specialty: { contains: search, mode: "insensitive" } },
        { specialtyRef: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  const where = {
    ...(doctorId ? { doctors: { some: { doctorId } } } : {}),
    ...(and.length ? { AND: and } : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.service.count({ where }),
    prisma.service.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: {
        specialtyRef: true,
      },
    }),
  ]);

  return {
    items: items.map(normalizeService),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

export async function getServiceById(id) {
  const service = await prisma.service.findUnique({
    where: { id },
    include: { specialtyRef: true },
  });
  if (!service) {
    throw createHttpError(404, "SERVICE_NOT_FOUND", "Service not found");
  }
  return normalizeService(service);
}

export async function createService(data) {
  const existed = await prisma.service.findFirst({
    where: { name: { equals: data.name, mode: "insensitive" } },
  });
  if (existed) {
    throw createHttpError(409, "SERVICE_EXISTS", "Service name already exists");
  }

  const specialty = await resolveSpecialtyInput(data, {
    createByName: true,
    required: true,
  });

  const created = await prisma.service.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      durationMinutes: data.durationMinutes,
      specialtyId: specialty.id,
      specialty: specialty.name,
    },
    include: { specialtyRef: true },
  });

  return normalizeService(created);
}

export async function updateService(id, data) {
  await getServiceById(id);

  const nextData = { ...data };
  delete nextData.specialtyId;
  delete nextData.specialty;

  if (data.specialtyId || data.specialty) {
    const specialty = await resolveSpecialtyInput(data, {
      createByName: true,
      required: true,
    });
    nextData.specialtyId = specialty.id;
    nextData.specialty = specialty.name;
  }

  const updated = await prisma.service.update({
    where: { id },
    data: nextData,
    include: { specialtyRef: true },
  });

  return normalizeService(updated);
}

export async function deleteService(serviceId) {
  const service = await getServiceById(serviceId);

  const [slotCount, appointmentCount] = await prisma.$transaction([
    prisma.slot.count({ where: { serviceId } }),
    prisma.appointment.count({ where: { serviceId } }),
  ]);

  if (slotCount > 0 || appointmentCount > 0) {
    throw createHttpError(
      409,
      "SERVICE_HAS_BOOKING_DATA",
      "Cannot delete service because booking data already exists"
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.doctorService.deleteMany({ where: { serviceId } });
    await tx.service.delete({ where: { id: serviceId } });
  });

  return { id: service.id, deleted: true };
}
