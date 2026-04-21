import { getSavingsGoalById } from "../services/savingsGoalService.js";
import { getBudgetStrategyById, getBudgetStrategies, saveBudgetStrategy } from "../services/budgetStrategyService.js";

export async function saveStrategyController(req, res) {
  const { goalId, strategyName, monthlySavingsRequired, description, spendingAdjustments, stepsToFollow, timelineProjection } = req.body;

  await getSavingsGoalById(req.user.id, goalId);

  const strategy = await saveBudgetStrategy(req.user.id, goalId, {
    strategyName,
    monthlySavingsRequired,
    description,
    spendingAdjustments,
    stepsToFollow,
    timelineProjection
  });

  res.status(201).json({
    message: "Budget strategy saved to your history.",
    strategy
  });
}

export async function getStrategyHistoryController(req, res) {
  const history = await getBudgetStrategies(req.user.id);
  res.json(history);
}

export async function getStrategyHistoryDetailController(req, res) {
  const strategy = await getBudgetStrategyById(req.user.id, req.params.strategyId);
  res.json(strategy);
}
