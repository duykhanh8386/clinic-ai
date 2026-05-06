import * as kbService from "../services/kb.service.js";

export async function create(req, res, next) {
  try {
    const data = await kbService.createDocument(req.body);
    res.status(201).json({ success: true, data, meta: null });
  } catch (error) {
    next(error);
  }
}

export async function process(req, res, next) {
  try {
    const data = await kbService.processDocument({
      id: req.params.id,
      chunkSize: req.body.chunkSize,
      overlap: req.body.overlap,
    });

    res.json({ success: true, data, meta: null });
  } catch (error) {
    next(error);
  }
}

export async function importExcel(req, res, next) {
  try {
    const data = await kbService.importDocumentsFromExcel({
      file: req.file,
      autoProcess: req.body?.autoProcess,
    });

    res.status(201).json({ success: true, data, meta: null });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const data = await kbService.updateDocument({
      id: req.params.id,
      title: req.body.title,
      content: req.body.content,
      autoProcess: req.body.autoProcess,
    });

    res.json({ success: true, data, meta: null });
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const result = await kbService.listDocuments(req.validatedQuery || req.query);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const data = await kbService.getDocument({ id: req.params.id });
    res.json({ success: true, data, meta: null });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const data = await kbService.deleteDocument({ id: req.params.id });
    res.json({ success: true, data, meta: null });
  } catch (error) {
    next(error);
  }
}
