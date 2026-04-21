import {
  addIncome,
  editIncome,
  listIncome,
  monthlyIncomeSummary,
  removeIncome
} from "../services/incomeService.js";

export async function createIncomeController(req, res) {
  const income = await addIncome(req.user.id, req.body);
  res.status(201).json(income);
}

export async function updateIncomeController(req, res) {
  const income = await editIncome(req.user.id, req.params.id, req.body);
  res.json(income);
}

export async function deleteIncomeController(req, res) {
  await removeIncome(req.user.id, req.params.id);
  res.status(204).send();
}

export async function listIncomeController(req, res) {
  const data = await listIncome(req.user.id, req.query.month);
  res.json(data);
}

export async function monthlyIncomeSummaryController(req, res) {
  const summary = await monthlyIncomeSummary(req.user.id, req.query.month);
  res.json(summary);
}