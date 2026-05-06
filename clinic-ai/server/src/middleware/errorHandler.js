export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: err.message || "Internal Server Error",
      ...(err.details !== undefined ? { details: err.details } : {}),
    },
  });
}