import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMiddleware } from "../middlewares/validateMiddleware.js";
import {
  addManualSavingsEntryController,
  createSavingsGoalController,
  getSavingsGoalController,
  getPrimarySavingsGoalController,
  updateSavingsGoalController,
  upsertSavingsGoalController
} from "../controllers/savingsGoalController.js";
import {
  addManualSavingsEntrySchema,
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
  upsertSavingsGoalSchema
} from "../validators/savingsValidators.js";

export const savingsGoalRoutes = Router();

savingsGoalRoutes.use(authMiddleware);
savingsGoalRoutes.get("/", asyncHandler(getSavingsGoalController));
savingsGoalRoutes.get("/primary", asyncHandler(getPrimarySavingsGoalController));
savingsGoalRoutes.post("/", validateMiddleware(createSavingsGoalSchema), asyncHandler(createSavingsGoalController));
savingsGoalRoutes.put("/:id", validateMiddleware(updateSavingsGoalSchema), asyncHandler(updateSavingsGoalController));
savingsGoalRoutes.put("/", validateMiddleware(upsertSavingsGoalSchema), asyncHandler(upsertSavingsGoalController));
savingsGoalRoutes.post(
  "/:id/manual-entry",
  validateMiddleware(addManualSavingsEntrySchema),
  asyncHandler(addManualSavingsEntryController)
);
