import * as serviceService from "../services/service.service.js";

export async function list(req, res, next) {
  try {
    const { page, limit, search, doctorId, specialty, specialtyId } = req.query;
    const result = await serviceService.listServices({
      page,
      limit,
      search,
      doctorId,
      specialty,
      specialtyId,
    });
    res.json({ success: true, message: "OK", data: result.items, meta: result.meta });
  } catch (e) {
    next(e);
  }
}

export async function getById(req, res, next) {
  try {
    const service = await serviceService.getServiceById(req.params.id);
    res.json({ success: true, message: "OK", data: service });
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const service = await serviceService.createService(req.body);
    res.status(201).json({ success: true, message: "Created", data: service });
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const service = await serviceService.updateService(req.params.id, req.body);
    res.json({ success: true, message: "Updated", data: service });
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    await serviceService.deleteService(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
}
