import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import { compareBudgetController, simulateBudgetController } from "../controllers/budgetController.js";
import { simulationSchema } from "../validators/aiValidators.js";

export const budgetRoutes = Router();

budgetRoutes.use(authMiddleware);
budgetRoutes.get("/compare", asyncHandler(compareBudgetController));
budgetRoutes.post("/simulate", validateMiddleware(simulationSchema), asyncHandler(simulateBudgetController));