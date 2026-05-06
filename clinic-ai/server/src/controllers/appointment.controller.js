import * as appointmentService from "../services/appointment.service.js";
import {
  subscribeDoctorAppointmentStream,
  subscribePatientAppointmentStream,
} from "../services/realtime.service.js";

export async function create(req, res, next) {
  try {
    const appointment = await appointmentService.createAppointment({
      patientUserId: req.user.id,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: "Appointment created",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function stream(req, res, next) {
  try {
    let unsubscribe;

    if (req.user.role === "DOCTOR") {
      const doctorId = await appointmentService.getDoctorProfileIdByUserId(req.user.id);
      unsubscribe = subscribeDoctorAppointmentStream({ doctorId, res });
    } else if (req.user.role === "PATIENT") {
      unsubscribe = subscribePatientAppointmentStream({ patientId: req.user.id, res });
    } else {
      return res
        .status(403)
        .json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }

    req.on("close", () => {
      unsubscribe();
    });
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const result = await appointmentService.listAppointments({
      user: req.user,
      ...(req.validatedQuery || req.query),
    });

    res.json({
      success: true,
      message: "OK",
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const appointment = await appointmentService.getAppointmentById({
      id: req.params.id,
      user: req.user,
    });

    res.json({
      success: true,
      message: "OK",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancel(req, res, next) {
  try {
    const appointment = await appointmentService.cancelAppointment({
      id: req.params.id,
      user: req.user,
      note: req.body.note,
    });

    res.json({
      success: true,
      message: "Appointment canceled",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function reschedule(req, res, next) {
  try {
    const appointment = await appointmentService.rescheduleAppointment({
      id: req.params.id,
      user: req.user,
      newSlotId: req.body.newSlotId,
    });

    res.json({
      success: true,
      message: "Appointment rescheduled",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const appointment = await appointmentService.updateAppointmentStatus({
      id: req.params.id,
      user: req.user,
      status: req.body.status,
    });

    res.json({
      success: true,
      message: "Appointment updated",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}
