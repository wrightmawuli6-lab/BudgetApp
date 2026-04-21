import React, { useEffect, useState } from "react";
import { getAiFinancialAnalysis, getDashboard } from "../services/dashboardApi";

interface DashboardState {
  total_income: number;
  total_expenses: number;
  balance: number;
  savings_progress: {
    current_progress_percent: number;
    remaining_amount: number;
  } | null;
  expense_breakdown_by_category: Record<string, number>;
  current_budget_status: "on_track" | "overspent";
}

interface AiInsight {
  spending_pattern_analysis: string;
  financial_health_score: number;
  goal_feasibility: string;
  recommended_budget_model: string;
  habit_warnings: string[];
  improvement_suggestions: string[];
  personalized_review_questions: string[];
  motivational_message: string;
}

export default function SampleDashboard() {
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getDashboard();
        if (mounted) setDashboard(data);
      } catch (err) {
        if (mounted) setError("Failed to load dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleGenerateInsight = async () => {
    try {
      const data = await getAiFinancialAnalysis();
      setInsight(data);
    } catch {
      setError("Failed to generate AI insight");
    }
  };

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>{error}</div>;
  if (!dashboard) return <div>No dashboard data</div>;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
      <h2>Student Budget Dashboard</h2>
      <div>Total Income: {dashboard.total_income.toFixed(2)}</div>
      <div>Total Expenses: {dashboard.total_expenses.toFixed(2)}</div>
      <div>Balance: {dashboard.balance.toFixed(2)}</div>
      <div>Budget Status: {dashboard.current_budget_status}</div>
      <div>
        Savings Progress: {dashboard.savings_progress ? `${dashboard.savings_progress.current_progress_percent}%` : "Not set"}
      </div>
      <button onClick={handleGenerateInsight}>Generate AI Financial Insight</button>

      {insight && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          <h3>Financial Assistant</h3>
          <p>{insight.spending_pattern_analysis}</p>
          <p>Health Score: {insight.financial_health_score}</p>
          <p>Goal Feasibility: {insight.goal_feasibility}</p>
          <p>Recommended Model: {insight.recommended_budget_model}</p>
          <p>Motivation: {insight.motivational_message}</p>
        </div>
      )}
    </div>
  );
}
