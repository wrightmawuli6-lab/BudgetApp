import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { recordDailyUsageAndGetStreak } from "../services/usageStreakService.js";

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing or invalid authorization token"));
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return next(new ApiError(401, "Invalid or expired token"));
  }

  try {
    const usageStreak = await recordDailyUsageAndGetStreak(payload.sub);
    req.user = { id: payload.sub, email: payload.email, usageStreak };
    res.setHeader("X-Usage-Streak", String(usageStreak));
    return next();
  } catch (error) {
    return next(error);
  }
}
