import { calculateFinancialHealthScore } from "./financialHealthService.js";

const DISCRETIONARY_CATEGORIES = new Set(["Food", "Transport", "Entertainment", "Other"]);

function roundCurrency(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function addMonthsIso(months) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function monthsUntil(deadline) {
  const now = new Date();
  const end = new Date(deadline);
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return Math.max(1, months);
}

function formatCategoryLabel(category) {
  return category || "Other";
}

function buildLocalInsight(input, healthScore) {
  const savings = input.monthlyIncome - input.monthlyExpenses;
  const savingsRate = input.monthlyIncome > 0 ? (savings / input.monthlyIncome) * 100 : 0;

  const topCategory = Object.entries(input.categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || "Other";
  const goalAmount = input.savings_goal?.target_amount || 0;
  const feasible = savings > 0 && goalAmount > 0 ? goalAmount / savings <= 12 : false;

  const spendingInsights = [];
  const recommendations = [];

  // Analyze spending patterns
  if (input.monthlyIncome > 0) {
    const topCategoryPercentage = (input.categoryBreakdown[topCategory] || 0) / input.monthlyIncome * 100;
    if (topCategoryPercentage > 30) {
      spendingInsights.push(`You spend ${Math.round(topCategoryPercentage)}% of your income on ${formatCategoryLabel(topCategory)}, which is higher than recommended.`);
      recommendations.push(`Reduce ${formatCategoryLabel(topCategory)} spending by GH₵${Math.round((input.categoryBreakdown[topCategory] || 0) * 0.15)} per month to stay on track${input.activeStrategy ? ` with your ${input.activeStrategy.strategyName}` : ''}.`);
    }
  }

  // Compare with active strategy
  if (input.activeStrategy && savings < input.activeStrategy.monthlySavingsRequired) {
    const shortfall = input.activeStrategy.monthlySavingsRequired - savings;
    spendingInsights.push(`Your current savings rate falls short of your selected ${input.activeStrategy.strategyName} by GH₵${shortfall.toFixed(2)} per month.`);
    recommendations.push(`Increase monthly savings by GH₵${shortfall.toFixed(2)} to meet your ${input.activeStrategy.strategyName} target.`);
  }

  const warnings = [];
  if (savingsRate < 10) warnings.push("Savings rate is below 10% of income.");
  if ((input.categoryBreakdown[topCategory] || 0) > input.monthlyExpenses * 0.35) warnings.push(`${formatCategoryLabel(topCategory)} spending exceeds 35% of expenses.`);

  return {
    spendingInsights,
    recommendations,
    spending_pattern_analysis: `Your largest spending category is ${formatCategoryLabel(topCategory)}, consuming ${input.monthlyExpenses > 0 ? Math.round(((input.categoryBreakdown[topCategory] || 0) / input.monthlyExpenses) * 100) : 0}% of total expenses.`,
    financial_health_score: healthScore,
    goal_feasibility: feasible ? "feasible" : "at_risk",
    recommended_budget_model: savingsRate >= 20 ? "50/30/20" : "70/20/10",
    habit_warnings: warnings,
    improvement_suggestions: [
      "Cap variable spending categories weekly.",
      "Automate savings transfer on income day.",
      "Track expenses daily to avoid backlog and blind spots."
    ],
    personalized_review_questions: [
      "Which non-essential expense can you reduce by 10% this week?",
      "Can you add one extra income source this month?",
      "Are current savings goals aligned with your cash flow?"
    ],
    motivational_message: feasible
      ? "You are on a realistic path. Keep consistency high."
      : "You can still recover this goal by tightening discretionary spending now."
  };
}

function buildReductionRecommendations(expenseBreakdown, rate) {
  return expenseBreakdown
    .filter((entry) => entry.monthly_average > 0)
    .sort((a, b) => {
      const aPriority = DISCRETIONARY_CATEGORIES.has(a.category) ? 0 : 1;
      const bPriority = DISCRETIONARY_CATEGORIES.has(b.category) ? 0 : 1;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return b.monthly_average - a.monthly_average;
    })
    .slice(0, 3)
    .map((entry) => ({
      label: formatCategoryLabel(entry.category),
      category: entry.category,
      current_spend: roundCurrency(entry.monthly_average),
      reduction_amount: roundCurrency(entry.monthly_average * rate),
      reduction_percent: Math.round(rate * 100),
      reason: `Trim ${Math.round(rate * 100)}% from ${formatCategoryLabel(entry.category)} without touching essential commitments first.`
    }))
    .filter((entry) => entry.reduction_amount > 0);
}

export async function analyzeFinancialData(userId, input, goalProgress = 0) {
  const { score } = await calculateFinancialHealthScore(userId, goalProgress);
  return buildLocalInsight(input, score);
}

function toCurrency(value) {
  return roundCurrency(Math.max(0, Number(value) || 0));
}

function labelFromMonths(months) {
  if (!Number.isFinite(months) || months <= 0) {
    return "No clear timeline";
  }
  return `${months} month${months === 1 ? "" : "s"}`;
}

export function analyzeGoalPayload(input) {
  const targetAmount = toCurrency(input.targetAmount);
  const currentSavings = toCurrency(input.currentSavings);
  const monthsRemaining = Math.max(1, Number(input.monthsRemaining) || 1);
  const monthlyIncome = toCurrency(input.monthlyIncome);
  const monthlyExpenses = toCurrency(input.monthlyExpenses);
  const recentSpending = Array.isArray(input.recentSpending) ? input.recentSpending : [];

  const remainingAmount = toCurrency(targetAmount - currentSavings);
  const requiredMonthlySavings = monthsRemaining > 0 ? toCurrency(remainingAmount / monthsRemaining) : remainingAmount;
  const savingsCapacity = toCurrency(monthlyIncome - monthlyExpenses);

  let feasibilityLevel = "Moderate";
  if (requiredMonthlySavings <= savingsCapacity * 0.65) {
    feasibilityLevel = "Easy";
  } else if (requiredMonthlySavings > savingsCapacity * 1.1 || savingsCapacity <= 0) {
    feasibilityLevel = "Difficult";
  }

  const avgRecentSpend = recentSpending.length > 0
    ? toCurrency(recentSpending.reduce((sum, value) => sum + (Number(value) || 0), 0) / recentSpending.length)
    : 0;

  const strategyBlueprints = [
    { strategyName: "Aggressive Plan", multiplier: 1.25, reductionRate: 0.2 },
    { strategyName: "Balanced Plan", multiplier: 1, reductionRate: 0.12 },
    { strategyName: "Slow Saver Plan", multiplier: 0.8, reductionRate: 0.08 },
    { strategyName: "Expense Reduction Plan", multiplier: 1.1, reductionRate: 0.18 }
  ];

  const strategies = strategyBlueprints.map((entry) => {
    const monthlySavingsRequired = toCurrency(requiredMonthlySavings * entry.multiplier);
    const projectedMonths = monthlySavingsRequired > 0
      ? Math.max(1, Math.ceil(remainingAmount / monthlySavingsRequired))
      : null;
    const reductionTarget = toCurrency(monthlyExpenses * entry.reductionRate);
    const foodHint = toCurrency(avgRecentSpend * 0.08);
    const transportHint = toCurrency(avgRecentSpend * 0.05);

    return {
      strategyName: entry.strategyName,
      monthlySavingsRequired,
      description:
        entry.strategyName === "Aggressive Plan"
          ? "Push savings hard with tighter spending and strict weekly caps."
          : entry.strategyName === "Balanced Plan"
            ? "Steady monthly savings while preserving a manageable lifestyle."
            : entry.strategyName === "Slow Saver Plan"
              ? "Lower monthly pressure with gradual savings progress."
              : "Target category-level reductions to unlock more cash for savings.",
      spendingAdjustments: [
        `Trim variable spending by about ${reductionTarget.toFixed(2)} monthly.`,
        `Reduce food-related spend by around ${foodHint.toFixed(2)} where possible.`,
        `Cut transport or ride-hailing by around ${transportHint.toFixed(2)}.`
      ],
      stepsToFollow: [
        `Move ${monthlySavingsRequired.toFixed(2)} to savings at the start of each month.`,
        "Set weekly limits for non-essential categories.",
        "Review transactions every weekend and correct overspending fast.",
        "Track progress against your goal at least twice per month."
      ],
      timelineProjection: projectedMonths
        ? `Estimated completion in ${labelFromMonths(projectedMonths)}`
        : "Not achievable with current monthly savings requirement"
    };
  });

  return {
    goalId: input.goalId,
    goalName: input.goalName,
    requiredMonthlySavings,
    savingsCapacity,
    feasibilityLevel,
    strategies
  };
}

export function buildGoalCoachingAnalysis(snapshot) {
  const effectiveMonthlyIncome = roundCurrency(snapshot.base_monthly_income + snapshot.average_extra_income);
  const currentMonthlySavingsCapacity = roundCurrency(Math.max(effectiveMonthlyIncome - snapshot.average_monthly_expenses, 0));
  const remainingAmount = roundCurrency(Math.max(snapshot.goal.target_amount - snapshot.goal.current_saved, 0));
  const monthsToDeadline = monthsUntil(snapshot.goal.deadline);
  const requiredMonthlySavings = roundCurrency(monthsToDeadline > 0 ? remainingAmount / monthsToDeadline : remainingAmount);
  const estimatedCompletionMonths = remainingAmount === 0
    ? 0
    : currentMonthlySavingsCapacity > 0
      ? Math.ceil(remainingAmount / currentMonthlySavingsCapacity)
      : null;
  const estimatedCompletionDate = remainingAmount === 0
    ? new Date().toISOString().slice(0, 10)
    : estimatedCompletionMonths
      ? addMonthsIso(estimatedCompletionMonths)
      : null;

  let status = "achievable";
  if (remainingAmount === 0) {
    status = "completed";
  } else if (currentMonthlySavingsCapacity <= 0) {
    status = "off_track";
  } else if (currentMonthlySavingsCapacity < requiredMonthlySavings) {
    status = "at_risk";
  }

  const topCategory = snapshot.expense_breakdown[0];
  const topDiscretionary = snapshot.expense_breakdown.find((entry) => DISCRETIONARY_CATEGORIES.has(entry.category)) || topCategory;
  const additionalNeeded = roundCurrency(Math.max(requiredMonthlySavings - currentMonthlySavingsCapacity, 0));
  const weeklyValues = snapshot.weekly_spending.map((entry) => entry.total);
  const recentWeek = weeklyValues.at(-1) || 0;
  const priorWeeks = weeklyValues.slice(0, -1);
  const priorAverage = priorWeeks.length > 0
    ? priorWeeks.reduce((sum, value) => sum + value, 0) / priorWeeks.length
    : recentWeek;
  const weeklyDelta = priorAverage > 0 ? ((recentWeek - priorAverage) / priorAverage) * 100 : 0;

  const insights = [];
  if (topCategory && effectiveMonthlyIncome > 0) {
    insights.push(
      `${formatCategoryLabel(topCategory.category)} is your highest spend category at ${Math.round((topCategory.monthly_average / effectiveMonthlyIncome) * 100)}% of available monthly income.`
    );
  }
  if (priorWeeks.length > 0) {
    const direction = weeklyDelta >= 0 ? "above" : "below";
    insights.push(`Your most recent weekly spending was ${Math.abs(Math.round(weeklyDelta))}% ${direction} your recent average.`);
  }
  if (snapshot.recurring_bills.length > 0) {
    insights.push(`Recurring bills are led by ${snapshot.recurring_bills[0]}. Protect room for these fixed commitments before cutting flexible categories.`);
  }
  if (additionalNeeded > 0 && topDiscretionary?.monthly_average > 0) {
    const targetPercent = Math.min(60, Math.max(10, Math.ceil((additionalNeeded / topDiscretionary.monthly_average) * 100)));
    insights.push(`Reducing ${formatCategoryLabel(topDiscretionary.category)} by about ${targetPercent}% would close most of the monthly savings gap.`);
  } else if (remainingAmount === 0) {
    insights.push("This goal is already fully funded. You can keep the selected plan to build buffer savings faster.");
  } else {
    insights.push("You already have enough savings capacity to stay on track if you keep current spending stable.");
  }

  const planBlueprints = [
    {
      plan_key: "A",
      plan_name: "Slow Saver Plan",
      summary: "Minimal lifestyle adjustments with smaller cuts and a longer runway.",
      reduction_rate: 0.08,
      minimum_target_multiplier: 0.9,
      enforce_deadline: false
    },
    {
      plan_key: "B",
      plan_name: "Balanced Plan",
      summary: "Moderate reductions tuned to hit the goal deadline when feasible.",
      reduction_rate: 0.18,
      minimum_target_multiplier: 1,
      enforce_deadline: true
    },
    {
      plan_key: "C",
      plan_name: "Aggressive Plan",
      summary: "Stronger cuts and tighter monthly spending to reach the goal as fast as possible.",
      reduction_rate: 0.3,
      minimum_target_multiplier: 1.2,
      enforce_deadline: true
    },
    {
      plan_key: "D",
      plan_name: "Expense Reduction Plan",
      summary: "Focus on reducing expenses across categories to maximize savings.",
      reduction_rate: 0.25,
      minimum_target_multiplier: 1.1,
      enforce_deadline: true
    }
  ];

  const plans = planBlueprints.map((blueprint) => {
    const recommendedExpenseReductions = buildReductionRecommendations(snapshot.expense_breakdown, blueprint.reduction_rate);
    const reductionTotal = roundCurrency(
      recommendedExpenseReductions.reduce((sum, entry) => sum + entry.reduction_amount, 0)
    );
    let monthlySavingsTarget = roundCurrency(currentMonthlySavingsCapacity + reductionTotal);
    const desiredTarget = roundCurrency(requiredMonthlySavings * blueprint.minimum_target_multiplier);

    if (blueprint.enforce_deadline) {
      monthlySavingsTarget = roundCurrency(Math.max(monthlySavingsTarget, desiredTarget));
    }

    monthlySavingsTarget = roundCurrency(Math.min(monthlySavingsTarget, effectiveMonthlyIncome));

    const unsupportedGap = roundCurrency(Math.max(monthlySavingsTarget - currentMonthlySavingsCapacity - reductionTotal, 0));
    if (unsupportedGap > 0) {
      recommendedExpenseReductions.push({
        label: "Extra income",
        category: "Extra income",
        current_spend: 0,
        reduction_amount: unsupportedGap,
        reduction_percent: 0,
        reason: "Add extra income or move cash from another account to fully fund this plan."
      });
    }

    const completionMonths = remainingAmount === 0
      ? 0
      : monthlySavingsTarget > 0
        ? Math.ceil(remainingAmount / monthlySavingsTarget)
        : null;
    const completionDate = remainingAmount === 0
      ? new Date().toISOString().slice(0, 10)
      : completionMonths
        ? addMonthsIso(completionMonths)
        : null;

    return {
      strategyName: blueprint.plan_name,
      monthlySavingsRequired: monthlySavingsTarget,
      description: blueprint.summary,
      spendingAdjustments: recommendedExpenseReductions.map(r => `${r.label}: Reduce by ${r.reduction_amount} (${r.reduction_percent}%)`),
      stepsToFollow: [
        `Save ${monthlySavingsTarget} monthly towards your goal`,
        `Reduce spending in key categories as outlined`,
        `Track progress weekly and adjust as needed`,
        `Automate transfers to savings account`
      ],
      timelineProjection: completionMonths ? `${completionMonths} months (${completionDate})` : 'Not achievable with current plan'
    };
  });

  const feasibilitySummary = (() => {
    if (status === "completed") {
      return `${snapshot.goal.title} is already funded. Choose a plan only if you want to build extra buffer savings.`;
    }
    if (status === "achievable") {
      return `You can reach ${snapshot.goal.title} by the deadline if you save about ${requiredMonthlySavings.toFixed(2)} each month.`;
    }
    if (status === "at_risk") {
      return `Your current savings pace falls short by ${additionalNeeded.toFixed(2)} per month, so some budget adjustments are needed.`;
    }
    return `At the current pace, this goal is not reachable before the deadline without a major spending cut or additional income.`;
  })();

  return {
    goal: {
      id: snapshot.goal.id,
      title: snapshot.goal.title,
      target_amount: roundCurrency(snapshot.goal.target_amount),
      current_saved: roundCurrency(snapshot.goal.current_saved),
      remaining_amount: remainingAmount,
      deadline: snapshot.goal.deadline
    },
    feasibility: {
      status,
      summary: feasibilitySummary,
      current_monthly_savings_capacity: currentMonthlySavingsCapacity,
      required_monthly_savings: requiredMonthlySavings,
      estimated_completion_date: estimatedCompletionDate,
      estimated_completion_months: estimatedCompletionMonths,
      months_to_deadline: monthsToDeadline,
      is_achievable: status === "achievable" || status === "completed",
      adjustments_required: status === "at_risk" || status === "off_track"
    },
    strategies: plans,
    insights,
    recurring_bills: snapshot.recurring_bills,
    selected_plan_key: snapshot.selected_plan_key
  };
}
