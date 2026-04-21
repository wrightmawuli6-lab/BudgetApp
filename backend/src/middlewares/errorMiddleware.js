export function notFoundMiddleware(_req, _res, next) {
  const error = new Error("Route not found");
  error.statusCode = 404;
  next(error);
}

export function errorMiddleware(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  res.status(statusCode).json({
    error: {
      message,
      details: error.details || null
    }
  });
}