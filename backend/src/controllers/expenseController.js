import {
  addExpense,
  editExpense,
  listExpenses,
  expenseBreakdownByCategory,
  removeExpense
} from "../services/expenseService.js";

export async function createExpenseController(req, res) {
  const expense = await addExpense(req.user.id, req.body);
  res.status(201).json(expense);
}

export async function updateExpenseController(req, res) {
  const expense = await editExpense(req.user.id, req.params.id, req.body);
  res.json(expense);
}

export async function deleteExpenseController(req, res) {
  await removeExpense(req.user.id, req.params.id);
  res.status(204).send();
}

export async function listExpensesController(req, res) {
  const data = await listExpenses(req.user.id, req.query.month);
  res.json(data);
}

export async function categorySummaryController(req, res) {
  const summary = await expenseBreakdownByCategory(req.user.id, req.query.month);
  res.json(summary);
}