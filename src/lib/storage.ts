import { INITIAL_HOUSEHOLD_STATE, type HouseholdState } from "./expenses";

const STORAGE_KEY = "hearth-home-expenses-v1";

export function loadHouseholdState(): HouseholdState {
  if (typeof window === "undefined") return INITIAL_HOUSEHOLD_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_HOUSEHOLD_STATE;
    const parsed = JSON.parse(raw) as Partial<HouseholdState>;
    if (
      !parsed ||
      typeof parsed.monthlyBudget !== "number" ||
      !Array.isArray(parsed.expenses) ||
      !Array.isArray(parsed.bills) ||
      !parsed.categoryBudgets
    ) {
      return INITIAL_HOUSEHOLD_STATE;
    }
    return {
      monthlyBudget: parsed.monthlyBudget,
      categoryBudgets: {
        ...INITIAL_HOUSEHOLD_STATE.categoryBudgets,
        ...parsed.categoryBudgets,
      },
      expenses: parsed.expenses,
      bills: parsed.bills,
    };
  } catch {
    return INITIAL_HOUSEHOLD_STATE;
  }
}

export function saveHouseholdState(state: HouseholdState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota issues silently
  }
}

export function resetHouseholdState(): HouseholdState {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  return INITIAL_HOUSEHOLD_STATE;
}
