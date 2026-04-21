import { Router } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import { adminAuthMiddleware } from "../middlewares/adminAuthMiddleware.js";
import { requireAdminPermission } from "../middlewares/adminRbacMiddleware.js";
import {
  assignRolesToAdminUserController,
  createAdminUserController,
  listAdminUsersController,
  updateAdminUserController
} from "../controllers/adminUsersController.js";
import {
  assignAdminRolesSchema,
  createAdminUserSchema,
  updateAdminUserSchema
} from "../validators/adminUserValidators.js";

export const adminUsersRoutes = Router();

adminUsersRoutes.use(asyncHandler(adminAuthMiddleware));

adminUsersRoutes.post(
  "/",
  requireAdminPermission("users.write"),
  validateMiddleware(createAdminUserSchema),
  asyncHandler(createAdminUserController)
);
adminUsersRoutes.get("/", requireAdminPermission("users.read"), asyncHandler(listAdminUsersController));
adminUsersRoutes.patch(
  "/:id",
  requireAdminPermission("users.write"),
  validateMiddleware(updateAdminUserSchema),
  asyncHandler(updateAdminUserController)
);
adminUsersRoutes.post(
  "/:id/roles",
  requireAdminPermission("users.write"),
  validateMiddleware(assignAdminRolesSchema),
  asyncHandler(assignRolesToAdminUserController)
);
