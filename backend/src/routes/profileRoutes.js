import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import { getProfileController, updateProfileController } from "../controllers/profileController.js";
import { updateProfileSchema } from "../validators/profileValidators.js";

export const profileRoutes = Router();

profileRoutes.use(authMiddleware);
profileRoutes.get("/", asyncHandler(getProfileController));
profileRoutes.put("/", validateMiddleware(updateProfileSchema), asyncHandler(updateProfileController));