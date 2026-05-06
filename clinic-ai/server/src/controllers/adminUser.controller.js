import * as adminUserService from "../services/adminUser.service.js";
import { createHttpError } from "../utils/httpError.js";

export async function listUsers(req, res, next) {
  try {
    const { page, limit, role, search } = req.query;
    const data = await adminUserService.adminListUsers({ page, limit, role, search });
    res.json({ success: true, data: data.users, meta: { total: data.total, page: data.page, limit: data.limit, totalPages: data.totalPages } });
  } catch (e) { next(e); }
}

export async function getUser(req, res, next) {
  try {
    const user = await adminUserService.adminGetUser(req.params.id);
    res.json({ success: true, data: user });
  } catch (e) { next(e); }
}

export async function updateUser(req, res, next) {
  try {
    const user = await adminUserService.adminUpdateUser({ userId: req.params.id, ...req.body });
    res.json({ success: true, message: "Updated", data: user });
  } catch (e) { next(e); }
}

export async function toggleUserStatus(req, res, next) {
  try {
    const user = await adminUserService.adminToggleUserStatus(req.params.id);
    res.json({ success: true, message: "Toggled", data: user });
  } catch (e) { next(e); }
}

export async function deleteUser(req, res, next) {
  try {
    throw createHttpError(
      405,
      "USER_DELETE_DISABLED",
      "Không hỗ trợ xóa tài khoản. Hãy vô hiệu hóa tài khoản thay vì xóa."
    );
  } catch (e) { next(e); }
}

export async function createUser(req, res, next) {
  try {
    const user = await adminUserService.adminCreateUser(req.body);
    res.status(201).json({ success: true, message: "Created", data: user });
  } catch (e) { next(e); }
}

export async function updateUserRole(req, res, next) {
  try {
    const user = await adminUserService.adminUpdateUserRole({ userId: req.params.id, role: req.body.role });
    res.json({ success: true, message: "Updated", data: user });
  } catch (e) { next(e); }
}

export async function updateDoctorPassword(req, res, next) {
  try {
    const user = await adminUserService.adminUpdateDoctorPassword({
      userId: req.params.id,
      password: req.body.password,
    });
    res.json({ success: true, message: "Password updated", data: user });
  } catch (e) { next(e); }
}
