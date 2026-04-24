import { analyzeSpendingTrends } from "../services/trendService.js";

export async function trendAnalysisController(req, res) {
  const trends = await analyzeSpendingTrends(req.user.id);
  res.json(trends);
}