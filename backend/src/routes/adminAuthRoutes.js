import { Router } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import { adminLoginSchema } from "../validators/adminAuthValidators.js";
import { adminAuthRateLimitMiddleware } from "../middlewares/adminRateLimitMiddleware.js";
import { adminAuthMiddleware } from "../middlewares/adminAuthMiddleware.js";
import {
  adminLoginController,
  adminLogoutController,
  adminMeController
} from "../controllers/adminAuthController.js";

export const adminAuthRoutes = Router();

adminAuthRoutes.post(
  "/login",
  adminAuthRateLimitMiddleware,
  validateMiddleware(adminLoginSchema),
  asyncHandler(adminLoginController)
);
adminAuthRoutes.get("/me", asyncHandler(adminAuthMiddleware), asyncHandler(adminMeController));
adminAuthRoutes.post("/logout", asyncHandler(adminAuthMiddleware), asyncHandler(adminLogoutController));
