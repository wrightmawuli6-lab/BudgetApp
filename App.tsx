
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Target,
  BrainCircuit,
  Trophy,
  ArrowUpCircle,
  ArrowDownCircle,
  Coins,
  X,
  Bell,
  AlertTriangle,
  Clock,
  Calendar,
  Wallet,
  Sparkles,
  Pencil,
  Banknote,
  LogOut,
  Moon,
  Sun,
  CheckCircle2,
  ClipboardCheck,
  ChevronDown,
  Bus,
  Utensils,
  Home,
  Film,
  Zap,
  MoreHorizontal,
  AlarmClock,
  Settings2
} from 'lucide-react';
import { completeNewUserKyc, consumeLoginNotice, getSession, logout as authLogout, needsNewUserKyc } from './auth';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { USAGE_STREAK_EVENT, apiClient } from './services/apiClient';
import { analyzeGoal, compareBudgets, getCoachInsight, getStrategyHistory, saveSelectedStrategy } from './services/dashboardApi';
import { Category, GoalType } from './types';
import type { BudgetState, Expense, SavingGoal, AIAdvice, Notification as BudgetNotification, IncomeEntry, GoalStrategy, GoalAnalysisResponse, BudgetStrategy } from './types';
import BudgetHistory from './pages/BudgetHistory';

const COLORS = ['#8b3dff', '#a3ff2f', '#ef35ff', '#ffeb3b', '#22d3ee', '#ff4b6e', '#64748b'];

/** Generate a unique id; works in older browsers and non-HTTPS contexts where crypto.randomUUID may be missing */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface BackendProfile {
  name: string;
  monthly_income: number;
  daily_usage_streak?: number;
  saving_goal_intensity?: string;
}

interface BackendStreakActivity {
  date: string;
  activity_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

interface BackendStreakHistory {
  current_streak: number;
  longest_streak: number;
  active_days: number;
  window_days: number;
  last_active_date: string | null;
  activity: BackendStreakActivity[];
}

interface BackendIncome {
  id: string | number;
  source: string;
  amount: number;
  income_date: string;
}

interface BackendExpense {
  id: string | number;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
}

interface BackendSavingsGoal {
  id: string | number;
  title: string;
  type: "Short-term" | "Long-term";
  duration_months: number;
  target_amount: number;
  deadline: string;
  current_saved: number;
  manual_contributions: number;
}

interface BackendAiInsight {
  spendingInsights?: string[];
  recommendations?: string[];
  spending_pattern_analysis: string;
  financial_health_score: number;
  goal_feasibility: string;
  recommended_budget_model: string;
  habit_warnings: string[];
  improvement_suggestions: string[];
  motivational_message: string;
}

const DEFAULT_CURRENCY = 'GHS ';
const THEME_KEY = 'budgeting_theme';
const REMINDER_TIME_KEY = 'budgeting_daily_reminder_time';
const REMINDER_SENT_KEY = 'budgeting_daily_reminder_sent';
const KYC_PREFS_KEY = 'budgeting_kyc_preferences';
const LOCAL_USAGE_STREAK_KEY = 'budgeting_local_usage_dates';

interface BudgetComparison {
  month1: string;
  month2: string;
  income_difference: number;
  expense_difference: number;
  savings_difference: number;
  category_changes: Array<{
    category: string;
    month1: number;
    month2: number;
    difference: number;
  }>;
  improvement_or_decline: 'improved' | 'declined';
}

function currentMonthKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function previousMonthKey(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return toIsoDate(date).slice(0, 7);
}

function monthLabel(monthKey: string): string {
  return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric'
  });
}

function toIsoDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function toDateKey(value: string | Date): string {
  if (typeof value === 'string') {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) {
      return match[0];
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return toIsoDate(date);
}

function timeLabel(value: string): string {
  const [hourValue, minuteValue] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hourValue || 0, minuteValue || 0, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function dateLabel(value: string | Date): string {
  const key = toDateKey(value);
  if (!key) {
    return '';
  }
  return new Date(`${key}T00:00:00`).toLocaleDateString();
}

function addMonthsToTodayIso(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return toIsoDate(date);
}

function monthsUntil(deadline: string): number {
  const now = new Date();
  const end = new Date(deadline);
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return Math.max(1, months);
}

function normalizeCategory(value: string): Category {
  return Object.values(Category).includes(value as Category) ? (value as Category) : Category.Other;
}

function parseUsageStreak(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function getLocalUsageKey(identity: string): string {
  return `${LOCAL_USAGE_STREAK_KEY}_${identity || 'guest'}`;
}

function readLocalUsageDates(identity: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(getLocalUsageKey(identity)) || '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0);
  } catch {
    return [];
  }
}

function calculateStreakFromDates(dates: string[]): number {
  const dateSet = new Set(dates);
  let count = 0;
  const cursor = new Date();

  while (dateSet.has(toDateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}

function buildLocalStreakHistory(identity: string, windowDays = 30): BackendStreakHistory {
  const dates = readLocalUsageDates(identity);
  const dateSet = new Set(dates);
  const activity: BackendStreakActivity[] = [];

  for (let index = 0; index < windowDays; index += 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const key = toDateKey(date);
    if (dateSet.has(key)) {
      activity.push({
        date: key,
        activity_count: 1,
        first_seen_at: `${key}T00:00:00.000Z`,
        last_seen_at: `${key}T00:00:00.000Z`
      });
    }
  }

  return {
    current_streak: calculateStreakFromDates(dates),
    longest_streak: calculateStreakFromDates(dates),
    active_days: activity.length,
    window_days: windowDays,
    last_active_date: activity[0]?.date ?? null,
    activity
  };
}

function recordLocalUsage(identity: string): BackendStreakHistory {
  const today = toDateKey(new Date());
  const dates = new Set(readLocalUsageDates(identity));
  dates.add(today);
  const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a)).slice(0, 365);
  localStorage.setItem(getLocalUsageKey(identity), JSON.stringify(sortedDates));
  return buildLocalStreakHistory(identity);
}

function toUiGoal(goal: BackendSavingsGoal): SavingGoal {
  const durationMonths = Number(goal.duration_months) || monthsUntil(goal.deadline);
  return {
    id: String(goal.id),
    title: goal.title || 'Savings Goal',
    targetAmount: Number(goal.target_amount),
    currentAmount: Number(goal.current_saved),
    manualContributions: Number(goal.manual_contributions || 0),
    type: goal.type === "Long-term" ? GoalType.LongTerm : GoalType.ShortTerm,
    durationMonths,
    deadline: goal.deadline
  };
}

function toUiAdvice(input: BackendAiInsight): AIAdvice {
  const score = Number(input.financial_health_score) || 0;
  const mergedTips = [
    ...(input.spendingInsights ?? []),
    ...(input.recommendations ?? []),
    ...(input.improvement_suggestions ?? [])
  ];
  const status: AIAdvice['status'] =
    score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'warning' : 'critical';
  return {
    status,
    headline: `${input.recommended_budget_model} Plan`,
    summary: `${input.spending_pattern_analysis} ${input.motivational_message}`.trim(),
    tips: mergedTips.length > 0 ? mergedTips : input.improvement_suggestions ?? [],
    suggestedReductions: [],
    isDebtWarning: input.goal_feasibility !== 'feasible',
    achievabilityScore: score
  };
}

function initialBudgetState(sessionName: string): BudgetState {
  return {
    profile: {
      name: sessionName,
      monthlyAllowance: 0,
      currency: DEFAULT_CURRENCY
    },
    expenses: [],
    goals: [],
    streak: 0,
    notifications: [],
    incomeEntries: []
  };
}

// --- Enhanced Helper Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`app-card rounded-[2rem] border border-white/8 bg-[#171719] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] ${className}`}>
    {children}
  </div>
);

const CategoryBadge: React.FC<{ category: Category }> = ({ category }) => {
  const config: Record<Category, { className: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }> = {
    [Category.Food]: { className: 'bg-[#a3ff2f]/15 text-[#a3ff2f]', Icon: Utensils },
    [Category.Transport]: { className: 'bg-cyan-400/15 text-cyan-300', Icon: Bus },
    [Category.Rent]: { className: 'bg-violet-500/15 text-violet-300', Icon: Home },
    [Category.Entertainment]: { className: 'bg-fuchsia-500/15 text-fuchsia-300', Icon: Film },
    [Category.Utilities]: { className: 'bg-rose-500/15 text-rose-300', Icon: Zap },
    [Category.Other]: { className: 'bg-yellow-300/15 text-yellow-200', Icon: MoreHorizontal },
  };
  const { className, Icon } = config[category] ?? config[Category.Other];
  return (
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${className}`} title={category} aria-label={category}>
      <Icon size={21} strokeWidth={2.5} />
    </span>
  );
};

interface GlassSelectOption {
  value: string;
  label: string;
}

const GlassSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: GlassSelectOption[];
  name?: string;
  className?: string;
}> = ({ value, onChange, options, name, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="glass-select flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 px-6 py-5 text-left font-black text-white outline-none transition-all focus:border-violet-400"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDown size={20} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div
          role="listbox"
          className="glass-menu absolute left-0 right-0 top-full z-[80] mt-2 max-h-64 overflow-y-auto rounded-2xl border border-white/15 bg-[#101012]/75 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-black transition-all ${
                  isSelected ? 'bg-violet-500/30 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

let activeModalLocks = 0;
let lockedScrollY = 0;
let originalBodyOverflow = '';
let originalBodyPosition = '';
let originalBodyTop = '';
let originalBodyWidth = '';

function lockBodyScroll() {
  if (activeModalLocks === 0) {
    lockedScrollY = window.scrollY;
    originalBodyOverflow = document.body.style.overflow;
    originalBodyPosition = document.body.style.position;
    originalBodyTop = document.body.style.top;
    originalBodyWidth = document.body.style.width;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.width = '100%';
  }
  activeModalLocks += 1;
}

function unlockBodyScroll() {
  activeModalLocks = Math.max(0, activeModalLocks - 1);
  if (activeModalLocks > 0) {
    return;
  }

  document.body.style.overflow = originalBodyOverflow;
  document.body.style.position = originalBodyPosition;
  document.body.style.top = originalBodyTop;
  document.body.style.width = originalBodyWidth;
  window.scrollTo(0, lockedScrollY);
}

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden overscroll-none bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{ touchAction: 'auto' }}
    >
      <div
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden overscroll-contain rounded-t-[2rem] border border-white/10 bg-[#101012] shadow-2xl shadow-violet-950/40 animate-in slide-in-from-bottom duration-300 sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2.5rem]"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: 'auto' }}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-8 sm:py-6">
          <h2 className="text-2xl font-extrabold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors touch-manipulation"
            style={{ touchAction: 'manipulation' }}
          >
            <X size={24} className="text-white/50" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-5 py-5 sm:px-8 sm:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
export default function App() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = getSession();
  const displayName = session?.name || session?.email || 'Friend';
  const usageIdentity = session?.email || displayName;
  const month = useMemo(() => currentMonthKey(), []);
  const todayRef = React.useRef(toDateKey(new Date()));
  const [data, setData] = useState<BudgetState>(() => initialBudgetState(displayName));
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const currentTab = searchParams.get('tab');
  const activeTab = currentTab || 'dash';
  const setActiveTab = (tab: string) => {
    setSearchParams(tab === 'dash' ? {} : { tab });
  };
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [isExpenseLogOpen, setIsExpenseLogOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [customGoalAmounts, setCustomGoalAmounts] = useState<Record<string, string>>({});
  const [expenseCategory, setExpenseCategory] = useState<Category>(Category.Food);
  const [aiAdvice, setAiAdvice] = useState<AIAdvice | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [goalAnalysis, setGoalAnalysis] = useState<GoalAnalysisResponse | null>(null);
  const [selectedGoalForAnalysis, setSelectedGoalForAnalysis] = useState<SavingGoal | null>(null);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [isSelectingStrategyName, setIsSelectingStrategyName] = useState<string | null>(null);
  const [strategyHistory, setStrategyHistory] = useState<BudgetStrategy[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSetBudgetOpen, setIsSetBudgetOpen] = useState(false);
  const [isSetAvailableSpendingOpen, setIsSetAvailableSpendingOpen] = useState(false);
  const [isStreakOpen, setIsStreakOpen] = useState(false);
  const [streakHistory, setStreakHistory] = useState<BackendStreakHistory | null>(null);
  const [isStreakHistoryLoading, setIsStreakHistoryLoading] = useState(false);
  const [streakHistoryError, setStreakHistoryError] = useState<string | null>(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [selectedStreakDate, setSelectedStreakDate] = useState<string | null>(null);
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState(() => currentMonthKey());
  const [pendingGoalEntryIds, setPendingGoalEntryIds] = useState<Record<string, boolean>>({});
  const [analyzingGoalId, setAnalyzingGoalId] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem(REMINDER_TIME_KEY) || '20:00');
  const [kycStep, setKycStep] = useState(1);
  const [kycMonthlyIncome, setKycMonthlyIncome] = useState('');
  const [kycStudentType, setKycStudentType] = useState('full-time');
  const [kycReason, setKycReason] = useState('track-spending');
  const [kycIntensity, setKycIntensity] = useState('');
  const [todayKey, setTodayKey] = useState(() => todayRef.current);
  const [selectedExpenseDate, setSelectedExpenseDate] = useState<string>(() => todayRef.current);
  const [isKycOpen, setIsKycOpen] = useState(() => needsNewUserKyc());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (
    localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  ));
  const [budgetComparison, setBudgetComparison] = useState<BudgetComparison | null>(null);
  const showSetBudgetModal = !isKycOpen && (data.profile.monthlyAllowance === 0 || isSetBudgetOpen);

  // Financial Stats
  const totalSpent = useMemo(() => data.expenses.reduce((sum, e) => sum + e.amount, 0), [data.expenses]);
  const incomeEntries = data.incomeEntries ?? [];
  const extraIncome = useMemo(() => incomeEntries.reduce((sum, e) => sum + e.amount, 0), [incomeEntries]);
  const availableBudget = data.profile.monthlyAllowance + extraIncome;
  const isInDebt = totalSpent > availableBudget;
  const remaining = availableBudget - totalSpent;
  const progressPercent = availableBudget > 0 ? Math.min((totalSpent / availableBudget) * 100, 100) : 0;
  const activeStrategy = strategyHistory[0] ?? null;

  const totalGoalTarget = useMemo(() => data.goals.reduce((sum, g) => sum + (g.targetAmount / g.durationMonths), 0), [data.goals]);
  const currentExpenseMonth = todayKey.slice(0, 7);

  const expenseMonthOptions = useMemo(() => {
    const months = new Set<string>();
    months.add(currentExpenseMonth);
    for (let index = 0; index < 6; index += 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - index);
      months.add(toIsoDate(date).slice(0, 7));
    }
    data.expenses.forEach((expense) => {
      const key = toDateKey(expense.date).slice(0, 7);
      if (key) months.add(key);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [currentExpenseMonth, data.expenses]);
  const rangedExpenses = useMemo(
    () => data.expenses.filter((expense) => toDateKey(expense.date).startsWith(selectedExpenseMonth)),
    [data.expenses, selectedExpenseMonth]
  );
  const rangedSpent = useMemo(() => rangedExpenses.reduce((sum, e) => sum + e.amount, 0), [rangedExpenses]);
  const dailySpendingForRange = useMemo(() => {
    const summary = rangedExpenses.reduce((acc, expense) => {
      const key = toDateKey(expense.date);
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(summary)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));
  }, [rangedExpenses]);
  const expenseDayOptions = useMemo(() => {
    const [year, monthIndex] = selectedExpenseMonth.split('-').map(Number);
    const daysInMonth = new Date(year, monthIndex, 0).getDate();
    const dailyTotals = dailySpendingForRange.reduce((acc, entry) => {
      acc[entry.date] = entry.amount;
      return acc;
    }, {} as Record<string, number>);

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${selectedExpenseMonth}-${String(day).padStart(2, '0')}`;
      const amount = dailyTotals[date] || 0;
      return {
        value: date,
        label: `${new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })} - ${amount > 0 ? `${data.profile.currency}${amount.toLocaleString()}` : 'No entries'}`
      };
    });
  }, [dailySpendingForRange, selectedExpenseMonth, data.profile.currency]);
  const selectedDailyExpenses = useMemo(
    () => data.expenses.filter((expense) => toDateKey(expense.date) === selectedExpenseDate),
    [data.expenses, selectedExpenseDate]
  );
  const selectedDailyExpenseTotal = useMemo(
    () => selectedDailyExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [selectedDailyExpenses]
  );
  const selectedDailyCategoryBreakdown = useMemo(() => {
    const summary = selectedDailyExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(summary).map(([category, amount]) => ({ category, amount }));
  }, [selectedDailyExpenses]);
  const chartData = useMemo(() => {
    const summary = rangedExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(summary).map(([name, value]) => ({ name, value }));
  }, [rangedExpenses]);
  const activityDateSet = useMemo(() => {
    const dates = new Set<string>();
    data.expenses.forEach((expense) => dates.add(toDateKey(expense.date)));
    incomeEntries.forEach((entry) => dates.add(toDateKey(entry.date)));
    return dates;
  }, [data.expenses, incomeEntries]);
  const usageActivityDateSet = useMemo(() => {
    const dates = new Set<string>();
    streakHistory?.activity.forEach((entry) => dates.add(toDateKey(entry.date)));
    return dates;
  }, [streakHistory]);
  const currentStreak = data.streak;
  const streakDays = useMemo(() => {
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const key = toDateKey(date);
      return {
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        day: date.getDate(),
        active: usageActivityDateSet.size > 0 ? usageActivityDateSet.has(key) : activityDateSet.has(key)
      };
    });
  }, [activityDateSet, usageActivityDateSet]);
  const selectedStreakActivity = useMemo(() => {
    const key = selectedStreakDate || toDateKey(new Date());
    return {
      date: key,
      expenses: data.expenses.filter((expense) => toDateKey(expense.date) === key),
      incomes: incomeEntries.filter((entry) => toDateKey(entry.date) === key)
    };
  }, [data.expenses, incomeEntries, selectedStreakDate]);
  const selectedUsageActivity = useMemo(() => {
    const key = selectedStreakDate || toDateKey(new Date());
    return streakHistory?.activity.find((entry) => toDateKey(entry.date) === key) ?? null;
  }, [selectedStreakDate, streakHistory]);
  const reminderTimeOptions = useMemo(() => (
    Array.from({ length: 96 }, (_, index) => {
      const totalMinutes = index * 15;
      const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
      const minutes = (totalMinutes % 60).toString().padStart(2, '0');
      const value = `${hours}:${minutes}`;
      return { value, label: timeLabel(value) };
    })
  ), []);

  const addNotification = (title: string, message: string, type: BudgetNotification['type']) => {
    const newNotif: BudgetNotification = {
      id: generateId(),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    setData(prev => ({ ...prev, notifications: [newNotif, ...prev.notifications] }));
  };

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  };

  useEffect(() => {
    const handleUsageStreak = (event: Event) => {
      const nextStreak = parseUsageStreak((event as CustomEvent<number>).detail);
      if (nextStreak === null) {
        return;
      }

      setData((prev) => (prev.streak === nextStreak ? prev : { ...prev, streak: nextStreak }));
    };

    window.addEventListener(USAGE_STREAK_EVENT, handleUsageStreak as EventListener);
    return () => {
      window.removeEventListener(USAGE_STREAK_EVENT, handleUsageStreak as EventListener);
    };
  }, []);

  useEffect(() => {
    const localHistory = recordLocalUsage(usageIdentity);
    setStreakHistory((current) => current ?? localHistory);
    setData((prev) => (
      prev.streak >= localHistory.current_streak
        ? prev
        : { ...prev, streak: localHistory.current_streak }
    ));
  }, [usageIdentity]);

  const refreshStrategyHistory = React.useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const strategies = await getStrategyHistory();
      setStrategyHistory(strategies);
    } catch {
      // Keep UI resilient if history loading fails.
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const loadStreakHistory = React.useCallback(async () => {
    setIsStreakHistoryLoading(true);
    setStreakHistoryError(null);
    try {
      const response = await apiClient.get<BackendStreakHistory>('/profile/streaks', {
        params: { windowDays: 30 }
      });
      setStreakHistory(response.data);
      const nextStreak = parseUsageStreak(response.data.current_streak);
      if (nextStreak !== null) {
        setData((prev) => (prev.streak === nextStreak ? prev : { ...prev, streak: nextStreak }));
      }
    } catch {
      const localHistory = buildLocalStreakHistory(usageIdentity);
      setStreakHistory(localHistory);
      setData((prev) => (
        prev.streak >= localHistory.current_streak
          ? prev
          : { ...prev, streak: localHistory.current_streak }
      ));
      setStreakHistoryError(null);
    } finally {
      setIsStreakHistoryLoading(false);
    }
  }, [usageIdentity]);

  const openStreakHistory = () => {
    setSelectedStreakDate(toDateKey(new Date()));
    setIsStreakOpen(true);
    void loadStreakHistory();
  };

  const renderExpenseTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) {
      return null;
    }

    const item = payload[0]?.payload;
    const amount = Number(item?.value || 0);
    const percent = rangedSpent > 0 ? (amount / rangedSpent) * 100 : 0;

    return (
      <div className="min-w-[180px] rounded-2xl border border-white/15 bg-[#101012] px-4 py-3 text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-5">
          <span className="truncate text-sm font-black">{item?.name || 'Expense'}</span>
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-black">
            {percent.toFixed(1)}%
          </span>
        </div>
        <p className="mt-2 text-lg font-black text-[#a3ff2f]">
          {data.profile.currency}{amount.toLocaleString()}
        </p>
      </div>
    );
  };

  const refreshFromApi = React.useCallback(async () => {
    const [profileRes, incomeRes, expenseRes, goalRes] = await Promise.all([
      apiClient.get<BackendProfile>('/profile'),
      apiClient.get<BackendIncome[]>('/income', { params: { month } }),
      apiClient.get<BackendExpense[]>('/expenses', { params: { month } }),
      apiClient.get<BackendSavingsGoal[]>('/savings-goal')
    ]);

    const profile = profileRes.data;
    const incomes = incomeRes.data.map((entry) => ({
      id: String(entry.id),
      source: entry.source,
      amount: Number(entry.amount),
      date: entry.income_date
    }));
    const expenses = expenseRes.data.map((entry) => ({
      id: String(entry.id),
      category: normalizeCategory(entry.category),
      description: entry.description || entry.category,
      amount: Number(entry.amount),
      date: entry.expense_date
    }));
    const goals = Array.isArray(goalRes.data) ? goalRes.data.map(toUiGoal) : [];

    setData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        name: profile.name ?? displayName,
        monthlyAllowance: Number(profile.monthly_income) || 0
      },
      streak: parseUsageStreak(profile.daily_usage_streak) ?? prev.streak,
      incomeEntries: incomes,
      expenses,
      goals: goals
    }));
  }, [month, displayName]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshFromApi();
        await refreshStrategyHistory();
        if (mounted && consumeLoginNotice()) {
          addNotification('Login successful', 'Your login details were successfully entered and your session is active.', 'success');
        }
      } catch {
        if (mounted) {
          addNotification('Sync failed', 'Could not load data from the server. Check backend connection.', 'alert');
        }
      } finally {
        if (mounted) {
          setIsBootstrapping(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshFromApi, refreshStrategyHistory]);

  useEffect(() => {
    const checkReminder = () => {
      const today = toDateKey(new Date());
      const sentKey = `${REMINDER_SENT_KEY}_${today}`;
      const hasLoggedToday = activityDateSet.has(today);
      const currentTime = new Date().toTimeString().slice(0, 5);
      if (!hasLoggedToday && currentTime >= reminderTime && localStorage.getItem(sentKey) !== 'true') {
        localStorage.setItem(sentKey, 'true');
        addNotification('Daily log reminder', 'Remember to enter your income or expense logs for today.', 'reminder');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Daily log reminder', {
            body: 'Remember to enter your income or expense logs for today.'
          });
        }
      }
    };
    checkReminder();
    const timer = window.setInterval(checkReminder, 60000);
    return () => window.clearInterval(timer);
  }, [activityDateSet, reminderTime]);

  useEffect(() => {
    const syncToday = () => {
      const nextToday = toDateKey(new Date());
      const previousToday = todayRef.current;
      if (nextToday === previousToday) {
        return;
      }

      todayRef.current = nextToday;
      setTodayKey(nextToday);
      setSelectedExpenseDate((current) => (current === previousToday ? nextToday : current));
      setSelectedExpenseMonth((current) => (
        current === previousToday.slice(0, 7) ? nextToday.slice(0, 7) : current
      ));
    };

    syncToday();
    const timer = window.setInterval(syncToday, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedExpenseDate.startsWith(selectedExpenseMonth)) {
      setSelectedExpenseDate(
        selectedExpenseMonth === currentExpenseMonth ? todayKey : `${selectedExpenseMonth}-01`
      );
    }
  }, [currentExpenseMonth, selectedExpenseDate, selectedExpenseMonth, todayKey]);

  const handleKycSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const monthlyIncome = Number(kycMonthlyIncome);
    if (Number.isNaN(monthlyIncome) || monthlyIncome < 0) {
      addNotification('KYC needs income', 'Enter a valid student income or monthly budget amount.', 'alert');
      setKycStep(1);
      return;
    }
    if (!kycIntensity) {
      addNotification('KYC needs intensity', 'Choose a saving goal intensity before continuing.', 'alert');
      setKycStep(3);
      return;
    }
    try {
      const response = await apiClient.put<BackendProfile>('/profile', {
        monthlyIncome,
        studentType: kycStudentType,
        savingGoalIntensity: kycIntensity
      });
      localStorage.setItem(KYC_PREFS_KEY, JSON.stringify({
        reason: kycReason,
        intensity: kycIntensity,
        completedAt: new Date().toISOString()
      }));
      setData(prev => ({
        ...prev,
        profile: { ...prev.profile, monthlyAllowance: Number(response.data.monthly_income) || 0 },
      }));
      completeNewUserKyc();
      setIsKycOpen(false);
      addNotification('KYC completed', 'Your student profile has been verified for budgeting recommendations.', 'success');
    } catch {
      addNotification('KYC failed', 'Could not save your KYC details. Please try again.', 'alert');
    }
  };

  const handleReminderSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    localStorage.setItem(REMINDER_TIME_KEY, reminderTime);
    setIsReminderOpen(false);
    addNotification('Reminder set', `Daily log reminder set for ${reminderTime}.`, 'success');
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // Browser notifications are optional; in-app notifications still work.
      }
    }
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const category = formData.get('category') as Category;
    const description = (formData.get('description') as string) || category;
    try {
      const response = await apiClient.post<BackendExpense>('/expenses', {
        amount,
        category,
        description,
        expenseDate: toIsoDate(new Date())
      });
      const newExpense: Expense = {
        id: String(response.data.id),
        amount: Number(response.data.amount),
        category: normalizeCategory(response.data.category),
        description: response.data.description || response.data.category,
        date: response.data.expense_date
      };
      setData(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses] }));
      setIsAddExpenseOpen(false);
      if (totalSpent + amount > data.profile.monthlyAllowance) {
        addNotification('Limit Reached!', 'You just exceeded your monthly allowance. Take a breath and check the coach.', 'alert');
      } else {
        addNotification('Logged!', 'Expense successfully added to your budgeting records.', 'success');
      }
    } catch {
      addNotification('Save failed', 'Could not add expense. Please try again.', 'alert');
    }
  };

  const handleGoalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = String(formData.get('title') || '').trim();
    const type = formData.get('type') as GoalType;
    const targetAmount = Number(formData.get('targetAmount'));
    const durationMonths = Number(formData.get('durationMonths'));
    if (!title || Number.isNaN(targetAmount) || Number.isNaN(durationMonths) || targetAmount <= 0 || durationMonths < 1) {
      addNotification('Invalid goal', 'Please enter a valid target and duration.', 'alert');
      return;
    }
    try {
      const payload = {
        title,
        type,
        targetAmount,
        durationMonths,
        deadline: addMonthsToTodayIso(durationMonths)
      };
      if (editingGoalId) {
        await apiClient.put(`/savings-goal/${editingGoalId}`, payload);
      } else {
        await apiClient.post('/savings-goal', payload);
      }
      await refreshFromApi();
      setIsAddGoalOpen(false);
      setEditingGoalId(null);
      addNotification(editingGoalId ? 'Goal Updated' : 'Goal Unlocked', 'Savings goal saved successfully.', 'success');
    } catch {
      addNotification('Save failed', 'Could not save your goal. Please try again.', 'alert');
    }
  };

  const addManualGoalEntry = async (goalId: string, amount: number) => {
    if (Number.isNaN(amount) || amount <= 0) {
      addNotification('Invalid amount', 'Enter a manual amount greater than 0.', 'alert');
      return;
    }
    const previousGoals = data.goals;
    setPendingGoalEntryIds((prev) => ({ ...prev, [goalId]: true }));
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((goal) => goal.id === goalId
        ? {
            ...goal,
            currentAmount: goal.currentAmount + amount,
            manualContributions: (goal.manualContributions ?? 0) + amount
          }
        : goal)
    }));
    setCustomGoalAmounts((prev) => ({ ...prev, [goalId]: '' }));
    try {
      await apiClient.post(`/savings-goal/${goalId}/manual-entry`, {
        amount,
        note: `Manual contribution for goal ${goalId}`,
        entryDate: toIsoDate(new Date())
      });
      refreshFromApi();
      addNotification('Goal updated', `Manual entry of ${data.profile.currency}${amount.toLocaleString()} added.`, 'success');
    } catch (error: any) {
      setData((prev) => ({ ...prev, goals: previousGoals }));
      const message = error?.response?.data?.error?.message || 'Could not add manual goal entry.';
      addNotification('Save failed', message, 'alert');
    } finally {
      setPendingGoalEntryIds((prev) => ({ ...prev, [goalId]: false }));
    }
  };

  const askCoach = async () => {
    if (data.expenses.length === 0) {
      addNotification('Log expenses first', 'Add at least one expense before using the AI Assistant.', 'reminder');
      setSearchParams({ tab: 'dash' });
      setIsAddExpenseOpen(true);
      return;
    }
    setIsThinking(true);
    try {
      const categoryBreakdown = data.expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);
      const insight = await getCoachInsight({
        monthlyIncome: data.profile.monthlyAllowance,
        monthlyExpenses: totalSpent,
        categoryBreakdown,
        recentTransactions: data.expenses.slice(0, 10).map((expense) => ({
          id: expense.id,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          date: expense.date
        })),
        activeStrategy: activeStrategy
          ? {
              strategyName: activeStrategy.strategyName,
              monthlySavingsRequired: activeStrategy.monthlySavingsRequired,
              description: activeStrategy.description
            }
          : null
      });
      setAiAdvice(toUiAdvice(insight as BackendAiInsight));
      try {
        const comparison = await compareBudgets(previousMonthKey(), currentMonthKey());
        setBudgetComparison(comparison as BudgetComparison);
      } catch {
        setBudgetComparison(null);
      }
    } catch {
      addNotification('AI unavailable', 'Could not generate AI insight right now.', 'alert');
    }
    setIsThinking(false);
    setSearchParams({ tab: 'coach' });
  };

  const handleAnalyzeGoal = async (goal: SavingGoal) => {
    setIsThinking(true);
    setAnalyzingGoalId(goal.id);
    setSelectedGoalForAnalysis(goal);
    setGoalAnalysis(null);
    setIsStrategyModalOpen(true);
    try {
      const payload = {
        goalId: goal.id,
        goalName: goal.title,
        targetAmount: goal.targetAmount,
        currentSavings: goal.currentAmount,
        monthsRemaining: goal.durationMonths,
        monthlyIncome: data.profile.monthlyAllowance,
        monthlyExpenses: totalSpent,
        recentSpending: data.expenses.slice(0, 10).map((expense) => expense.amount)
      };
      const analysis = await analyzeGoal(payload);
      setGoalAnalysis(analysis);
    } catch {
      setIsStrategyModalOpen(false);
      addNotification('Analysis failed', 'Could not analyze this goal right now.', 'alert');
    } finally {
      setIsThinking(false);
      setAnalyzingGoalId(null);
    }
  };

  const handleSelectStrategy = async (strategy: GoalStrategy) => {
    if (!goalAnalysis) {
      return;
    }
    setIsSelectingStrategyName(strategy.strategyName);
    try {
      await saveSelectedStrategy({
        goalId: goalAnalysis.goalId,
        goalName: goalAnalysis.goalName,
        strategyName: strategy.strategyName,
        monthlySavingsRequired: strategy.monthlySavingsRequired,
        description: strategy.description,
        spendingAdjustments: strategy.spendingAdjustments,
        stepsToFollow: strategy.stepsToFollow,
        timelineProjection: strategy.timelineProjection
      });
      await refreshStrategyHistory();
      setIsStrategyModalOpen(false);
      setGoalAnalysis(null);
      addNotification('Strategy saved', 'Budget strategy saved to your history.', 'success');
      setSearchParams({ tab: 'history' });
    } catch {
      addNotification('Save failed', 'Could not save the selected strategy.', 'alert');
    } finally {
      setIsSelectingStrategyName(null);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await apiClient.delete(`/expenses/${id}`);
      setData(prev => ({
        ...prev,
        expenses: prev.expenses.filter(e => e.id !== id)
      }));
    } catch {
      addNotification('Delete failed', 'Could not remove expense entry.', 'alert');
    }
  };

  const handleSetBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('monthlyAllowance'));
    if (!Number.isNaN(amount) && amount >= 0) {
      try {
        const response = await apiClient.put<BackendProfile>('/profile', { monthlyIncome: amount });
        setData(prev => ({
          ...prev,
          profile: { ...prev.profile, monthlyAllowance: Number(response.data.monthly_income) || 0 },
        }));
        setIsSetBudgetOpen(false);
        addNotification('Budget set', `Your monthly budget is now ${data.profile.currency}${amount.toLocaleString()}.`, 'success');
      } catch {
        addNotification('Update failed', 'Could not update monthly budget.', 'alert');
      }
    }
  };

  const handleSetAvailableSpending = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const targetAvailable = Number(formData.get('availableSpending'));
    if (Number.isNaN(targetAvailable) || targetAvailable < 0) {
      addNotification('Invalid amount', 'Available spending must be 0 or more.', 'alert');
      return;
    }

    const newMonthlyIncome = Math.max(0, targetAvailable - extraIncome);
    try {
      const response = await apiClient.put<BackendProfile>('/profile', { monthlyIncome: newMonthlyIncome });
      setData(prev => ({
        ...prev,
        profile: { ...prev.profile, monthlyAllowance: Number(response.data.monthly_income) || 0 },
      }));
      setIsSetAvailableSpendingOpen(false);
      addNotification(
        'Available spending updated',
        `Available spending is now ${data.profile.currency}${targetAvailable.toLocaleString()}.`,
        'success'
      );
    } catch {
      addNotification('Update failed', 'Could not update available spending.', 'alert');
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const source = (formData.get('source') as string)?.trim() || 'Extra income';
    try {
      if (editingIncomeId) {
        const response = await apiClient.put<BackendIncome>(`/income/${editingIncomeId}`, {
          amount,
          source
        });
        const updated: IncomeEntry = {
          id: String(response.data.id),
          amount: Number(response.data.amount),
          source: response.data.source,
          date: response.data.income_date
        };
        setData(prev => ({
          ...prev,
          incomeEntries: prev.incomeEntries.map(entry =>
            entry.id === editingIncomeId ? updated : entry
          ),
        }));
        setEditingIncomeId(null);
        setIsAddIncomeOpen(false);
        addNotification('Income updated', `${data.profile.currency}${amount.toLocaleString()} from ${source} updated.`, 'success');
      } else {
        const response = await apiClient.post<BackendIncome>('/income', {
          amount,
          source,
          incomeDate: toIsoDate(new Date())
        });
        const newEntry: IncomeEntry = {
          id: String(response.data.id),
          amount: Number(response.data.amount),
          source: response.data.source,
          date: response.data.income_date
        };
        setData(prev => ({ ...prev, incomeEntries: [newEntry, ...(prev.incomeEntries ?? [])] }));
        setIsAddIncomeOpen(false);
        addNotification('Income added', `${data.profile.currency}${amount.toLocaleString()} from ${source} added to your available spending.`, 'success');
      }
    } catch {
      addNotification('Save failed', 'Could not save income entry.', 'alert');
    }
  };

  const deleteIncome = async (id: string) => {
    try {
      await apiClient.delete(`/income/${id}`);
      setData(prev => ({ ...prev, incomeEntries: (prev.incomeEntries ?? []).filter(e => e.id !== id) }));
    } catch {
      addNotification('Delete failed', 'Could not remove income entry.', 'alert');
    }
  };

  const unreadCount = data.notifications.filter(n => !n.read).length;

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-hidden bg-[#070708] px-6 text-white">
        <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_50%_0%,rgba(139,61,255,0.42),transparent_58%)]" />
        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-8 grid h-24 w-24 place-items-center rounded-[2rem] bg-gradient-to-br from-[#7c2dff] to-[#ca32ff] shadow-[0_24px_70px_rgba(124,45,255,0.35)]">
            <Wallet size={42} />
            <span className="absolute inset-0 rounded-[2rem] border border-white/20" />
            <span className="absolute -inset-3 rounded-[2.5rem] border border-violet-300/20 animate-ping" />
          </div>
          <h1 className="text-4xl font-[900] tracking-tight">BudgeApp</h1>
          <p className="mt-3 text-sm font-bold text-white/45">Preparing your dashboard</p>
          <div className="mt-8 flex items-center gap-2">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="h-2.5 w-2.5 rounded-full bg-white/80 animate-bounce"
                style={{ animationDelay: `${index * 120}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-theme={theme} className="app-shell min-h-screen bg-[#070708] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(139,61,255,0.38),transparent_58%)]" />
      <div className="relative mx-auto min-h-screen w-full max-w-[1500px] px-4 pb-32 pt-5 sm:px-6 lg:px-10 xl:pb-28">

      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-lg font-black text-[#8b3dff] sm:h-12 sm:w-12">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-2xl font-[900] leading-none tracking-tight text-white sm:text-3xl">BudgeApp</p>
            <p className="text-[11px] font-bold uppercase text-white/35">Welcome back</p>
            <h1 className="text-lg font-[900] leading-tight tracking-tight text-white">{displayName.split(' ')[0]}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              setActiveTab('notifs');
              setData(prev => ({ ...prev, notifications: prev.notifications.map(n => ({...n, read: true})) }));
            }}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/8 text-white/60 transition-all hover:bg-white/12 hover:text-white active:scale-95 sm:h-12 sm:w-12"
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute right-3 top-3 h-3 w-3 rounded-full border-2 border-[#171719] bg-rose-500" />
            )}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/8 text-white/60 transition-all hover:bg-white/12 hover:text-white active:scale-95 sm:h-12 sm:w-12"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button
            type="button"
            onClick={openStreakHistory}
            className="hidden items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-yellow-200 shadow-sm transition-all hover:bg-yellow-300/20 active:scale-95 sm:flex"
            title="View daily streaks"
          >
            <Trophy size={20} />
            <span className="font-extrabold text-sm">{currentStreak} Days</span>
          </button>
          <button
            onClick={() => {
              authLogout();
              navigate('/login', { replace: true });
            }}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/8 text-white/60 transition-all hover:bg-rose-500/15 hover:text-rose-300 active:scale-95 sm:h-12 sm:w-12"
            title="Log out"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="space-y-6">

        {activeTab === 'dash' && (
          <div className="page-transition space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-6">

            {/* Main Balance Card */}
            <div className={`relative overflow-hidden rounded-[2.5rem] shadow-[0_28px_70px_rgba(124,58,237,0.38)] transition-all duration-500 ${isInDebt ? 'bg-gradient-to-br from-rose-500 to-fuchsia-700' : 'bg-gradient-to-br from-[#7c2dff] via-[#9d35ff] to-[#ca32ff]'}`}>
               <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/18 blur-2xl"></div>
               <div className="absolute inset-x-0 bottom-0 h-28 bg-black/12"></div>
               <div className="relative z-10 p-7 text-white">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white/45">Available Balance</p>
                      <div className="mt-1 inline-flex items-center rounded-full bg-white/18 px-3 py-1 text-[10px] font-black uppercase">
                        {Math.round(100 - progressPercent)}% left
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSetBudgetOpen(true)}
                      className="grid h-11 w-11 place-items-center rounded-full bg-white/14 text-white transition hover:bg-white/24"
                      title="Edit budget"
                    >
                      <Pencil size={18} />
                    </button>
                  </div>
                  <div className="bg-white/15 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 hidden">
                    {isInDebt ? 'Account Deficit' : 'Available Spending'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSetAvailableSpendingOpen(true)}
                    className="mb-2 block max-w-full break-words text-left text-4xl font-[900] tracking-tight transition-opacity hover:opacity-85 sm:text-6xl"
                    title="Edit available spending"
                  >
                    {data.profile.currency}{Math.abs(remaining).toLocaleString()}
                  </button>
                  <p className="mb-7 text-xs font-bold text-white/45">Updated {new Date().toLocaleDateString()}</p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 overflow-hidden rounded-[1.75rem] bg-black/12 sm:grid-cols-2">
                      <div className="border-b border-white/12 p-4 sm:border-b-0 sm:border-r">
                        <p className="mb-1 text-[10px] font-bold uppercase text-white/45">Budget</p>
                      <button
                        type="button"
                        onClick={() => setIsSetBudgetOpen(true)}
                          className="text-lg font-black text-white hover:underline focus:underline"
                      >
                          {data.profile.currency}{availableBudget.toLocaleString()}
                      </button>
                      </div>
                      <div className="p-4">
                        <p className="mb-1 text-[10px] font-bold uppercase text-white/45">Spent</p>
                        <p className="text-lg font-black text-white">{data.profile.currency}{totalSpent.toLocaleString()}</p>
                      </div>
                    </div>
                    {incomeEntries.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Extra income ({data.profile.currency}{extraIncome.toLocaleString()})</p>
                        <ul className="space-y-1.5 max-h-24 overflow-y-auto">
                          {incomeEntries.map((entry) => (
                            <li key={entry.id} className="flex items-center justify-between gap-2 rounded-2xl bg-black/15 px-3 py-2 text-[11px] font-bold text-white/90">
                              <span>{entry.source}: {data.profile.currency}{entry.amount.toLocaleString()}</span>
                              <span className="flex items-center gap-1 shrink-0">
                                <button type="button" onClick={() => { setEditingIncomeId(entry.id); setIsAddIncomeOpen(true); }} className="p-1.5 rounded-lg hover:bg-white/20" title="Edit">Edit</button>
                                <button type="button" onClick={() => deleteIncome(entry.id)} className="p-1.5 rounded-lg hover:bg-rose-400/50 text-white" title="Remove">Ã—</button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="h-3 w-full overflow-hidden rounded-full bg-black/20">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isInDebt ? 'bg-rose-200' : 'bg-white shadow-[0_0_20px_rgba(255,255,255,0.45)]'}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-black text-white/50 px-1">
                      <span>0%</span>
                      <span>{Math.round(progressPercent)}% SPENT</span>
                      <span>100%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddIncomeOpen(true)}
                      className="mt-1 w-full rounded-2xl border border-white/20 bg-white/15 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-white/25 active:scale-[0.98]"
                    >
                      + Add income
                    </button>
                  </div>
               </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="group flex min-h-20 flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-white/8 bg-[#171719] p-3 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-violet-400/50 touch-manipulation sm:min-h-24 sm:p-4"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                type="button"
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-white/8 text-white transition-all group-hover:bg-violet-500">
                  <PlusCircle size={22} />
                </div>
                <span className="text-xs font-extrabold text-white">Add</span>
              </button>
              <button
                onClick={() => setIsAddIncomeOpen(true)}
                className="group flex min-h-20 flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-white/8 bg-[#171719] p-3 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-[#a3ff2f]/50 sm:min-h-24 sm:p-4"
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-white/8 text-white transition-all group-hover:bg-[#a3ff2f] group-hover:text-black">
                  <Banknote size={22} />
                </div>
                <span className="text-xs font-extrabold text-white">Income</span>
              </button>
              <button
                onClick={() => setIsSetBudgetOpen(true)}
                className="group flex min-h-20 flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-white/8 bg-[#171719] p-3 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-yellow-300/50 sm:min-h-24 sm:p-4"
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-white/8 text-white transition-all group-hover:bg-yellow-300 group-hover:text-black">
                  <Coins size={22} />
                </div>
                <span className="text-xs font-extrabold text-white">Budget</span>
              </button>
              <button
                onClick={askCoach}
                disabled={isThinking}
                className="group flex min-h-20 flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-white/8 bg-[#171719] p-3 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-fuchsia-400/50 sm:min-h-24 sm:p-4"
              >
                <div className={`grid h-11 w-11 place-items-center rounded-full bg-white/8 text-white transition-all group-hover:bg-fuchsia-500 ${isThinking ? 'animate-pulse' : ''}`}>
                  <BrainCircuit size={22} />
                </div>
                <span className="text-xs font-extrabold text-white">AI</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReminderOpen(true)}
                className="group flex min-h-20 flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-white/8 bg-[#171719] p-3 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-cyan-400/50 sm:min-h-24 sm:p-4"
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-white/8 text-white transition-all group-hover:bg-cyan-400 group-hover:text-black">
                  <AlarmClock size={22} />
                </div>
                <span className="text-xs font-extrabold text-white">Reminder</span>
              </button>
            </div>

            {/* Secondary Stats */}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Card className="flex h-full flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white/45">Total Expense</p>
                    <h3 className="text-3xl font-black text-white">{data.profile.currency}{rangedSpent.toLocaleString()}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReminderOpen(true)}
                    className="grid h-14 w-14 place-items-center rounded-full bg-white/8 text-white/70 transition hover:bg-white/12 hover:text-white"
                    title="Reminder settings"
                  >
                    <Settings2 size={22} />
                  </button>
                </div>
                <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Expense history</p>
                      <p className="mt-1 text-sm font-bold text-white/45">Pick a month and day to inspect.</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-black/20 px-3 py-1 text-[10px] font-black text-white/40">
                      {dailySpendingForRange.length} active days
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                        Month
                      </label>
                      <GlassSelect
                        value={selectedExpenseMonth}
                        onChange={(value) => {
                          setSelectedExpenseMonth(value);
                          setSelectedExpenseDate(value === currentExpenseMonth ? todayKey : `${value}-01`);
                        }}
                        options={expenseMonthOptions.map((monthOption) => ({
                          value: monthOption,
                          label: monthLabel(monthOption)
                        }))}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                        Day
                      </label>
                      <GlassSelect
                        value={selectedExpenseDate}
                        onChange={setSelectedExpenseDate}
                        options={expenseDayOptions}
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Selected day</p>
                      <p className="text-sm font-black text-white">{dateLabel(selectedExpenseDate)}</p>
                    </div>
                    <p className="shrink-0 text-lg font-black text-rose-300">
                      {data.profile.currency}{selectedDailyExpenseTotal.toLocaleString()}
                    </p>
                  </div>
                  {selectedDailyExpenses.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        {selectedDailyCategoryBreakdown.map((item) => (
                          <div key={item.category} className="flex items-center justify-between gap-3 rounded-2xl bg-black/18 px-3 py-2">
                            <span className="text-xs font-black text-white/70">{item.category}</span>
                            <span className="text-sm font-black text-white">{data.profile.currency}{item.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                        {selectedDailyExpenses.map((expense) => (
                          <div key={expense.id} className="flex items-center justify-between gap-3 rounded-2xl bg-black/12 px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-white">{expense.description}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">{expense.category}</p>
                            </div>
                            <p className="shrink-0 text-xs font-black text-rose-300">
                              -{data.profile.currency}{expense.amount.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-2xl bg-black/12 px-3 py-4 text-center text-sm font-bold text-white/40">
                      No entries were made on this day.
                    </p>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-center relative min-h-[200px]">
                  {chartData.length > 0 ? (
                    <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} innerRadius={62} outerRadius={92} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={16} isAnimationActive={false}>
                          {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={renderExpenseTooltip} wrapperStyle={{ outline: 'none', zIndex: 30 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <span className="text-2xl font-black text-white">{data.profile.currency}{rangedSpent.toLocaleString()}</span>
                       <span className="text-sm font-bold text-white/45">{monthLabel(selectedExpenseMonth)} spent</span>
                    </div>
                    </>
                  ) : <p className="text-white/30 font-bold text-sm">Add spending to see charts</p>}
                </div>
              </Card>

              <Card className="flex flex-col">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-black text-white">Recent Transactions</h3>
                   <button
                     type="button"
                     onClick={() => setIsExpenseLogOpen(true)}
                     className="rounded-full px-3 py-2 text-xs font-black text-violet-300 transition hover:bg-violet-500/15 hover:text-violet-100"
                   >
                     See All
                   </button>
                </div>
                <div className="space-y-5 flex-1 overflow-y-auto max-h-[240px] pr-2">
                  {data.expenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-white/25">
                      <Wallet size={32} className="mb-2 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">Clear budgeting</p>
                    </div>
                  ) : data.expenses.slice(0, 10).map(exp => (
                    <div key={exp.id} className="group grid min-h-[76px] grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 rounded-[1.35rem] bg-[#202024] px-4 py-3">
                      <CategoryBadge category={exp.category} />
                      <div className="min-w-0">
                          <p className="truncate font-extrabold text-white text-sm leading-tight">{exp.description}</p>
                          <p className="text-[10px] font-bold text-white/35 uppercase">{dateLabel(exp.date)}</p>
                      </div>
                      <div className="flex min-w-0 items-center justify-end gap-2">
                        <span className="max-w-[9rem] truncate text-right font-black text-rose-400 text-sm">-{data.profile.currency}{exp.amount.toLocaleString()}</span>
                        <button onClick={() => deleteExpense(exp.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-rose-300 opacity-100 transition-all hover:bg-rose-500/30 hover:text-white sm:opacity-0 sm:group-hover:opacity-100" title="Remove transaction">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="page-transition space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <header className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Your Goals</h2>
                <p className="text-white/45 font-bold text-sm">Saving for what matters most.</p>
              </div>
              <button
                onClick={() => { setEditingGoalId(null); setIsAddGoalOpen(true); }}
                className="rounded-2xl bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] px-6 py-3 text-sm font-black text-white shadow-xl shadow-violet-950/40 transition-all active:scale-95"
              >
                New Goal
              </button>
            </header>

            <div className="grid gap-6">
              {data.goals.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/5 py-20 text-center">
                  <Target size={64} className="mx-auto mb-6 text-white/15" />
                  <p className="text-xs font-bold uppercase tracking-widest text-white/35">No active goals found</p>
                </div>
              ) : data.goals.map(goal => (
                <Card key={goal.id} className="group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                     <Target size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-black text-2xl text-white tracking-tight">{goal.title}</h4>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${goal.type === GoalType.ShortTerm ? 'bg-cyan-400/15 text-cyan-200' : 'bg-violet-500/20 text-violet-200'}`}>
                            {goal.type}
                          </span>
                          <button
                            onClick={() => { setEditingGoalId(goal.id); setIsAddGoalOpen(true); }}
                            className="p-2 rounded-xl text-white/35 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Edit goal"
                          >
                            <Pencil size={18} />
                          </button>
                        </div>
                        <div className="flex items-center gap-5 text-[11px] font-black text-white/35 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Calendar size={14} className="text-white/25"/> {goal.durationMonths} Months left</span>
                          <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-yellow-200"/> Target: {data.profile.currency}{goal.targetAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-white/35 uppercase tracking-widest mb-1">Current Progress</p>
                          <span className="text-3xl font-black text-[#a3ff2f]">{data.profile.currency}{goal.currentAmount.toLocaleString()}</span>
                          <p className="text-[11px] font-bold text-white/35 mt-1">
                            Manual entries: {data.profile.currency}{(goal.manualContributions ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <span className="text-xl font-black text-white bg-white/8 px-4 py-1.5 rounded-2xl">{Math.round((goal.currentAmount / goal.targetAmount) * 100)}%</span>
                      </div>
                      <div className="h-4 w-full bg-white/8 rounded-full overflow-hidden">
                        <div className="h-full bg-[#a3ff2f] rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(163,255,47,0.4)]" style={{ width: `${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%` }} />
                      </div>
                    </div>

                    <div className="mt-8 space-y-3">
                      <div className="flex gap-3">
                        {[50, 100].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => addManualGoalEntry(goal.id, value)}
                            disabled={pendingGoalEntryIds[goal.id]}
                            className="flex-1 rounded-2xl border border-white/10 bg-white/8 py-4 text-xs font-black text-white hover:border-[#a3ff2f] hover:bg-[#a3ff2f] hover:text-black transition active:scale-95 disabled:opacity-55 shadow-sm"
                          >
                            {pendingGoalEntryIds[goal.id] ? 'ADDING...' : `ADD ${data.profile.currency}${value}`}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] font-black text-white/35 uppercase tracking-widest shrink-0">{data.profile.currency}</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Custom manual amount"
                          value={customGoalAmounts[goal.id] ?? ''}
                          onChange={(e) => setCustomGoalAmounts((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                          className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm font-black text-white placeholder:text-white/25 outline-none focus:border-[#a3ff2f]"
                        />
                        <button
                          type="button"
                          onClick={() => addManualGoalEntry(goal.id, Number(customGoalAmounts[goal.id]))}
                          disabled={!customGoalAmounts[goal.id] || Number(customGoalAmounts[goal.id]) <= 0 || pendingGoalEntryIds[goal.id]}
                          className="py-3.5 px-5 rounded-2xl bg-[#a3ff2f] text-black text-xs font-black hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95 shrink-0"
                        >
                          {pendingGoalEntryIds[goal.id] ? '...' : 'Add'}
                        </button>
                      </div>
                      <div className="rounded-2xl bg-black/18 border border-white/8 p-4 space-y-4">
                        <p className="text-xs font-bold text-white/45">
                          Progress updates automatically from net savings (income minus expenses) and manual entries.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAnalyzeGoal(goal)}
                          disabled={analyzingGoalId !== null}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] text-white text-xs font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-60 disabled:cursor-wait transition active:scale-95"
                        >
                          {analyzingGoalId === goal.id ? 'Opening analysis...' : 'Analyze Goal'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'coach' && (
          <div className="page-transition space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <header className="flex items-center gap-5">
              <div className="rounded-[1.5rem] bg-gradient-to-br from-[#7c2dff] to-[#ca32ff] p-5 text-white shadow-xl shadow-violet-950/40">
                <BrainCircuit size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Financial Assistant</h2>
                <p className="text-white/45 font-bold text-sm">Student intelligence at work.</p>
              </div>
            </header>

            {isThinking ? (
              <div className="text-center py-24 flex flex-col items-center">
                <div className="relative mb-8">
                   <div className="w-24 h-24 border-8 border-white/10 border-t-[#ca32ff] rounded-full animate-spin" />
                   <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-fuchsia-300 animate-pulse" size={28} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Analyzing your budgeting...</h3>
                <p className="text-white/35 font-bold text-sm animate-pulse uppercase tracking-[0.2em]">Running Financial Simulations</p>
              </div>
            ) : !aiAdvice ? (
              <Card className="text-center py-20 flex flex-col items-center">
                <div className="w-24 h-24 bg-white/8 rounded-full flex items-center justify-center mb-8">
                  <BrainCircuit size={48} className="text-fuchsia-300" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Want a financial check-up?</h3>
                <p className="text-white/45 mb-10 max-w-sm font-medium leading-relaxed">Our AI analyzes your spending speed, goal progress, and categories to give you actionable student hacks.</p>
                <button onClick={askCoach} className="rounded-3xl bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] px-12 py-5 font-black text-white shadow-2xl shadow-violet-950/40 transition-all hover:scale-105 active:scale-95">Get AI Analysis</button>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className={`p-8 rounded-[2rem] shadow-xl border ${aiAdvice.isDebtWarning ? 'bg-rose-500/15 border-rose-400/20 text-rose-50' : 'bg-gradient-to-br from-[#7c2dff] to-[#ca32ff] text-white border-white/10'}`}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-3xl font-black leading-tight tracking-tight">{aiAdvice.headline}</h3>
                    <div className={`${aiAdvice.isDebtWarning ? 'bg-rose-200 text-rose-800' : 'bg-white/20 text-white'} px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest`}>
                      Score: {aiAdvice.achievabilityScore}%
                    </div>
                  </div>
                  <p className="font-bold opacity-90 text-sm leading-relaxed mb-6">{aiAdvice.summary}</p>
                  <div className={`h-2 w-full rounded-full ${aiAdvice.isDebtWarning ? 'bg-rose-200' : 'bg-white/20'}`}>
                    <div className={`h-full rounded-full ${aiAdvice.isDebtWarning ? 'bg-rose-600' : 'bg-white'}`} style={{ width: `${aiAdvice.achievabilityScore}%` }} />
                  </div>
                </div>

                {budgetComparison && (
                  <Card>
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">Month-to-month status</p>
                        <h3 className="mt-2 text-2xl font-black text-white">
                          End balance {budgetComparison.improvement_or_decline === 'improved' ? 'improved' : 'declined'}
                        </h3>
                        <p className="mt-2 text-sm font-bold leading-6 text-white/55">
                          Comparing {budgetComparison.month1} with {budgetComparison.month2}, your end-of-month balance changed by {data.profile.currency}{Math.abs(budgetComparison.savings_difference).toLocaleString()}.
                        </p>
                      </div>
                      <div className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-widest ${
                        budgetComparison.improvement_or_decline === 'improved'
                          ? 'bg-[#a3ff2f]/15 text-[#a3ff2f]'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}>
                        {budgetComparison.improvement_or_decline === 'improved' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                        {budgetComparison.improvement_or_decline}
                      </div>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white/6 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Income change</p>
                        <p className={`mt-1 text-lg font-black ${budgetComparison.income_difference >= 0 ? 'text-[#a3ff2f]' : 'text-rose-300'}`}>
                          {budgetComparison.income_difference >= 0 ? '+' : '-'}{data.profile.currency}{Math.abs(budgetComparison.income_difference).toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/6 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Expense change</p>
                        <p className={`mt-1 text-lg font-black ${budgetComparison.expense_difference <= 0 ? 'text-[#a3ff2f]' : 'text-rose-300'}`}>
                          {budgetComparison.expense_difference >= 0 ? '+' : '-'}{data.profile.currency}{Math.abs(budgetComparison.expense_difference).toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/6 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Balance change</p>
                        <p className={`mt-1 text-lg font-black ${budgetComparison.savings_difference >= 0 ? 'text-[#a3ff2f]' : 'text-rose-300'}`}>
                          {budgetComparison.savings_difference >= 0 ? '+' : '-'}{data.profile.currency}{Math.abs(budgetComparison.savings_difference).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <h4 className="mb-3 text-sm font-black text-white">Expense movement summary</h4>
                      <div className="grid gap-3">
                        {budgetComparison.category_changes.length === 0 ? (
                          <p className="text-sm font-bold text-white/45">No category changes were found across the two months.</p>
                        ) : budgetComparison.category_changes.slice(0, 6).map((change) => (
                          <div key={change.category} className="flex items-center justify-between gap-4 rounded-2xl bg-white/6 px-4 py-3">
                            <div>
                              <p className="text-sm font-black text-white">{change.category}</p>
                              <p className="text-[11px] font-bold text-white/40">
                                {budgetComparison.month1}: {data.profile.currency}{change.month1.toLocaleString()} | {budgetComparison.month2}: {data.profile.currency}{change.month2.toLocaleString()}
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-black ${change.difference <= 0 ? 'bg-[#a3ff2f]/15 text-[#a3ff2f]' : 'bg-rose-500/15 text-rose-300'}`}>
                              {change.difference > 0 ? 'Up' : change.difference < 0 ? 'Down' : 'Same'} {data.profile.currency}{Math.abs(change.difference).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}

                <div className="grid grid-cols-1 gap-6">
                  <Card>
                    <h4 className="font-black text-white mb-6 flex items-center gap-3 text-lg">
                      <ArrowUpCircle size={24} className="text-[#a3ff2f]" /> Insight Tips
                    </h4>
                    <ul className="space-y-4">
                      {aiAdvice.tips.map((tip, i) => (
                        <li key={i} className="flex gap-4 text-sm font-bold text-white/70 items-start">
                          <div className="w-6 h-6 rounded-full bg-[#a3ff2f]/15 text-[#a3ff2f] flex items-center justify-center shrink-0 text-[10px]">
                            {i+1}
                          </div>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>

                  {aiAdvice.suggestedReductions.length > 0 && (
                    <Card className="border-rose-100 bg-rose-50/10">
                      <h4 className="font-black text-rose-900 mb-6 flex items-center gap-3 text-lg">
                        <ArrowDownCircle size={24} className="text-rose-500" /> Recommended Cuts
                      </h4>
                      <div className="grid gap-4">
                        {aiAdvice.suggestedReductions.map((red, i) => (
                          <div key={i} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-rose-100">
                            <div className="flex justify-between items-center mb-3">
                               <span className="font-black text-rose-700 text-sm uppercase tracking-widest">{red.category}</span>
                               <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-black">-{data.profile.currency}{red.amount}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-500">{red.reason}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="page-transition space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Budget Strategy History</h2>
              <p className="mt-1 text-sm font-bold text-white/45">Your selected goal strategies are saved here for review.</p>
            </div>
            <BudgetHistory
              strategies={strategyHistory}
              currency={data.profile.currency}
              isLoading={isLoadingHistory}
            />
          </div>
        )}

        {activeTab === 'notifs' && (
          <div className="page-transition space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#a3ff2f]/15 text-[#a3ff2f]">
                <Bell size={26} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Notifications</h2>
                <p className="text-sm font-bold text-white/45">Login confirmations, budget saves, and app alerts.</p>
              </div>
            </div>
            <div className="space-y-4">
              {data.notifications.length === 0 ? (
                <Card className="py-14 text-center">
                  <ClipboardCheck size={46} className="mx-auto mb-4 text-white/20" />
                  <p className="text-xs font-black uppercase tracking-widest text-white/35">No notifications yet</p>
                </Card>
              ) : data.notifications.map(notif => (
                <Card key={notif.id} className="relative">
                  <div className="flex gap-4 items-center">
                    <div className={`p-3 rounded-2xl shrink-0 ${notif.type === 'alert' ? 'bg-rose-500/15 text-rose-300' : notif.type === 'success' ? 'bg-[#a3ff2f]/15 text-[#a3ff2f]' : 'bg-cyan-400/15 text-cyan-300'}`}>
                      {notif.type === 'alert' ? <AlertTriangle size={20} /> : notif.type === 'success' ? <CheckCircle2 size={20} /> : <Sparkles size={20} />}
                    </div>
                    <div>
                      <p className="font-black text-white text-sm">{notif.title}</p>
                      <p className="text-xs font-bold text-white/45">{notif.message}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/25">{new Date(notif.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Set / Edit budget modal â€” required when monthly allowance is 0 */}
      <Modal
        isOpen={showSetBudgetModal}
        onClose={data.profile.monthlyAllowance === 0 ? () => {} : () => setIsSetBudgetOpen(false)}
        title={data.profile.monthlyAllowance === 0 ? 'Set your monthly budget' : 'Edit budget'}
      >
        <form onSubmit={handleSetBudget} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">
              Monthly budget ({data.profile.currency})
            </label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-slate-300">{data.profile.currency}</span>
              <input
                name="monthlyAllowance"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={data.profile.monthlyAllowance || ''}
                className="w-full rounded-[2rem] border border-white/10 bg-black/25 py-6 pl-24 pr-8 text-3xl font-black text-white outline-none placeholder:text-white/25 focus:border-violet-400"
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            <p className="mt-2 px-1 text-xs font-bold text-white/45">Your total available spending for the month.</p>
          </div>
          <button
            type="submit"
            className="w-full rounded-[2rem] bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] py-6 text-lg font-black text-white shadow-[0_20px_40px_rgba(124,45,255,0.25)] transition-all active:scale-95"
          >
            {data.profile.monthlyAllowance === 0 ? 'Set budget' : 'Save'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isSetAvailableSpendingOpen}
        onClose={() => setIsSetAvailableSpendingOpen(false)}
        title="Edit available spending"
      >
        <form onSubmit={handleSetAvailableSpending} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">
              Available spending ({data.profile.currency})
            </label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-slate-300">{data.profile.currency}</span>
              <input
                name="availableSpending"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={availableBudget}
                className="w-full rounded-[2rem] border border-white/10 bg-black/25 py-6 pl-24 pr-8 text-3xl font-black text-white outline-none placeholder:text-white/25 focus:border-violet-400"
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            <p className="mt-2 px-1 text-xs font-bold text-white/45">
              This updates base monthly budget while preserving existing income entries.
            </p>
          </div>
          <button
            type="submit"
            className="w-full rounded-[2rem] bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] py-6 text-lg font-black text-white shadow-[0_20px_40px_rgba(124,45,255,0.25)] transition-all active:scale-95"
          >
            Save
          </button>
        </form>
      </Modal>

      {/* Modern Floating Modals */}
      <Modal isOpen={isAddExpenseOpen} onClose={() => setIsAddExpenseOpen(false)} title="Log Transaction">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddExpense(e);
          }}
          className="space-y-5 sm:space-y-8"
          noValidate
        >
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Amount</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-white/35 transition-colors group-focus-within:text-violet-300 sm:left-6 sm:text-3xl">{data.profile.currency}</span>
              <input
                name="amount"
                type="number"
                step="0.01"
                required
                className="w-full rounded-[1.5rem] border border-white/10 bg-black/25 py-5 pl-20 pr-5 text-3xl font-black text-white outline-none transition-all placeholder:text-white/25 focus:border-violet-400 sm:rounded-[2rem] sm:py-8 sm:pl-24 sm:pr-8 sm:text-4xl"
                placeholder="0.00"
                inputMode="decimal"
                style={{ touchAction: 'manipulation' }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
             <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Category</label>
               <GlassSelect
                 name="category"
                 value={expenseCategory}
                 onChange={(value) => setExpenseCategory(value as Category)}
                 options={Object.values(Category).map((cat) => ({ value: cat, label: cat }))}
               />
             </div>
             <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">What's it for?</label>
               <input
                 name="description"
                 type="text"
                 className="w-full rounded-2xl border border-white/10 bg-black/25 px-5 py-4 font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-400 sm:px-8 sm:py-5"
                 placeholder="Lunch at campus..."
                 style={{ touchAction: 'manipulation' }}
               />
             </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-[1.5rem] bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] py-4 text-base font-black text-white shadow-[0_20px_40px_rgba(124,45,255,0.25)] transition-all active:scale-95 touch-manipulation sm:rounded-[2rem] sm:py-6 sm:text-lg"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            Add to BudgeApp
          </button>
        </form>
      </Modal>

      <Modal isOpen={isAddGoalOpen} onClose={() => { setIsAddGoalOpen(false); setEditingGoalId(null); }} title={editingGoalId ? 'Edit Goal' : 'Start New Goal'}>
        <form key={editingGoalId ?? 'new'} onSubmit={handleGoalSubmit} className="space-y-6">
          {(() => {
            const goalToEdit = editingGoalId ? data.goals.find(g => g.id === editingGoalId) : null;
            return (
              <>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">What are you saving for?</label>
                  <input name="title" type="text" required defaultValue={goalToEdit?.title ?? ''} className="w-full rounded-2xl border border-white/10 bg-black/25 px-8 py-5 font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-400" placeholder="New MacBook, Trip to Europe..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Target ({data.profile.currency})</label>
                    <input name="targetAmount" type="number" required defaultValue={goalToEdit?.targetAmount ?? ''} className="w-full rounded-2xl border border-white/10 bg-black/25 px-8 py-5 font-black text-white outline-none placeholder:text-white/25 focus:border-violet-400" placeholder="5000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Months</label>
                    <input name="durationMonths" type="number" required defaultValue={goalToEdit?.durationMonths ?? ''} className="w-full rounded-2xl border border-white/10 bg-black/25 px-8 py-5 font-black text-white outline-none placeholder:text-white/25 focus:border-violet-400" placeholder="6" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Goal Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex cursor-pointer items-center justify-center rounded-[1.5rem] border border-white/10 p-5 text-white transition-all hover:bg-white/8 has-[:checked]:border-violet-400 has-[:checked]:bg-violet-500/20">
                      <input type="radio" name="type" value={GoalType.ShortTerm} defaultChecked={!goalToEdit || goalToEdit.type === GoalType.ShortTerm} className="hidden" />
                      <span className="text-xs font-black uppercase tracking-widest">Short-term</span>
                    </label>
                    <label className="flex cursor-pointer items-center justify-center rounded-[1.5rem] border border-white/10 p-5 text-white transition-all hover:bg-white/8 has-[:checked]:border-violet-400 has-[:checked]:bg-violet-500/20">
                      <input type="radio" name="type" value={GoalType.LongTerm} defaultChecked={goalToEdit?.type === GoalType.LongTerm} className="hidden" />
                      <span className="text-xs font-black uppercase tracking-widest">Long-term</span>
                    </label>
                  </div>
                </div>
                <button type="submit" className="mt-4 w-full rounded-[2rem] bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] py-6 text-lg font-black text-white shadow-[0_20px_40px_rgba(124,45,255,0.25)] transition-all active:scale-95">{editingGoalId ? 'Save Changes' : 'Unlock Goal'}</button>
              </>
            );
          })()}
        </form>
      </Modal>

      <Modal isOpen={isAddIncomeOpen} onClose={() => { setIsAddIncomeOpen(false); setEditingIncomeId(null); }} title={editingIncomeId ? 'Edit income' : 'Add income'}>
        <form
          key={editingIncomeId ?? 'new'}
          onSubmit={(e) => {
            e.preventDefault();
            handleIncomeSubmit(e);
          }}
          className="space-y-6"
          noValidate
        >
          {(() => {
            const entryToEdit = editingIncomeId ? incomeEntries.find(e => e.id === editingIncomeId) : null;
            return (
              <>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Amount</label>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-3xl text-white/35 transition-colors group-focus-within:text-[#a3ff2f]">{data.profile.currency}</span>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      autoFocus
                      defaultValue={entryToEdit?.amount ?? ''}
                      className="w-full rounded-[2rem] border border-white/10 bg-black/25 py-8 pl-24 pr-8 text-4xl font-black text-white outline-none transition-all placeholder:text-white/25 focus:border-[#a3ff2f]"
                      placeholder="0.00"
                      inputMode="decimal"
                      style={{ touchAction: 'manipulation' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Source (optional)</label>
                  <input
                    name="source"
                    type="text"
                    defaultValue={entryToEdit?.source ?? ''}
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-8 py-5 font-bold text-white outline-none placeholder:text-white/25 focus:border-[#a3ff2f]"
                    placeholder="Side gig, gift, refund..."
                    style={{ touchAction: 'manipulation' }}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-[2rem] bg-[#a3ff2f] py-6 text-lg font-black text-black shadow-[0_20px_40px_rgba(163,255,47,0.18)] transition-all active:scale-95 touch-manipulation"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                >
                  {editingIncomeId ? 'Save changes' : 'Add to available spending'}
                </button>
              </>
            );
          })()}
        </form>
      </Modal>

      <Modal isOpen={isExpenseLogOpen} onClose={() => setIsExpenseLogOpen(false)} title="Expense Logs">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Total logged</p>
              <p className="text-xl font-black text-white">{data.profile.currency}{totalSpent.toLocaleString()}</p>
            </div>
            <span className="rounded-full bg-violet-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-200">
              {data.expenses.length} entries
            </span>
          </div>
          <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
            {data.expenses.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/5 py-12 text-center">
                <Wallet size={42} className="mx-auto mb-3 text-white/20" />
                <p className="text-xs font-black uppercase tracking-widest text-white/35">No expense logs yet</p>
              </div>
            ) : data.expenses.map((exp) => (
              <div key={exp.id} className="group grid min-h-[76px] grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 rounded-[1.35rem] bg-[#202024] px-4 py-3">
                <CategoryBadge category={exp.category} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold leading-tight text-white">{exp.description}</p>
                  <p className="text-[10px] font-bold uppercase text-white/35">
                    {exp.category} | {dateLabel(exp.date)}
                  </p>
                </div>
                <div className="flex min-w-0 items-center justify-end gap-2">
                  <span className="max-w-[9rem] truncate text-right text-sm font-black text-rose-400">
                    -{data.profile.currency}{exp.amount.toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteExpense(exp.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-rose-300 transition hover:bg-rose-500/30 hover:text-white"
                    title="Remove transaction"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isStrategyModalOpen}
        onClose={() => {
          if (!isSelectingStrategyName) {
            setIsStrategyModalOpen(false);
          }
        }}
        title="Goal Strategy Analysis"
      >
        {!goalAnalysis ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-5 grid h-16 w-16 place-items-center rounded-full border-4 border-white/10 border-t-violet-300 animate-spin" />
            <h3 className="text-xl font-black text-white">Analyzing {selectedGoalForAnalysis?.title || 'goal'}...</h3>
            <p className="mt-2 max-w-xs text-sm font-bold leading-6 text-white/45">
              Building strategy options from your goal, savings, and current spending.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <Card className="border-violet-400/20 bg-violet-500/10">
              <p className="text-xs font-black uppercase tracking-widest text-white/35">Goal</p>
              <h3 className="text-xl font-black text-white">{selectedGoalForAnalysis?.title || goalAnalysis.goalName}</h3>
              <p className="text-sm font-bold text-white/55 mt-2">
                Required monthly savings: {data.profile.currency}{goalAnalysis.requiredMonthlySavings.toLocaleString()}
              </p>
              <p className="text-xs font-black text-violet-200 mt-1">Feasibility: {goalAnalysis.feasibilityLevel}</p>
            </Card>
            {goalAnalysis.strategies.map((strategy) => (
              <Card key={strategy.strategyName}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-black text-white">{strategy.strategyName}</h4>
                      <p className="text-sm font-bold text-white/45">{strategy.description}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-100 text-xs font-black">
                      {data.profile.currency}{strategy.monthlySavingsRequired.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1">Steps</p>
                    <ul className="space-y-1">
                      {strategy.stepsToFollow.map((step, index) => (
                        <li key={`${strategy.strategyName}-step-${index}`} className="text-xs font-bold text-white/65">â€¢ {step}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs font-bold text-white/55"><span className="font-black text-white">Timeline:</span> {strategy.timelineProjection}</p>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1">Spending adjustments</p>
                    <ul className="space-y-1">
                      {strategy.spendingAdjustments.map((adjustment, index) => (
                        <li key={`${strategy.strategyName}-adj-${index}`} className="text-xs font-bold text-white/65">â€¢ {adjustment}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectStrategy(strategy)}
                    disabled={isSelectingStrategyName !== null}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] text-white text-xs font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-60 disabled:cursor-wait transition-all"
                  >
                    {isSelectingStrategyName === strategy.strategyName ? 'Saving...' : 'Select Strategy'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>

      <Modal isOpen={isKycOpen} onClose={() => {}} title="Student KYC">
        <form onSubmit={handleKycSubmit} className="space-y-6">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full ${kycStep >= step ? 'bg-gradient-to-r from-[#7c2dff] to-[#ca32ff]' : 'bg-white/10'}`}
              />
            ))}
          </div>
          <div className="rounded-2xl border border-[#a3ff2f]/20 bg-[#a3ff2f]/10 p-4">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Step {kycStep} of 3</p>
            <p className="text-sm font-bold leading-6 text-white/75">
              {kycStep === 1 && 'Tell us about your student income so your monthly plan starts from a useful baseline.'}
              {kycStep === 2 && 'Choose why you are using BudgeApp so the dashboard can emphasize the right habits.'}
              {kycStep === 3 && 'Pick how intense you want the app to be when it nudges and coaches you.'}
            </p>
          </div>
          {kycStep === 1 && (
            <div className="space-y-5">
              <div>
                <label className="mb-3 block px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Student type
                </label>
                <GlassSelect
                  value={kycStudentType}
                  onChange={setKycStudentType}
                  options={[
                    { value: 'full-time', label: 'Full-time student' },
                    { value: 'part-time', label: 'Part-time student' },
                    { value: 'working-student', label: 'Working student' },
                    { value: 'international-student', label: 'International student' }
                  ]}
                />
              </div>
              <div>
                <label className="mb-3 block px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Student income or monthly budget ({data.profile.currency})
                </label>
                <input
                  value={kycMonthlyIncome}
                  onChange={(e) => setKycMonthlyIncome(e.target.value)}
                  type="number"
                  min="0"
                  step="1"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-6 py-5 text-2xl font-black text-white outline-none placeholder:text-white/25 focus:border-violet-400"
                  placeholder="0"
                />
              </div>
            </div>
          )}
          {kycStep === 2 && (
            <div>
              <label className="mb-3 block px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Main reason for using BudgeApp
              </label>
              <GlassSelect
                value={kycReason}
                onChange={setKycReason}
                options={[
                  { value: 'track-spending', label: 'Track my spending' },
                  { value: 'save-for-goal', label: 'Save for a goal' },
                  { value: 'avoid-overspending', label: 'Avoid overspending' },
                  { value: 'build-discipline', label: 'Build better money discipline' }
                ]}
              />
            </div>
          )}
          {kycStep === 3 && (
            <div>
              <label className="mb-3 block px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Saving goal intensity
              </label>
              <div className="grid gap-3">
                {[
                  {
                    value: 'easy',
                    title: 'Easy',
                    description: 'Gentle savings pace with more room for daily spending.'
                  },
                  {
                    value: 'medium',
                    title: 'Medium',
                    description: 'Balanced savings pace with steady weekly accountability.'
                  },
                  {
                    value: 'aggressive',
                    title: 'Aggressive',
                    description: 'Faster goal progress with stricter spending control.'
                  }
                ].map((option) => {
                  const isSelected = kycIntensity === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setKycIntensity(option.value)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
                        isSelected
                          ? 'border-[#a3ff2f]/70 bg-[#a3ff2f]/15 shadow-[0_0_0_1px_rgba(163,255,47,0.25)]'
                          : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/8'
                      }`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className={`text-base font-black ${isSelected ? 'text-[#a3ff2f]' : 'text-white'}`}>
                            {option.title}
                          </p>
                          <p className="mt-1 text-sm font-bold leading-5 text-white/50">{option.description}</p>
                        </div>
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                          isSelected ? 'border-[#a3ff2f] bg-[#a3ff2f] text-black' : 'border-white/20 text-transparent'
                        }`}>
                          <CheckCircle2 size={16} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            {kycStep > 1 && (
              <button
                type="button"
                onClick={() => setKycStep((step) => Math.max(1, step - 1))}
                className="flex-1 rounded-[2rem] border border-white/10 bg-white/8 py-5 text-sm font-black uppercase tracking-widest text-white transition-all active:scale-95"
              >
                Back
              </button>
            )}
            {kycStep < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (kycStep === 1 && (!kycMonthlyIncome || Number(kycMonthlyIncome) < 0)) {
                    addNotification('KYC needs income', 'Enter your student income before continuing.', 'alert');
                    return;
                  }
                  setKycStep((step) => Math.min(3, step + 1));
                }}
                className="flex-1 rounded-[2rem] bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] py-5 text-sm font-black uppercase tracking-widest text-white shadow-[0_20px_40px_rgba(124,45,255,0.25)] transition-all active:scale-95"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={!kycIntensity}
                className="flex-1 rounded-[2rem] bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] py-5 text-sm font-black uppercase tracking-widest text-white shadow-[0_20px_40px_rgba(124,45,255,0.25)] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            )}
          </div>
        </form>
      </Modal>

      <Modal isOpen={isReminderOpen} onClose={() => setIsReminderOpen(false)} title="Reminder Settings">
        <form onSubmit={handleReminderSubmit} className="space-y-6">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
            <div className="flex items-start gap-3">
              <AlarmClock size={22} className="mt-1 shrink-0 text-cyan-200" />
              <p className="text-sm font-bold leading-6 text-white/70">
                Choose when BudgeApp should remind you to enter daily logs. The reminder appears in-app, and browser notifications are used when permission is granted.
              </p>
            </div>
          </div>
          <div>
            <label className="mb-3 block px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Daily reminder time
            </label>
            <GlassSelect
              value={reminderTime}
              onChange={setReminderTime}
              options={reminderTimeOptions}
            />
            <p className="mt-2 px-1 text-xs font-bold text-white/45">
              Current reminder: {timeLabel(reminderTime)}
            </p>
          </div>
          <button
            type="submit"
            className="w-full rounded-[2rem] bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] py-5 text-sm font-black uppercase tracking-widest text-white shadow-[0_20px_40px_rgba(124,45,255,0.25)] transition-all active:scale-95"
          >
            Save Reminder
          </button>
        </form>
      </Modal>

      <Modal isOpen={isStreakOpen} onClose={() => setIsStreakOpen(false)} title="Daily Streaks">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-yellow-300/20 bg-yellow-300/10 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Current streak</p>
                <p className="mt-1 text-4xl font-black text-white">{currentStreak} days</p>
              </div>
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-yellow-300/20 text-yellow-200">
                <Trophy size={28} />
              </div>
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-white/55">
              A day counts when you open and use the app while signed in.
            </p>
            {streakHistory && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Longest</p>
                  <p className="mt-1 text-lg font-black text-white">{streakHistory.longest_streak} days</p>
                </div>
                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Active days</p>
                  <p className="mt-1 text-lg font-black text-white">{streakHistory.active_days}/{streakHistory.window_days}</p>
                </div>
              </div>
            )}
          </div>
          {isStreakHistoryLoading && (
            <p className="rounded-2xl bg-white/6 px-4 py-3 text-center text-sm font-bold text-white/45">
              Loading usage streak history...
            </p>
          )}
          {streakHistoryError && (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-center">
              <p className="text-sm font-bold text-rose-100">{streakHistoryError}</p>
              <button
                type="button"
                onClick={() => void loadStreakHistory()}
                className="mt-3 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/15"
              >
                Retry
              </button>
            </div>
          )}
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Last 14 days</p>
            <div className="grid grid-cols-7 gap-2">
              {streakDays.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedStreakDate(day.key)}
                  className={`min-h-[72px] rounded-2xl border p-2 text-center transition-all active:scale-95 ${
                    (selectedStreakDate || toDateKey(new Date())) === day.key
                      ? 'border-violet-300 bg-violet-500/20 text-white'
                      : day.active
                        ? 'border-[#a3ff2f]/30 bg-[#a3ff2f]/15 text-[#a3ff2f]'
                        : 'border-white/10 bg-white/6 text-white/45'
                  }`}
                >
                  <span className="block text-[9px] font-black uppercase tracking-widest">{day.label}</span>
                  <span className="mt-1 block text-lg font-black">{day.day}</span>
                </button>
              ))}
            </div>
          </div>
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Selected day</p>
                <p className="text-lg font-black text-white">{dateLabel(selectedStreakActivity.date)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                selectedUsageActivity
                  ? 'bg-[#a3ff2f]/15 text-[#a3ff2f]'
                  : 'bg-white/8 text-white/45'
              }`}>
                {selectedUsageActivity ? 'Active' : 'No app use'}
              </span>
            </div>
            {selectedUsageActivity && (
              <p className="rounded-2xl bg-[#a3ff2f]/10 px-4 py-3 text-sm font-bold text-[#a3ff2f]">
                App interactions recorded: {selectedUsageActivity.activity_count}
              </p>
            )}
            <div className="grid gap-2">
              {[...selectedStreakActivity.incomes.map((entry) => ({
                id: `income-${entry.id}`,
                label: entry.source,
                amount: entry.amount,
                type: 'Income'
              })), ...selectedStreakActivity.expenses.map((expense) => ({
                id: `expense-${expense.id}`,
                label: expense.description,
                amount: expense.amount,
                type: expense.category
              }))].map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/6 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{item.label}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">{item.type}</p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-white">{data.profile.currency}{item.amount.toLocaleString()}</p>
                </div>
              ))}
              {selectedStreakActivity.expenses.length + selectedStreakActivity.incomes.length === 0 && (
                <p className="rounded-2xl bg-white/6 px-4 py-4 text-center text-sm font-bold text-white/40">
                  No income or expense logs were added on this day.
                </p>
              )}
            </div>
          </Card>
        </div>
      </Modal>

      {/* Floating Navigation Dock */}
      <nav className="nav-dock fixed bottom-6 left-1/2 z-40 flex w-[92%] max-w-lg -translate-x-1/2 items-center justify-between rounded-full border border-white/10 bg-[#171719]/90 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-all duration-500">
        <button
          onClick={() => setActiveTab('dash')}
          className={`nav-tab flex-1 py-3 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'dash' ? 'nav-tab-active bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] text-white shadow-lg shadow-violet-950/40' : 'text-white/35 hover:text-white'}`}
        >
          <LayoutDashboard size={22} strokeWidth={activeTab === 'dash' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Home</span>
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`nav-tab flex-1 py-3 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'goals' ? 'nav-tab-active bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] text-white shadow-lg shadow-violet-950/40' : 'text-white/35 hover:text-white'}`}
        >
          <Target size={22} strokeWidth={activeTab === 'goals' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Goals</span>
        </button>
        <button
          onClick={() => setActiveTab('coach')}
          className={`nav-tab flex-1 py-3 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'coach' ? 'nav-tab-active bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] text-white shadow-lg shadow-violet-950/40' : 'text-white/35 hover:text-white'}`}
        >
          <BrainCircuit size={22} strokeWidth={activeTab === 'coach' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Assistant</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`nav-tab flex-1 py-3 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'nav-tab-active bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] text-white shadow-lg shadow-violet-950/40' : 'text-white/35 hover:text-white'}`}
        >
          <Clock size={22} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">History</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('notifs');
            setData(prev => ({ ...prev, notifications: prev.notifications.map(n => ({...n, read: true})) }));
          }}
          className={`nav-tab flex-1 py-3 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'notifs' ? 'nav-tab-active bg-gradient-to-r from-[#7c2dff] to-[#ca32ff] text-white shadow-lg shadow-violet-950/40' : 'text-white/35 hover:text-white'}`}
        >
          <Bell size={22} strokeWidth={activeTab === 'notifs' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Alerts</span>
        </button>
      </nav>
      </div>
    </div>
  );
}
