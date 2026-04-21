import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import {
  categorySummaryController,
  createExpenseController,
  deleteExpenseController,
  listExpensesController,
  updateExpenseController
} from "../controllers/expenseController.js";
import { createExpenseSchema, updateExpenseSchema } from "../validators/expenseValidators.js";

export const expenseRoutes = Router();

expenseRoutes.use(authMiddleware);
expenseRoutes.get("/", asyncHandler(listExpensesController));
expenseRoutes.get("/summary/category", asyncHandler(categorySummaryController));
expenseRoutes.post("/", validateMiddleware(createExpenseSchema), asyncHandler(createExpenseController));
expenseRoutes.put("/:id", validateMiddleware(updateExpenseSchema), asyncHandler(updateExpenseController));
expenseRoutes.delete("/:id", asyncHandler(deleteExpenseController));