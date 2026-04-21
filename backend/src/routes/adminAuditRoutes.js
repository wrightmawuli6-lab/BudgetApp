import { Router } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import { adminAuthMiddleware } from "../middlewares/adminAuthMiddleware.js";
import { requireAdminPermission } from "../middlewares/adminRbacMiddleware.js";
import { listAuditLogsController } from "../controllers/adminAuditController.js";
import { adminAuditQuerySchema } from "../validators/adminAuditValidators.js";

export const adminAuditRoutes = Router();

adminAuditRoutes.use(asyncHandler(adminAuthMiddleware));
adminAuditRoutes.get(
  "/",
  requireAdminPermission("audit.read"),
  validateMiddleware(adminAuditQuerySchema, "query"),
  asyncHandler(listAuditLogsController)
);
