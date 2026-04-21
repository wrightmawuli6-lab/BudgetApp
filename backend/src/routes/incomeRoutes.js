import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import {
  createIncomeController,
  deleteIncomeController,
  listIncomeController,
  monthlyIncomeSummaryController,
  updateIncomeController
} from "../controllers/incomeController.js";
import { createIncomeSchema, updateIncomeSchema } from "../validators/incomeValidators.js";

export const incomeRoutes = Router();

incomeRoutes.use(authMiddleware);
incomeRoutes.get("/", asyncHandler(listIncomeController));
incomeRoutes.get("/summary/monthly", asyncHandler(monthlyIncomeSummaryController));
incomeRoutes.post("/", validateMiddleware(createIncomeSchema), asyncHandler(createIncomeController));
incomeRoutes.put("/:id", validateMiddleware(updateIncomeSchema), asyncHandler(updateIncomeController));
incomeRoutes.delete("/:id", asyncHandler(deleteIncomeController));