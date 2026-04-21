
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
  ChevronRight,
  TrendingUp,
  X,
  Bell,
  AlertTriangle,
  Clock,
  Calendar,
  Wallet,
  Sparkles,
  ArrowRight,
  Pencil,
  Banknote,
  LogOut
} from 'lucide-react';
import { getSession, logout as authLogout } from './auth';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip
} from 'recharts';
import { apiClient } from './services/apiClient';
import { analyzeGoal, getCoachInsight, getStrategyHistory, saveSelectedStrategy } from './services/dashboardApi';
import { BudgetState, Expense, Category, SavingGoal, AIAdvice, GoalType, Notification, IncomeEntry, GoalStrategy, GoalAnalysisResponse, BudgetStrategy } from './types';
import BudgetHistory from './pages/BudgetHistory';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#64748b'];

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

const DEFAULT_CURRENCY = 'GH₵';

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
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
  <div className={`bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 ${className}`}>
    {children}
  </div>
);

const CategoryBadge: React.FC<{ category: Category }> = ({ category }) => {
  const styles: Record<string, string> = {
    [Category.Food]: 'bg-amber-100 text-amber-700',
    [Category.Transport]: 'bg-blue-100 text-blue-700',
    [Category.Rent]: 'bg-indigo-100 text-indigo-700',
    [Category.Entertainment]: 'bg-purple-100 text-purple-700',
    [Category.Utilities]: 'bg-red-100 text-red-700',
    [Category.Other]: 'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[category]}`}>
      {category}
    </span>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{ touchAction: 'manipulation' }}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: 'manipulation' }}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-800">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors touch-manipulation"
            style={{ touchAction: 'manipulation' }}
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = getSession()!;
  const month = useMemo(() => currentMonthKey(), []);
  const [data, setData] = useState<BudgetState>(() => initialBudgetState(session.name));
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const currentTab = searchParams.get('tab');
  const activeTab = currentTab === 'notifs' ? 'history' : (currentTab || 'dash');
  const setActiveTab = (tab: string) => {
    setSearchParams(tab === 'dash' ? {} : { tab });
  };
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [customGoalAmounts, setCustomGoalAmounts] = useState<Record<string, string>>({});
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
  const showSetBudgetModal = data.profile.monthlyAllowance === 0 || isSetBudgetOpen;

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

  const chartData = useMemo(() => {
    const summary = data.expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(summary).map(([name, value]) => ({ name, value }));
  }, [data.expenses]);

  const addNotification = (title: string, message: string, type: Notification['type']) => {
    const newNotif: Notification = {
      id: generateId(),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    setData(prev => ({ ...prev, notifications: [newNotif, ...prev.notifications] }));
  };

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
        name: profile.name ?? session.name,
        monthlyAllowance: Number(profile.monthly_income) || 0
      },
      incomeEntries: incomes,
      expenses,
      goals: goals
    }));
  }, [month, session.name]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshFromApi();
        await refreshStrategyHistory();
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
    try {
      await apiClient.post(`/savings-goal/${goalId}/manual-entry`, {
        amount,
        note: `Manual contribution for goal ${goalId}`,
        entryDate: toIsoDate(new Date())
      });
      await refreshFromApi();
      setCustomGoalAmounts((prev) => ({ ...prev, [goalId]: '' }));
      addNotification('Goal updated', `Manual entry of ${data.profile.currency}${amount.toLocaleString()} added.`, 'success');
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || 'Could not add manual goal entry.';
      addNotification('Save failed', message, 'alert');
    }
  };

  const askCoach = async () => {
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
    } catch {
      addNotification('AI unavailable', 'Could not generate AI insight right now.', 'alert');
    }
    setIsThinking(false);
    setSearchParams({ tab: 'coach' });
  };

  const handleAnalyzeGoal = async (goal: SavingGoal) => {
    setIsThinking(true);
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
      setSelectedGoalForAnalysis(goal);
      setIsStrategyModalOpen(true);
    } catch {
      addNotification('Analysis failed', 'Could not analyze this goal right now.', 'alert');
    } finally {
      setIsThinking(false);
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
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold">
        Syncing your budget data...
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 max-w-2xl mx-auto px-6 pt-10">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-[900] text-slate-900 tracking-tight leading-tight">Budgeting</h1>
          <p className="text-slate-500 font-bold text-sm">Welcome back, {session.name.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => {
              setActiveTab('history');
              setData(prev => ({ ...prev, notifications: prev.notifications.map(n => ({...n, read: true})) }));
            }}
            className="relative p-4 bg-white rounded-3xl text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100 transition-all active:scale-95"
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute top-3 right-3 w-3 h-3 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </button>
          <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2.5 sm:px-5 sm:py-3 rounded-3xl border border-amber-200 shadow-sm">
            <Trophy size={20} />
            <span className="font-extrabold text-sm">{data.streak} Days</span>
          </div>
          <button
            onClick={() => {
              authLogout();
              navigate('/login', { replace: true });
            }}
            className="p-4 bg-white rounded-3xl text-slate-400 hover:text-rose-600 shadow-sm border border-slate-100 transition-all active:scale-95"
            title="Log out"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="space-y-8">
        
        {activeTab === 'dash' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Main Balance Card */}
            <div className={`relative overflow-hidden rounded-[3rem] p-1 shadow-2xl transition-all duration-500 ${isInDebt ? 'bg-rose-500' : 'bg-indigo-600'}`}>
               <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent z-0"></div>
               <div className="relative z-10 bg-white/5 backdrop-blur-xl p-10 text-white flex flex-col items-center text-center">
                  <div className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                    {isInDebt ? 'Account Deficit' : 'Available Spending'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSetAvailableSpendingOpen(true)}
                    className="text-6xl font-[900] mb-8 tracking-tighter hover:opacity-85 transition-opacity"
                    title="Edit available spending"
                  >
                    {data.profile.currency} {Math.abs(remaining).toLocaleString()}
                  </button>
                  
                  <div className="w-full space-y-4">
                    <div className="flex justify-between items-end text-xs font-bold uppercase tracking-widest text-white/60">
                      <span>Budget</span>
                      <button
                        type="button"
                        onClick={() => setIsSetBudgetOpen(true)}
                        className="text-white hover:underline focus:underline"
                      >
                        {data.profile.currency} {availableBudget.toLocaleString()}
                      </button>
                    </div>
                    {incomeEntries.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Extra income ({data.profile.currency}{extraIncome.toLocaleString()})</p>
                        <ul className="space-y-1.5 max-h-24 overflow-y-auto">
                          {incomeEntries.map((entry) => (
                            <li key={entry.id} className="flex items-center justify-between gap-2 text-white/90 text-[11px] font-bold bg-white/10 rounded-xl px-3 py-2">
                              <span>{entry.source}: {data.profile.currency}{entry.amount.toLocaleString()}</span>
                              <span className="flex items-center gap-1 shrink-0">
                                <button type="button" onClick={() => { setEditingIncomeId(entry.id); setIsAddIncomeOpen(true); }} className="p-1.5 rounded-lg hover:bg-white/20" title="Edit">Edit</button>
                                <button type="button" onClick={() => deleteIncome(entry.id)} className="p-1.5 rounded-lg hover:bg-rose-400/50 text-white" title="Remove">×</button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="h-5 w-full bg-black/10 rounded-full overflow-hidden p-1">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isInDebt ? 'bg-rose-300' : 'bg-white shadow-[0_0_20px_rgba(255,255,255,0.5)]'}`}
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
                      className="mt-2 w-full py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-black uppercase tracking-widest border border-white/20 transition-all active:scale-[0.98]"
                    >
                      + Add income
                    </button>
                  </div>
               </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-5">
              <button 
                onClick={() => setIsAddExpenseOpen(true)}
                className="group flex flex-col items-start gap-4 bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all touch-manipulation"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                type="button"
              >
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <PlusCircle size={28} />
                </div>
                <span className="font-extrabold text-slate-800 text-lg">Log Spending</span>
              </button>
              <button 
                onClick={() => setIsAddIncomeOpen(true)}
                className="group flex flex-col items-start gap-4 bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <Banknote size={28} />
                </div>
                <span className="font-extrabold text-slate-800 text-lg">Add Income</span>
              </button>
              <button 
                onClick={() => setIsSetBudgetOpen(true)}
                className="group flex flex-col items-start gap-4 bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="p-4 bg-amber-50 text-amber-600 rounded-3xl group-hover:bg-amber-600 group-hover:text-white transition-all">
                  <Coins size={28} />
                </div>
                <span className="font-extrabold text-slate-800 text-lg">Set Budget</span>
              </button>
              <button 
                onClick={askCoach}
                disabled={isThinking}
                className="group flex flex-col items-start gap-4 bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all col-span-3"
              >
                <div className={`p-4 bg-purple-50 text-purple-600 rounded-3xl group-hover:bg-purple-600 group-hover:text-white transition-all ${isThinking ? 'animate-pulse' : ''}`}>
                  <BrainCircuit size={28} />
                </div>
                <span className="font-extrabold text-slate-800 text-lg">AI Insight</span>
              </button>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="h-full flex flex-col">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-500" />
                  Categories
                </h3>
                <div className="flex-1 flex items-center justify-center relative min-h-[200px]">
                  {chartData.length > 0 ? (
                    <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none">
                          {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                       <span className="text-xl font-black text-slate-800">{data.profile.currency}{totalSpent.toLocaleString()}</span>
                    </div>
                    </>
                  ) : <p className="text-slate-300 font-bold text-sm">Add spending to see charts</p>}
                </div>
              </Card>

              <Card className="flex flex-col">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-black text-slate-900">Recent</h3>
                   <span className="text-indigo-600 font-bold text-xs cursor-pointer hover:underline">View All</span>
                </div>
                <div className="space-y-5 flex-1 overflow-y-auto max-h-[240px] pr-2">
                  {data.expenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-300">
                      <Wallet size={32} className="mb-2 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">Clear budgeting</p>
                    </div>
                  ) : data.expenses.slice(0, 10).map(exp => (
                    <div key={exp.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CategoryBadge category={exp.category} />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm leading-tight">{exp.description}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(exp.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-700 text-sm">-{data.profile.currency}{exp.amount}</span>
                        <button onClick={() => deleteExpense(exp.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
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
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <header className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Your Dreams</h2>
                <p className="text-slate-500 font-bold text-sm">Saving for what matters most.</p>
              </div>
              <button 
                onClick={() => { setEditingGoalId(null); setIsAddGoalOpen(true); }}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 active:scale-95 transition-all"
              >
                New Goal
              </button>
            </header>

            <div className="grid gap-6">
              {data.goals.length === 0 ? (
                <div className="text-center py-20 bg-white/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <Target size={64} className="mx-auto text-slate-200 mb-6" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active goals found</p>
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
                          <h4 className="font-black text-2xl text-slate-900 tracking-tight">{goal.title}</h4>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${goal.type === GoalType.ShortTerm ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                            {goal.type}
                          </span>
                          <button
                            onClick={() => { setEditingGoalId(goal.id); setIsAddGoalOpen(true); }}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100"
                            title="Edit goal"
                          >
                            <Pencil size={18} />
                          </button>
                        </div>
                        <div className="flex items-center gap-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-300"/> {goal.durationMonths} Months left</span>
                          <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-amber-400"/> Target: {data.profile.currency}{goal.targetAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Progress</p>
                          <span className="text-3xl font-black text-emerald-600">{data.profile.currency}{goal.currentAmount.toLocaleString()}</span>
                          <p className="text-[11px] font-bold text-slate-400 mt-1">
                            Manual entries: {data.profile.currency}{(goal.manualContributions ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <span className="text-xl font-black text-slate-800 bg-slate-100 px-4 py-1.5 rounded-2xl">{Math.round((goal.currentAmount / goal.targetAmount) * 100)}%</span>
                      </div>
                      <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden p-1.5 border border-slate-200/50">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ width: `${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%` }} />
                      </div>
                    </div>

                    <div className="mt-8 space-y-3">
                      <div className="flex gap-3">
                        {[50, 100].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => addManualGoalEntry(goal.id, value)}
                            className="flex-1 py-4 rounded-2xl bg-white border border-slate-200 text-xs font-black text-slate-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all active:scale-95 shadow-sm"
                          >
                            ADD {data.profile.currency}{value}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{data.profile.currency}</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Custom manual amount"
                          value={customGoalAmounts[goal.id] ?? ''}
                          onChange={(e) => setCustomGoalAmounts((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                          className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-800 placeholder:text-slate-300 focus:border-emerald-500 focus:bg-white outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => addManualGoalEntry(goal.id, Number(customGoalAmounts[goal.id]))}
                          disabled={!customGoalAmounts[goal.id] || Number(customGoalAmounts[goal.id]) <= 0}
                          className="py-3.5 px-5 rounded-2xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
                        >
                          Add
                        </button>
                      </div>
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-4">
                        <p className="text-xs font-bold text-slate-500">
                          Progress updates automatically from net savings (income minus expenses) and manual entries.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAnalyzeGoal(goal)}
                          disabled={isThinking}
                          className="w-full py-3.5 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-wait transition-all active:scale-95"
                        >
                          {isThinking ? 'Analyzing...' : 'Analyze Goal'}
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
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <header className="flex items-center gap-6">
              <div className="p-5 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-200">
                <BrainCircuit size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Financial Assistant</h2>
                <p className="text-slate-500 font-bold text-sm">Student Intelligence at work.</p>
              </div>
            </header>

            {isThinking ? (
              <div className="text-center py-24 flex flex-col items-center">
                <div className="relative mb-8">
                   <div className="w-24 h-24 border-8 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                   <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" size={28} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Analyzing your budgeting...</h3>
                <p className="text-slate-400 font-bold text-sm animate-pulse uppercase tracking-[0.2em]">Running Financial Simulations</p>
              </div>
            ) : !aiAdvice ? (
              <Card className="text-center py-20 flex flex-col items-center">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8">
                  <BrainCircuit size={48} className="text-indigo-400" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Want a financial check-up?</h3>
                <p className="text-slate-500 mb-10 max-w-sm font-medium leading-relaxed">Our AI analyzes your spending speed, goal progress, and categories to give you actionable student hacks.</p>
                <button onClick={askCoach} className="bg-indigo-600 text-white px-12 py-5 rounded-3xl font-black shadow-2xl shadow-indigo-200 hover:scale-105 transition-all active:scale-95">Get AI Analysis</button>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className={`p-10 rounded-[2.5rem] shadow-xl border-2 ${aiAdvice.isDebtWarning ? 'bg-rose-50 border-rose-100 text-rose-900' : 'bg-indigo-600 text-white border-transparent'}`}>
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

                <div className="grid grid-cols-1 gap-6">
                  <Card className="border-emerald-100 bg-emerald-50/10">
                    <h4 className="font-black text-emerald-900 mb-6 flex items-center gap-3 text-lg">
                      <ArrowUpCircle size={24} className="text-emerald-500" /> Insight Tips
                    </h4>
                    <ul className="space-y-4">
                      {aiAdvice.tips.map((tip, i) => (
                        <li key={i} className="flex gap-4 text-sm font-bold text-emerald-800 items-start">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-[10px]">
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
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Budget History</h2>
            <BudgetHistory
              strategies={strategyHistory}
              currency={data.profile.currency}
              isLoading={isLoadingHistory}
            />
            <div className="space-y-4">
              {data.notifications.slice(0, 3).map(notif => (
                <Card key={notif.id} className="relative">
                  <div className="flex gap-4 items-center">
                    <div className={`p-3 rounded-2xl shrink-0 ${notif.type === 'alert' ? 'bg-rose-100 text-rose-600' : notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                      {notif.type === 'alert' ? <AlertTriangle size={20} /> : notif.type === 'success' ? <Trophy size={20} /> : <Sparkles size={20} />}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{notif.title}</p>
                      <p className="text-xs font-bold text-slate-500">{notif.message}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Set / Edit budget modal — required when monthly allowance is 0 */}
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
                className="w-full pl-24 pr-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-600 focus:bg-white font-black text-3xl text-slate-800 outline-none"
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            <p className="text-slate-500 text-xs font-bold mt-2 px-1">Your total available spending for the month.</p>
          </div>
          <button
            type="submit"
            className="w-full py-6 bg-indigo-600 text-white font-black text-lg rounded-[2rem] shadow-[0_20px_40px_rgba(79,70,229,0.3)] active:scale-95 transition-all"
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
                className="w-full pl-24 pr-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-600 focus:bg-white font-black text-3xl text-slate-800 outline-none"
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            <p className="text-slate-500 text-xs font-bold mt-2 px-1">
              This updates base monthly budget while preserving existing income entries.
            </p>
          </div>
          <button
            type="submit"
            className="w-full py-6 bg-indigo-600 text-white font-black text-lg rounded-[2rem] shadow-[0_20px_40px_rgba(79,70,229,0.3)] active:scale-95 transition-all"
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
          className="space-y-8"
          noValidate
        >
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Amount</label>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-3xl text-slate-300 transition-colors group-focus-within:text-indigo-600">{data.profile.currency}</span>
              <input 
                name="amount" 
                type="number" 
                step="0.01" 
                required 
                autoFocus 
                className="w-full pl-24 pr-8 py-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-600 focus:bg-white transition-all font-black text-4xl text-slate-800 outline-none" 
                placeholder="0.00"
                inputMode="decimal"
                style={{ touchAction: 'manipulation' }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
             <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Category</label>
               <select 
                 name="category" 
                 className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white font-bold appearance-none outline-none"
                 style={{ touchAction: 'manipulation', WebkitAppearance: 'none', MozAppearance: 'none' }}
                 defaultValue={Category.Food}
                 required
               >
                 {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">What's it for?</label>
               <input 
                 name="description" 
                 type="text" 
                 className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white font-bold outline-none" 
                 placeholder="Lunch at campus..."
                 style={{ touchAction: 'manipulation' }}
               />
             </div>
          </div>
          <button 
            type="submit" 
            className="w-full py-6 bg-indigo-600 text-white font-black text-lg rounded-[2rem] shadow-[0_20px_40px_rgba(79,70,229,0.3)] active:scale-95 transition-all touch-manipulation"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            Add to Budgeting
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
                  <input name="title" type="text" required defaultValue={goalToEdit?.title ?? ''} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 font-bold outline-none" placeholder="New MacBook, Trip to Europe..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Target ({data.profile.currency})</label>
                    <input name="targetAmount" type="number" required defaultValue={goalToEdit?.targetAmount ?? ''} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 font-black outline-none" placeholder="5000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Months</label>
                    <input name="durationMonths" type="number" required defaultValue={goalToEdit?.durationMonths ?? ''} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 font-black outline-none" placeholder="6" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Goal Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center justify-center p-5 border-2 border-slate-100 rounded-[1.5rem] cursor-pointer hover:bg-slate-50 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50 transition-all">
                      <input type="radio" name="type" value={GoalType.ShortTerm} defaultChecked={!goalToEdit || goalToEdit.type === GoalType.ShortTerm} className="hidden" />
                      <span className="text-xs font-black uppercase tracking-widest">Short-term</span>
                    </label>
                    <label className="flex items-center justify-center p-5 border-2 border-slate-100 rounded-[1.5rem] cursor-pointer hover:bg-slate-50 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50 transition-all">
                      <input type="radio" name="type" value={GoalType.LongTerm} defaultChecked={goalToEdit?.type === GoalType.LongTerm} className="hidden" />
                      <span className="text-xs font-black uppercase tracking-widest">Long-term</span>
                    </label>
                  </div>
                </div>
                <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black text-lg rounded-[2rem] shadow-[0_20px_40px_rgba(79,70,229,0.3)] mt-4 active:scale-95 transition-all">{editingGoalId ? 'Save Changes' : 'Unlock Goal'}</button>
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
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-3xl text-slate-300 transition-colors group-focus-within:text-emerald-600">{data.profile.currency}</span>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      autoFocus
                      defaultValue={entryToEdit?.amount ?? ''}
                      className="w-full pl-24 pr-8 py-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-emerald-600 focus:bg-white transition-all font-black text-4xl text-slate-800 outline-none"
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
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-600 focus:bg-white font-bold outline-none"
                    placeholder="Side gig, gift, refund..."
                    style={{ touchAction: 'manipulation' }}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-6 bg-emerald-600 text-white font-black text-lg rounded-[2rem] shadow-[0_20px_40px_rgba(5,150,105,0.3)] active:scale-95 transition-all touch-manipulation"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                >
                  {editingIncomeId ? 'Save changes' : 'Add to available spending'}
                </button>
              </>
            );
          })()}
        </form>
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
          <p className="text-sm font-bold text-slate-500">No analysis available yet.</p>
        ) : (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <Card className="border-indigo-100 bg-indigo-50/40">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Goal</p>
              <h3 className="text-xl font-black text-slate-900">{selectedGoalForAnalysis?.title || goalAnalysis.goalName}</h3>
              <p className="text-sm font-bold text-slate-600 mt-2">
                Required monthly savings: {data.profile.currency}{goalAnalysis.requiredMonthlySavings.toLocaleString()}
              </p>
              <p className="text-xs font-black text-indigo-700 mt-1">Feasibility: {goalAnalysis.feasibilityLevel}</p>
            </Card>
            {goalAnalysis.strategies.map((strategy) => (
              <Card key={strategy.strategyName} className="border border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-black text-slate-900">{strategy.strategyName}</h4>
                      <p className="text-sm font-bold text-slate-500">{strategy.description}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black">
                      {data.profile.currency}{strategy.monthlySavingsRequired.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Steps</p>
                    <ul className="space-y-1">
                      {strategy.stepsToFollow.map((step, index) => (
                        <li key={`${strategy.strategyName}-step-${index}`} className="text-xs font-bold text-slate-700">• {step}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs font-bold text-slate-600"><span className="font-black">Timeline:</span> {strategy.timelineProjection}</p>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Spending adjustments</p>
                    <ul className="space-y-1">
                      {strategy.spendingAdjustments.map((adjustment, index) => (
                        <li key={`${strategy.strategyName}-adj-${index}`} className="text-xs font-bold text-slate-700">• {adjustment}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectStrategy(strategy)}
                    disabled={isSelectingStrategyName !== null}
                    className="w-full py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-wait transition-all"
                  >
                    {isSelectingStrategyName === strategy.strategyName ? 'Saving...' : 'Select Strategy'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>

      {/* Floating Navigation Dock */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/70 backdrop-blur-2xl rounded-full p-2 border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex justify-between items-center z-40 transition-all duration-500">
        <button 
          onClick={() => setActiveTab('dash')} 
          className={`flex-1 py-4 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'dash' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <LayoutDashboard size={22} strokeWidth={activeTab === 'dash' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('goals')} 
          className={`flex-1 py-4 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'goals' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Target size={22} strokeWidth={activeTab === 'goals' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Goals</span>
        </button>
        <button 
          onClick={() => setActiveTab('coach')} 
          className={`flex-1 py-4 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'coach' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <BrainCircuit size={22} strokeWidth={activeTab === 'coach' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Assistant</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={`flex-1 py-4 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Clock size={22} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Budget History</span>
        </button>
      </nav>
    </div>
  );
}

