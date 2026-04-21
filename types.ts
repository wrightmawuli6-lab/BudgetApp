export enum Category {
  Food = 'Food',
  Transport = 'Transport',
  Rent = 'Rent',
  Entertainment = 'Entertainment',
  Utilities = 'Utilities',
  Other = 'Other'
}

export enum GoalType {
  ShortTerm = 'Short-term', // e.g., Monthly/Semester
  LongTerm = 'Long-term'    // e.g., Yearly/Multi-month
}

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
}

export interface SavingGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  manualContributions?: number;
  type: GoalType;
  durationMonths: number;
  deadline?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'reminder' | 'alert' | 'success';
  timestamp: string;
  read: boolean;
}

export interface UserProfile {
  name: string;
  monthlyAllowance: number;
  currency: string;
}

export interface IncomeEntry {
  id: string;
  amount: number;
  source: string;
  date: string;
}

export interface BudgetState {
  profile: UserProfile;
  expenses: Expense[];
  goals: SavingGoal[];
  streak: number;
  notifications: Notification[];
  /** Extra income entries (e.g. side gig, gift) — increases available spending */
  incomeEntries: IncomeEntry[];
}

export interface AIAdvice {
  status: 'excellent' | 'good' | 'warning' | 'critical';
  headline: string;
  summary: string;
  tips: string[];
  suggestedReductions: { category: Category; amount: number; reason: string }[];
  isDebtWarning: boolean;
  achievabilityScore: number; // 0-100
}

export type CoachingPlanKey = 'A' | 'B' | 'C';

export interface GoalCoachReduction {
  label: string;
  category: string;
  current_spend: number;
  reduction_amount: number;
  reduction_percent: number;
  reason: string;
}

export interface GoalCoachPlan {
  plan_key: CoachingPlanKey;
  plan_name: string;
  summary: string;
  monthly_savings_target: number;
  recommended_monthly_budget: number;
  estimated_completion_date: string | null;
  estimated_completion_months: number | null;
  meets_deadline: boolean;
  recommended_expense_reductions: GoalCoachReduction[];
}

export interface GoalCoachAnalysis {
  goal: {
    id: string;
    title: string;
    target_amount: number;
    current_saved: number;
    remaining_amount: number;
    deadline: string;
  };
  feasibility: {
    status: 'achievable' | 'at_risk' | 'off_track' | 'completed';
    summary: string;
    current_monthly_savings_capacity: number;
    required_monthly_savings: number;
    estimated_completion_date: string | null;
    estimated_completion_months: number | null;
    months_to_deadline: number;
    is_achievable: boolean;
    adjustments_required: boolean;
  };
  plans: GoalCoachPlan[];
  insights: string[];
  recurring_bills: string[];
  selected_plan_key: CoachingPlanKey | null;
}

export interface GoalCoachPlanSelection {
  selected_plan_key: CoachingPlanKey;
  notification_message: string;
  updated_profile: {
    monthly_income: number;
  };
}

export interface BudgetStrategy {
  id: string;
  goalId: string;
  goalName: string;
  strategyName: string;
  monthlySavingsRequired: number;
  description: string;
  spendingAdjustments: string[];
  stepsToFollow: string[];
  timelineProjection: string;
  createdAt: string;
}

export interface GoalStrategy {
  strategyName: string;
  monthlySavingsRequired: number;
  description: string;
  spendingAdjustments: string[];
  stepsToFollow: string[];
  timelineProjection: string;
}

export interface GoalAnalysisResponse {
  goalId: string;
  goalName: string;
  requiredMonthlySavings: number;
  savingsCapacity: number;
  feasibilityLevel: "Easy" | "Moderate" | "Difficult";
  strategies: GoalStrategy[];
}
