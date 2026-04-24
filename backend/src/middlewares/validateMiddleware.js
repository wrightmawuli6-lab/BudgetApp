import { ApiError } from "../utils/ApiError.js";

export function validateMiddleware(schema, source = "body") {
  return (req, _res, next) => {
    const payload = req[source];
    const result = schema.safeParse(payload);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }));
      return next(new ApiError(400, "Validation error", details));
    }

    req[source] = result.data;
    return next();
  };
}