import * as previsitService from "../services/previsit.service.js";

export async function upsert(req, res, next) {
  try {
    const data = await previsitService.upsertPrevisit({
      appointmentId: req.params.id,
      user: req.user,
      formData: req.body.formData,
    });

    res.json({
      success: true,
      data,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function get(req, res, next) {
  try {
    const data = await previsitService.getPrevisit({
      appointmentId: req.params.id,
      user: req.user,
    });

    res.json({
      success: true,
      data,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
}
