import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { createHttpError } from "../utils/httpError.js";

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  fullName: true,
  phone: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  isActive: true,
  createdAt: true,
};

export async function adminListUsers({ page = 1, limit = 20, role, search }) {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(role ? { role } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: USER_SELECT, orderBy: { createdAt: "desc" }, skip, take: limitNum }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
}

export async function adminGetUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user) throw createHttpError(404, "USER_NOT_FOUND", "User not found");
  return user;
}

export async function adminUpdateUser({ userId, fullName, phone, role }) {
  const existed = await prisma.user.findUnique({ where: { id: userId } });
  if (!existed) throw createHttpError(404, "USER_NOT_FOUND", "User not found");

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName !== undefined ? { fullName } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(role !== undefined ? { role } : {}),
    },
    select: USER_SELECT,
  });
  return user;
}

export async function adminToggleUserStatus(userId) {
  const existed = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true } });
  if (!existed) throw createHttpError(404, "USER_NOT_FOUND", "User not found");

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !existed.isActive },
    select: USER_SELECT,
  });
  return user;
}

export async function adminDeleteUser(userId) {
  const existed = await prisma.user.findUnique({ where: { id: userId } });
  if (!existed) throw createHttpError(404, "USER_NOT_FOUND", "User not found");
  await prisma.user.delete({ where: { id: userId } });
}

export async function adminCreateUser({ email, password, role, fullName, phone }) {
  if (role === "PATIENT") {
    throw createHttpError(
      400,
      "PATIENT_CREATE_DISABLED",
      "Không được tạo tài khoản bệnh nhân từ trang quản trị."
    );
  }

  const existed = await prisma.user.findUnique({ where: { email } });
  if (existed) throw createHttpError(409, "EMAIL_EXISTS", "Email already exists");

  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { email, passwordHash, role, fullName, phone },
    select: USER_SELECT,
  });
}

export async function adminUpdateUserRole({ userId, role }) {
  const existed = await prisma.user.findUnique({ where: { id: userId } });
  if (!existed) throw createHttpError(404, "USER_NOT_FOUND", "User not found");
  return prisma.user.update({ where: { id: userId }, data: { role }, select: USER_SELECT });
}

export async function adminUpdateDoctorPassword({ userId, password }) {
  const existed = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!existed) throw createHttpError(404, "USER_NOT_FOUND", "User not found");
  if (existed.role !== "DOCTOR") {
    throw createHttpError(
      400,
      "USER_NOT_DOCTOR",
      "Chỉ được phép đổi mật khẩu cho tài khoản bác sĩ tại chức năng này"
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: USER_SELECT,
    });

    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });

    return user;
  });
}
