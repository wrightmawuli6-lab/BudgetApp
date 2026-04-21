import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import {
  analyzeGoalRequestController,
  getBudgetStrategiesController,
  getBudgetStrategyController,
  selectBudgetStrategyController
} from "../controllers/aiController.js";
import { analyzeGoalRequestSchema, selectBudgetStrategySchema } from "../validators/aiValidators.js";

export const goalsRoutes = Router();

goalsRoutes.use(authMiddleware);
goalsRoutes.post("/analyze", validateMiddleware(analyzeGoalRequestSchema), asyncHandler(analyzeGoalRequestController));
goalsRoutes.post("/strategies/select", validateMiddleware(selectBudgetStrategySchema), asyncHandler(selectBudgetStrategyController));
goalsRoutes.get("/strategies", asyncHandler(getBudgetStrategiesController));
goalsRoutes.get("/strategies/:strategyId", asyncHandler(getBudgetStrategyController));
