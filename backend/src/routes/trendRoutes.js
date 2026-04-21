import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { trendAnalysisController } from "../controllers/trendController.js";

export const trendRoutes = Router();

trendRoutes.use(authMiddleware);
trendRoutes.get("/", asyncHandler(trendAnalysisController));