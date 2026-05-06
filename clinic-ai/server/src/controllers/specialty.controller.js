import * as specialtyService from "../services/specialty.service.js";

export async function list(req, res, next) {
  try {
    const result = await specialtyService.listSpecialties(req.query);
    res.json({ success: true, message: "OK", data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const specialty = await specialtyService.getSpecialtyById(req.params.id);
    res.json({ success: true, message: "OK", data: specialty });
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const specialty = await specialtyService.createSpecialty(req.body);
    res.status(201).json({ success: true, message: "Created", data: specialty });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const specialty = await specialtyService.updateSpecialty(req.params.id, req.body);
    res.json({ success: true, message: "Updated", data: specialty });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await specialtyService.deleteSpecialty(req.params.id);
    res.json({ success: true, message: "Deleted", data: result });
  } catch (error) {
    next(error);
  }
}
