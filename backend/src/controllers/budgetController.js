import { compareBudgetMonths } from "../services/budgetComparisonService.js";
import { runBudgetSimulation } from "../services/simulationService.js";

export async function compareBudgetController(req, res) {
  const { month1, month2 } = req.query;
  const data = await compareBudgetMonths(req.user.id, month1, month2);
  res.json(data);
}

export async function simulateBudgetController(req, res) {
  const result = await runBudgetSimulation(req.user.id, req.body);
  res.json(result);
}