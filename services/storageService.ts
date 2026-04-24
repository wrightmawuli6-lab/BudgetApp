
import { BudgetState, Category, GoalType } from '../types';

const STORAGE_KEY_PREFIX = 'budgeting_app_data';

function getStorageKey(userEmail?: string): string {
  return userEmail ? `${STORAGE_KEY_PREFIX}_${encodeURIComponent(userEmail)}` : STORAGE_KEY_PREFIX;
}

const DEFAULT_STATE: BudgetState = {
  profile: {
    name: 'Student Explorer',
    monthlyAllowance: 0,
    currency: 'GH₵'
  },
  expenses: [],
  goals: [],
  streak: 0,
  notifications: [],
  incomeEntries: []
};

function migrateIncomeEntries(loaded: Record<string, unknown>): BudgetState['incomeEntries'] {
  if (Array.isArray(loaded.incomeEntries) && loaded.incomeEntries.length > 0) {
    return loaded.incomeEntries as BudgetState['incomeEntries'];
  }
  const legacy = Number(loaded.extraIncome);
  if (legacy > 0) {
    return [{ id: 'legacy-' + Date.now(), amount: legacy, source: 'Extra income', date: new Date().toISOString() }];
  }
  return [];
}

export const storageService = {
  saveData: (data: BudgetState, userEmail?: string) => {
    localStorage.setItem(getStorageKey(userEmail), JSON.stringify(data));
  },
  loadData: (userEmail?: string): BudgetState => {
    const saved = localStorage.getItem(getStorageKey(userEmail));
    if (saved) {
      try {
        const loaded = JSON.parse(saved) as Record<string, unknown>;
        const incomeEntries = migrateIncomeEntries(loaded);
        return { ...DEFAULT_STATE, ...loaded, incomeEntries };
      } catch (e) {
        return DEFAULT_STATE;
      }
    }
    return DEFAULT_STATE;
  }
};
