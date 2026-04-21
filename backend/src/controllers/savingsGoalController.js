import {
  addManualSavingsEntry,
  createSavingsGoal,
  getSavingsGoal,
  listSavingsGoals,
  updateSavingsGoal,
  upsertSavingsGoal
} from "../services/savingsGoalService.js";

export async function getSavingsGoalController(req, res) {
  const goals = await listSavingsGoals(req.user.id);
  res.json(goals);
}

export async function upsertSavingsGoalController(req, res) {
  const goal = await upsertSavingsGoal(req.user.id, req.body);
  res.status(201).json(goal);
}

export async function createSavingsGoalController(req, res) {
  const goal = await createSavingsGoal(req.user.id, req.body);
  res.status(201).json(goal);
}

export async function updateSavingsGoalController(req, res) {
  const goal = await updateSavingsGoal(req.user.id, req.params.id, req.body);
  res.status(200).json(goal);
}

export async function addManualSavingsEntryController(req, res) {
  const goal = await addManualSavingsEntry(req.user.id, req.params.id, req.body);
  res.status(201).json(goal);
}

export async function getPrimarySavingsGoalController(req, res) {
  const goal = await getSavingsGoal(req.user.id);
  res.json(goal);
}
