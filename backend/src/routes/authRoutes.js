import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import { loginController, registerController } from "../controllers/authController.js";
import { loginSchema, registerSchema } from "../validators/authValidators.js";

export const authRoutes = Router();

authRoutes.post("/register", validateMiddleware(registerSchema), asyncHandler(registerController));
authRoutes.post("/login", validateMiddleware(loginSchema), asyncHandler(loginController));