import { ApiError } from "../utils/ApiError.js";

const buckets = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function adminAuthRateLimitMiddleware(req, _res, next) {
  const key = `${req.ip || "unknown"}:${(req.body?.email || "").toLowerCase()}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return next();
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return next(new ApiError(429, "Too many admin login attempts. Please try again later."));
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return next();
}
