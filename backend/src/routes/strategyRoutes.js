import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import {
  getStrategyHistoryController,
  getStrategyHistoryDetailController,
  saveStrategyController
} from "../controllers/strategyController.js";
import { saveStrategySchema } from "../validators/strategyValidators.js";

export const strategyRoutes = Router();

strategyRoutes.use(authMiddleware);
strategyRoutes.post("/save", validateMiddleware(saveStrategySchema), asyncHandler(saveStrategyController));
strategyRoutes.get("/history", asyncHandler(getStrategyHistoryController));
strategyRoutes.get("/history/:strategyId", asyncHandler(getStrategyHistoryDetailController));
