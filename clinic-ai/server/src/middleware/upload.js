import multer from "multer";
import { createHttpError } from "../utils/httpError.js";

const FIVE_MB = 5 * 1024 * 1024;
const TEN_MB = 10 * 1024 * 1024;

const storage = multer.memoryStorage();

function imageFileFilter(_req, file, cb) {
  if (!file.mimetype.startsWith("image/")) {
    return cb(createHttpError(400, "INVALID_FILE_TYPE", "Only image files are allowed"));
  }
  cb(null, true);
}

function excelFileFilter(_req, file, cb) {
  const allowedMimeTypes = new Set([
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/csv",
  ]);
  const allowedExtensions = /\.(xlsx|xls|csv)$/i;

  if (!allowedMimeTypes.has(file.mimetype) && !allowedExtensions.test(file.originalname || "")) {
    return cb(createHttpError(400, "INVALID_FILE_TYPE", "Only Excel or CSV files are allowed"));
  }

  cb(null, true);
}

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: FIVE_MB },
  fileFilter: imageFileFilter,
}).single("avatar");

export const uploadKbExcel = multer({
  storage,
  limits: { fileSize: TEN_MB },
  fileFilter: excelFileFilter,
}).single("file");
