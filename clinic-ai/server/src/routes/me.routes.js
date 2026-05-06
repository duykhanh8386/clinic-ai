import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";
import { z } from "zod";

const router = Router();

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        phone: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        createdAt: true,
        doctorProfile: {
          select: {
            id: true,
            fullName: true,
            specialty: true,
            bio: true,
            avatarUrl: true,
            createdAt: true,
            updatedAt: true,
            services: {
              include: {
                service: true,
              },
            },
          },
        },
      },
    });

    const normalized = user
      ? {
          ...user,
          doctorProfile: user.doctorProfile
            ? {
                ...user.doctorProfile,
                services: user.doctorProfile.services.map((item) => item.service),
              }
            : null,
        }
      : null;

    res.json({ success: true, message: "OK", data: normalized });
  } catch (e) {
    next(e);
  }
});

const updateMeSchema = z.object({
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự").max(100).optional(),
  phone: z.string().regex(/^(0|\+84)\d{8,10}$/, "Số điện thoại không hợp lệ").optional(),
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
      });
    }

    const { fullName, phone } = parsed.data;
    const data = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (phone !== undefined) data.phone = phone;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, email: true, role: true, fullName: true, phone: true },
    });

    res.json({ success: true, message: "Cập nhật thành công", data: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
