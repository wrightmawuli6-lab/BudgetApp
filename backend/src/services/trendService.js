import { query } from "../config/db.js";

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function isoWeekKey(dateStr) {
  const date = new Date(dateStr + "T00:00:00Z");
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((date - firstThursday) / 604800000);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export async function analyzeSpendingTrends(userId) {
  const expensesResult = await query(
    `SELECT category, amount, expense_date
       FROM expenses
      WHERE user_id = $1
        AND expense_date >= CURRENT_DATE - INTERVAL '6 months'
      ORDER BY expense_date ASC`,
    [userId]
  );

  const incomesResult = await query(
    `SELECT amount, income_date
       FROM incomes
      WHERE user_id = $1
        AND income_date >= CURRENT_DATE - INTERVAL '6 months'
      ORDER BY income_date ASC`,
    [userId]
  );

  const weeklyMap = new Map();
  const monthlyMap = new Map();
  const dailyMap = new Map();
  const categoryByMonth = new Map();

  for (const row of expensesResult.rows) {
    const amount = Number(row.amount);
    const isoDate = row.expense_date.toISOString().slice(0, 10);
    const wKey = isoWeekKey(isoDate);
    const mKey = monthKey(isoDate);

    weeklyMap.set(wKey, (weeklyMap.get(wKey) || 0) + amount);
    monthlyMap.set(mKey, (monthlyMap.get(mKey) || 0) + amount);
    dailyMap.set(isoDate, (dailyMap.get(isoDate) || 0) + amount);

    const catMonthKey = `${mKey}:${row.category}`;
    categoryByMonth.set(catMonthKey, (categoryByMonth.get(catMonthKey) || 0) + amount);
  }

  const monthlyIncomeMap = new Map();
  for (const row of incomesResult.rows) {
    const mKey = monthKey(row.income_date.toISOString().slice(0, 10));
    monthlyIncomeMap.set(mKey, (monthlyIncomeMap.get(mKey) || 0) + Number(row.amount));
  }

  const weeklyEntries = [...weeklyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const monthlyEntries = [...monthlyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const weeklyTrend = {
    average: Number(mean(weeklyEntries.map(([, v]) => v)).toFixed(2)),
    latest: weeklyEntries.at(-1)?.[1] || 0,
    previous: weeklyEntries.at(-2)?.[1] || 0
  };

  const monthlyTrend = {
    average: Number(mean(monthlyEntries.map(([, v]) => v)).toFixed(2)),
    latest: monthlyEntries.at(-1)?.[1] || 0,
    previous: monthlyEntries.at(-2)?.[1] || 0
  };

  const currentMonth = monthlyEntries.at(-1)?.[0];
  const previousMonth = monthlyEntries.at(-2)?.[0];

  let highestGrowthCategory = "Other";
  let highestGrowth = Number.NEGATIVE_INFINITY;

  if (currentMonth && previousMonth) {
    const categories = new Set();
    for (const key of categoryByMonth.keys()) {
      categories.add(key.split(":")[1]);
    }

    for (const category of categories) {
      const currentVal = categoryByMonth.get(`${currentMonth}:${category}`) || 0;
      const previousVal = categoryByMonth.get(`${previousMonth}:${category}`) || 0;
      const growth = currentVal - previousVal;
      if (growth > highestGrowth) {
        highestGrowth = growth;
        highestGrowthCategory = category;
      }
    }
  }

  const dailyValues = [...dailyMap.values()];
  const dailyAvg = mean(dailyValues);
  const spendingSpikeDetected = dailyValues.some((v) => v > dailyAvg * 1.8 && v > 25);

  const monthKeys = [...new Set([...monthlyMap.keys(), ...monthlyIncomeMap.keys()])].sort();
  const savingsRates = monthKeys.map((m) => {
    const income = monthlyIncomeMap.get(m) || 0;
    const expenses = monthlyMap.get(m) || 0;
    return income > 0 ? (income - expenses) / income : 0;
  });

  const decreasingSavingsRate = savingsRates.length >= 2 && savingsRates.at(-1) < savingsRates.at(-2);
  const increasingDebtRisk = (monthlyTrend.latest || 0) > (monthlyTrend.previous || 0) && decreasingSavingsRate;

  await query(
    `INSERT INTO spending_trends (user_id, weekly_average, monthly_average, spike_detected)
     VALUES ($1, $2, $3, $4)`,
    [userId, weeklyTrend.average, monthlyTrend.average, spendingSpikeDetected]
  );

  return {
    weekly_trend: weeklyTrend,
    monthly_trend: monthlyTrend,
    highest_growth_category: highestGrowthCategory,
    spending_spike_detected: spendingSpikeDetected,
    overspending_categories: highestGrowth > 0 ? [highestGrowthCategory] : [],
    increasing_debt_risk: increasingDebtRisk,
    decreasing_savings_rate: decreasingSavingsRate
  };
}