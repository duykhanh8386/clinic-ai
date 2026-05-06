import * as noteService from "../services/appointmentNote.service.js";

export async function upsert(req, res, next) {
  try {
    const { diagnosis, prescriptionNotes, followUpDays, notes } = req.body;
    const data = await noteService.upsertAppointmentNote({
      appointmentId: req.params.id,
      user: req.user,
      diagnosis,
      prescriptionNotes,
      followUpDays: followUpDays !== undefined ? Number(followUpDays) : undefined,
      notes,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function get(req, res, next) {
  try {
    const data = await noteService.getAppointmentNote({
      appointmentId: req.params.id,
      user: req.user,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
