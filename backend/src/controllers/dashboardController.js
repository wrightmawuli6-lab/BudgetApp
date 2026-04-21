import { getDashboardData } from "../services/dashboardService.js";

export async function getDashboardController(req, res) {
  const data = await getDashboardData(req.user.id, req.query.month);
  res.json(data);
}