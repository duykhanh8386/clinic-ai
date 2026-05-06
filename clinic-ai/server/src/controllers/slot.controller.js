import * as slotService from "../services/slot.service.js";

export async function generateDirect(req, res, next) {
  try {
    const result = await slotService.generateSlotsDirect(req.body);
    res.status(201).json({ success: true, message: "Slots generated", data: result });
  } catch (error) {
    next(error);
  }
}

export async function generate(req, res, next) {
  try {
    const result = await slotService.generateSlots(req.body);
    res.status(201).json({
      success: true,
      message: "Slots generated",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const includeInactive = req.user?.role === "ADMIN" && query.includeInactive === true;
    const items = await slotService.listSlots({ ...query, includeInactive });
    res.json({
      success: true,
      message: "OK",
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

export async function listByRange(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const includeInactive = req.user?.role === "ADMIN" && query.includeInactive === true;
    const items = await slotService.listSlotsByRange({ ...query, includeInactive });
    res.json({
      success: true,
      message: "OK",
      data: items,
    });
  } catch (error) {
    next(error);
  }
}
