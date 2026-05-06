import { prisma } from "../config/prisma.js";
import { createHttpError } from "../utils/httpError.js";
import * as doctorService from "../services/doctor.service.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

async function assertDoctorOwnerOrAdmin(reqUser, doctorId) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    select: { userId: true },
  });

  if (!doctor) {
    throw createHttpError(404, "DOCTOR_NOT_FOUND", "Doctor not found");
  }

  if (reqUser.role === "ADMIN") return;
  if (reqUser.role === "DOCTOR" && doctor.userId === reqUser.id) return;

  throw createHttpError(403, "FORBIDDEN", "Forbidden");
}

export async function list(req, res, next) {
  try {
    const includeInactive = req.user?.role === "ADMIN" && req.query.includeInactive === "true";
    const result = await doctorService.listDoctors({ ...req.query, includeInactive });
    res.json({ success: true, message: "OK", data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const includeInactive = req.user?.role === "ADMIN" && req.query.includeInactive === "true";
    const doctor = await doctorService.getDoctorById(req.params.id, { includeInactive });
    res.json({ success: true, message: "OK", data: doctor });
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const result = await doctorService.createDoctor(req.body);
    res.status(201).json({ success: true, message: "Created", data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    await assertDoctorOwnerOrAdmin(req.user, req.params.id);
    const updated = await doctorService.updateDoctorProfile(req.params.id, req.body);
    res.json({ success: true, message: "Updated", data: updated });
  } catch (error) {
    next(error);
  }
}

export async function updateServices(req, res, next) {
  try {
    const updated = await doctorService.setDoctorServices(req.params.id, req.body.serviceIds);
    res.json({ success: true, message: "Updated", data: updated });
  } catch (error) {
    next(error);
  }
}

export async function createAvailabilityRange(req, res, next) {
  try {
    await assertDoctorOwnerOrAdmin(req.user, req.params.id);
    const range = await doctorService.createAvailabilityRange(req.params.id, req.body);
    res.status(201).json({ success: true, message: "Created", data: range });
  } catch (error) {
    next(error);
  }
}

export async function updateAvailabilityRange(req, res, next) {
  try {
    await assertDoctorOwnerOrAdmin(req.user, req.params.id);
    const range = await doctorService.updateAvailabilityRange(
      req.params.id,
      req.params.rangeId,
      req.body
    );
    res.json({ success: true, message: "Updated", data: range });
  } catch (error) {
    next(error);
  }
}

export async function listAvailabilityRanges(req, res, next) {
  try {
    const ranges = await doctorService.listAvailabilityRanges(req.params.id, req.query);
    res.json({ success: true, message: "OK", data: ranges });
  } catch (error) {
    next(error);
  }
}

export async function getAvailabilityRangeById(req, res, next) {
  try {
    const range = await doctorService.getAvailabilityRangeById(req.params.id, req.params.rangeId);
    res.json({ success: true, message: "OK", data: range });
  } catch (error) {
    next(error);
  }
}

export async function deleteAvailabilityRange(req, res, next) {
  try {
    await assertDoctorOwnerOrAdmin(req.user, req.params.id);
    const result = await doctorService.deleteAvailabilityRange(req.params.id, req.params.rangeId);
    res.json({ success: true, message: "Deleted", data: result });
  } catch (error) {
    next(error);
  }
}

export async function toggleStatus(req, res, next) {
  try {
    const result = await doctorService.toggleDoctorStatus(req.params.id);
    res.json({ success: true, message: "Status updated", data: result });
  } catch (error) {
    next(error);
  }
}

export async function uploadAvatar(req, res, next) {
  try {
    await assertDoctorOwnerOrAdmin(req.user, req.params.id);

    if (!req.file) {
      throw createHttpError(400, "NO_FILE", "No image file provided");
    }

    const publicId = `doctor_${req.params.id}`;
    const avatarUrl = await uploadToCloudinary(req.file.buffer, publicId);
    const updated = await doctorService.updateDoctorAvatar(req.params.id, avatarUrl);

    res.json({ success: true, message: "Avatar updated", data: updated });
  } catch (error) {
    next(error);
  }
}
