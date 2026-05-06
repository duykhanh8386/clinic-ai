import * as adminStatsService from "../services/adminStats.service.js";

export async function get(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const data = await adminStatsService.getAdminStats(query);

    res.json({
      success: true,
      data,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
}
