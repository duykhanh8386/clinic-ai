import { prisma } from "../config/prisma.js";
import { createHttpError } from "../utils/httpError.js";

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSpecialty(specialty) {
  return {
    id: specialty.id,
    name: specialty.name,
    description: specialty.description ?? null,
    doctorsCount: specialty._count?.doctors ?? undefined,
    servicesCount: specialty._count?.services ?? undefined,
    createdAt: specialty.createdAt,
    updatedAt: specialty.updatedAt,
  };
}

async function findSpecialtyByName(name, tx = prisma) {
  return tx.specialty.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
}

export async function resolveSpecialtyInput(
  { specialtyId, specialty } = {},
  { tx = prisma, createByName = false, required = false } = {}
) {
  if (specialtyId) {
    const found = await tx.specialty.findUnique({ where: { id: specialtyId } });
    if (!found) {
      throw createHttpError(400, "SPECIALTY_NOT_FOUND", "Specialty not found");
    }
    return found;
  }

  const name = cleanText(specialty);
  if (name) {
    const found = await findSpecialtyByName(name, tx);
    if (found) return found;
    if (createByName) {
      return tx.specialty.create({
        data: { name },
      });
    }
    throw createHttpError(400, "SPECIALTY_NOT_FOUND", "Specialty not found");
  }

  if (required) {
    throw createHttpError(400, "SPECIALTY_REQUIRED", "Specialty is required");
  }

  return null;
}

export async function listSpecialties({ page = 1, limit = 100, search } = {}) {
  const safePage = toInt(page, 1);
  const safeLimit = Math.min(toInt(limit, 100), 100);
  const q = cleanText(search);

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, items] = await prisma.$transaction([
    prisma.specialty.count({ where }),
    prisma.specialty.findMany({
      where,
      orderBy: [{ name: "asc" }],
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: {
        _count: {
          select: { doctors: true, services: true },
        },
      },
    }),
  ]);

  return {
    items: items.map(normalizeSpecialty),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

export async function getSpecialtyById(id) {
  const specialty = await prisma.specialty.findUnique({
    where: { id },
    include: {
      _count: {
        select: { doctors: true, services: true },
      },
    },
  });

  if (!specialty) {
    throw createHttpError(404, "SPECIALTY_NOT_FOUND", "Specialty not found");
  }

  return normalizeSpecialty(specialty);
}

export async function createSpecialty(payload) {
  const name = cleanText(payload.name);
  const existed = await findSpecialtyByName(name);

  if (existed) {
    throw createHttpError(409, "SPECIALTY_EXISTS", "Specialty name already exists");
  }

  const created = await prisma.specialty.create({
    data: {
      name,
      description: cleanText(payload.description) || null,
    },
    include: {
      _count: {
        select: { doctors: true, services: true },
      },
    },
  });

  return normalizeSpecialty(created);
}

export async function updateSpecialty(id, payload) {
  await getSpecialtyById(id);

  const data = {};
  const nextName = "name" in payload ? cleanText(payload.name) : null;
  if (nextName) {
    const existed = await findSpecialtyByName(nextName);
    if (existed && existed.id !== id) {
      throw createHttpError(409, "SPECIALTY_EXISTS", "Specialty name already exists");
    }
    data.name = nextName;
  }
  if ("description" in payload) {
    data.description = cleanText(payload.description) || null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.specialty.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { doctors: true, services: true },
        },
      },
    });

    if (data.name) {
      await tx.doctorProfile.updateMany({
        where: { specialtyId: id },
        data: { specialty: data.name },
      });
      await tx.service.updateMany({
        where: { specialtyId: id },
        data: { specialty: data.name },
      });
    }

    return item;
  });

  return normalizeSpecialty(updated);
}

export async function deleteSpecialty(id) {
  await getSpecialtyById(id);

  const [doctorCount, serviceCount] = await prisma.$transaction([
    prisma.doctorProfile.count({ where: { specialtyId: id } }),
    prisma.service.count({ where: { specialtyId: id } }),
  ]);

  if (doctorCount > 0 || serviceCount > 0) {
    throw createHttpError(
      409,
      "SPECIALTY_IN_USE",
      "Cannot delete specialty because it is assigned to doctors or services"
    );
  }

  await prisma.specialty.delete({ where: { id } });

  return { id, deleted: true };
}
