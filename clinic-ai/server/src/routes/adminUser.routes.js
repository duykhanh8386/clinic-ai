import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import {
  adminCreateUserSchema,
  adminUpdateDoctorPasswordSchema,
  adminUpdateUserRoleSchema,
} from "../schemas/adminUser.schema.js";
import * as adminUserController from "../controllers/adminUser.controller.js";

const router = Router();
const adminOnly = [requireAuth, requireRole("ADMIN")];

// List & filter users
router.get("/admin/users", ...adminOnly, adminUserController.listUsers);

// Get single user
router.get("/admin/users/:id", ...adminOnly, adminUserController.getUser);

// Create user
router.post("/admin/users", ...adminOnly, validateBody(adminCreateUserSchema), adminUserController.createUser);

// Update user info / role in one endpoint
router.patch("/admin/users/:id", ...adminOnly, adminUserController.updateUser);

// Toggle active/inactive
router.patch("/admin/users/:id/toggle-status", ...adminOnly, adminUserController.toggleUserStatus);

// Update role (kept for backwards compat)
router.patch("/admin/users/:id/role", ...adminOnly, validateBody(adminUpdateUserRoleSchema), adminUserController.updateUserRole);

// Update doctor password
router.patch(
  "/admin/users/:id/password",
  ...adminOnly,
  validateBody(adminUpdateDoctorPasswordSchema),
  adminUserController.updateDoctorPassword
);

// Delete user
router.delete("/admin/users/:id", ...adminOnly, adminUserController.deleteUser);

export default router;
