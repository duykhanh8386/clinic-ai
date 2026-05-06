import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import meRoutes from "./me.routes.js";
import otpRoutes from "./otp.routes.js";
import signupRoutes from "./signup.routes.js";
import adminUserRoutes from "./adminUser.routes.js";
import passwordResetRoutes from "./passwordReset.routes.js";
import specialtyRoutes from "./specialty.routes.js";
import serviceRoutes from "./service.routes.js";
import doctorRoutes from "./doctor.routes.js";
import slotRoutes from "./slot.routes.js";
import appointmentRoutes from "./appointment.routes.js";
import previsitRoutes from "./previsit.routes.js";
import appointmentNoteRoutes from "./appointmentNote.routes.js";
import adminStatsRoutes from "./adminStats.routes.js";
import kbRoutes from "./kb.routes.js";
import chatRoutes from "./chat.routes.js";
import notificationRoutes from "./notification.routes.js";

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(meRoutes);
router.use(otpRoutes);
router.use(signupRoutes);
router.use(passwordResetRoutes);

router.use(specialtyRoutes);
router.use(serviceRoutes);
router.use(doctorRoutes);
router.use(slotRoutes);
router.use(appointmentRoutes);
router.use(previsitRoutes);
router.use(appointmentNoteRoutes);
router.use(chatRoutes);
router.use(kbRoutes);

router.use(adminUserRoutes);
router.use(adminStatsRoutes);
router.use(notificationRoutes);

export default router;
