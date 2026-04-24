import { Router } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import { adminAuthMiddleware } from "../middlewares/adminAuthMiddleware.js";
import { requireAdminPermission } from "../middlewares/adminRbacMiddleware.js";
import {
  assignRolePermissionsController,
  createRoleController,
  listRolesController
} from "../controllers/adminRolesController.js";
import { assignRolePermissionsSchema, createRoleSchema } from "../validators/adminRoleValidators.js";

export const adminRolesRoutes = Router();

adminRolesRoutes.use(asyncHandler(adminAuthMiddleware));

adminRolesRoutes.post(
  "/",
  requireAdminPermission("roles.write"),
  validateMiddleware(createRoleSchema),
  asyncHandler(createRoleController)
);
adminRolesRoutes.get("/", requireAdminPermission("roles.read"), asyncHandler(listRolesController));
adminRolesRoutes.post(
  "/:id/permissions",
  requireAdminPermission("roles.write"),
  validateMiddleware(assignRolePermissionsSchema),
  asyncHandler(assignRolePermissionsController)
);
