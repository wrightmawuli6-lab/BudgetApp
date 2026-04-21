import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listNotificationsController } from "../controllers/notificationController.js";

export const notificationRoutes = Router();

notificationRoutes.use(authMiddleware);
notificationRoutes.get("/", asyncHandler(listNotificationsController));