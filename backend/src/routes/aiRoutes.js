import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import { aiAnalysisController, aiGoalAnalysisController, selectGoalPlanController, getBudgetStrategiesController, getBudgetStrategyController, coachInsightController } from "../controllers/aiController.js";
import { aiAnalysisSchema, selectGoalPlanSchema } from "../validators/aiValidators.js";

export const aiRoutes = Router();

aiRoutes.use(authMiddleware);
aiRoutes.post(
  "/analyze",
  (req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
      return validateMiddleware(aiAnalysisSchema)(req, res, next);
    }
    return next();
  },
  asyncHandler(aiAnalysisController)
);
aiRoutes.post("/coach-insight", asyncHandler(coachInsightController));
aiRoutes.post("/analyze-goal/:goalId", asyncHandler(aiGoalAnalysisController));
aiRoutes.post("/select-plan/:goalId", validateMiddleware(selectGoalPlanSchema), asyncHandler(selectGoalPlanController));
aiRoutes.get("/strategies", asyncHandler(getBudgetStrategiesController));
aiRoutes.get("/strategies/:strategyId", asyncHandler(getBudgetStrategyController));
