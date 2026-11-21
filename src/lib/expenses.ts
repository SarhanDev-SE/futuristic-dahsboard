export const EXPENSE_CATEGORIES = [
  "Housing & Utilities",
  "Groceries",
  "Dining & Coffee",
  "Transport",
  "Home & Maintenance",
  "Health & Personal",
  "Subscriptions",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_METHODS = ["Checking", "Household Card", "Shared Cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const HOUSEHOLD_MEMBERS = ["Shared", "Alex", "Sam"] as const;
export type HouseholdMember = (typeof HOUSEHOLD_MEMBERS)[number];

export const EXPENSE_STATUSES = ["Cleared", "Pending", "Recurring"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const PERIODS = ["7 days", "30 days", "90 days"] as const;
export type Period = (typeof PERIODS)[number];

export const BILL_LANES = ["Due Soon", "Autopay Scheduled", "Paid", "Overdue"] as const;
export type BillLane = (typeof BILL_LANES)[number];

export type ChartTone = "coral" | "ink" | "teal" | "ochre";

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  member: HouseholdMember;
  status: ExpenseStatus;
  notes?: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  dueDay: number; // 1-31
  dueLabel: string;
  autopay: boolean;
  lane: BillLane;
  provider: string;
  paymentMethod: PaymentMethod;
  lastPaidDate?: string;
}

export type CategoryBudgets = Record<ExpenseCategory, number>;

export interface HouseholdState {
  monthlyBudget: number;
  categoryBudgets: CategoryBudgets;
  expenses: Expense[];
  bills: RecurringBill[];
}

export const CATEGORY_TONES: Record<ExpenseCategory, ChartTone> = {
  "Housing & Utilities": "ink",
  "Groceries": "teal",
  "Dining & Coffee": "coral",
  "Transport": "ochre",
  "Home & Maintenance": "coral",
  "Health & Personal": "teal",
  "Subscriptions": "ink",
};

export const ESSENTIAL_CATEGORIES: ReadonlySet<ExpenseCategory> = new Set([
  "Housing & Utilities",
  "Groceries",
  "Transport",
  "Health & Personal",
]);

export function isEssentialCategory(category: ExpenseCategory): boolean {
  return ESSENTIAL_CATEGORIES.has(category);
}

export function periodDays(period: Period): number {
  if (period === "7 days") return 7;
  if (period === "30 days") return 30;
  return 90;
}

export function parseIsoDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function formatIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysIso(dateStr: string, deltaDays: number): string {
  const date = parseIsoDate(dateStr);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return formatIsoDate(date);
}

export function formatShortDate(dateStr: string): string {
  const date = parseIsoDate(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatWeekday(dateStr: string): string {
  const date = parseIsoDate(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

export function getReferenceDate(expenses: Expense[], fallback = "2026-11-21"): string {
  if (expenses.length === 0) return fallback;
  let latest = fallback;
  for (const exp of expenses) {
    if (exp.date > latest) latest = exp.date;
  }
  return latest;
}

export function filterExpensesByPeriod(
  expenses: Expense[],
  period: Period,
  referenceDate: string
): Expense[] {
  const days = periodDays(period);
  const start = addDaysIso(referenceDate, -(days - 1));
  return expenses
    .filter((e) => e.date >= start && e.date <= referenceDate)
    .sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
}

export function filterPriorPeriodExpenses(
  expenses: Expense[],
  period: Period,
  referenceDate: string
): Expense[] {
  const days = periodDays(period);
  const currentStart = addDaysIso(referenceDate, -(days - 1));
  const priorEnd = addDaysIso(currentStart, -1);
  const priorStart = addDaysIso(priorEnd, -(days - 1));
  return expenses.filter((e) => e.date >= priorStart && e.date <= priorEnd);
}

export function computeSpendDeltaPercent(currentTotal: number, priorTotal: number): string | undefined {
  if (priorTotal <= 0) return undefined;
  const pct = ((currentTotal - priorTotal) / priorTotal) * 100;
  const abs = Math.abs(pct).toFixed(1);
  if (pct < 0) return `−${abs}%`;
  return `+${abs}%`;
}

export interface PeriodSummary {
  totalSpent: number;
  essentialSpent: number;
  discretionarySpent: number;
  transactionCount: number;
  dailyAverage: number;
  periodBudget: number;
  remainingBudget: number;
  budgetUsedPercent: number;
  spendDelta?: string;
  deltaIsIncrease: boolean;
  byPaymentMethod: { label: PaymentMethod; value: number }[];
}

export function computePeriodSummary(
  expenses: Expense[],
  period: Period,
  monthlyBudget: number,
  referenceDate: string
): PeriodSummary {
  const current = filterExpensesByPeriod(expenses, period, referenceDate);
  const prior = filterPriorPeriodExpenses(expenses, period, referenceDate);
  const days = periodDays(period);

  let totalSpent = 0;
  let essentialSpent = 0;
  let discretionarySpent = 0;
  const methodTotals: Record<PaymentMethod, number> = {
    Checking: 0,
    "Household Card": 0,
    "Shared Cash": 0,
  };

  for (const item of current) {
    totalSpent += item.amount;
    if (isEssentialCategory(item.category)) {
      essentialSpent += item.amount;
    } else {
      discretionarySpent += item.amount;
    }
    methodTotals[item.paymentMethod] = (methodTotals[item.paymentMethod] || 0) + item.amount;
  }

  const priorTotal = prior.reduce((sum, e) => sum + e.amount, 0);
  const spendDelta = computeSpendDeltaPercent(totalSpent, priorTotal);
  const periodBudget = Math.round((monthlyBudget * days) / 30);
  const remainingBudget = periodBudget - totalSpent;
  const budgetUsedPercent = periodBudget > 0 ? (totalSpent / periodBudget) * 100 : 0;

  return {
    totalSpent,
    essentialSpent,
    discretionarySpent,
    transactionCount: current.length,
    dailyAverage: totalSpent / days,
    periodBudget,
    remainingBudget,
    budgetUsedPercent,
    spendDelta,
    deltaIsIncrease: totalSpent > priorTotal,
    byPaymentMethod: PAYMENT_METHODS.map((label) => ({ label, value: methodTotals[label] })),
  };
}

export interface SeriesBucket {
  label: string;
  essential: number;
  discretionary: number;
  total: number;
  budgetPace: number;
}

export function buildSpendingSeries(
  expenses: Expense[],
  period: Period,
  monthlyBudget: number,
  referenceDate: string
): SeriesBucket[] {
  const days = periodDays(period);
  const bucketCount = 7;
  const start = addDaysIso(referenceDate, -(days - 1));
  const dailyBudget = monthlyBudget / 30;

  if (period === "7 days") {
    const buckets: SeriesBucket[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDaysIso(start, i);
      const dayExpenses = expenses.filter((e) => e.date === day);
      let essential = 0;
      let discretionary = 0;
      for (const e of dayExpenses) {
        if (isEssentialCategory(e.category)) essential += e.amount;
        else discretionary += e.amount;
      }
      buckets.push({
        label: formatWeekday(day),
        essential,
        discretionary,
        total: essential + discretionary,
        budgetPace: Math.round(dailyBudget),
      });
    }
    return buckets;
  }

  const step = Math.ceil(days / bucketCount);
  const buckets: SeriesBucket[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = addDaysIso(start, i * step);
    const rawEnd = addDaysIso(start, (i + 1) * step - 1);
    const bucketEnd = rawEnd > referenceDate ? referenceDate : rawEnd;
    if (bucketStart > referenceDate) break;
    const bucketDays =
      Math.round((parseIsoDate(bucketEnd).getTime() - parseIsoDate(bucketStart).getTime()) / 86400000) + 1;
    let essential = 0;
    let discretionary = 0;
    for (const e of expenses) {
      if (e.date >= bucketStart && e.date <= bucketEnd) {
        if (isEssentialCategory(e.category)) essential += e.amount;
        else discretionary += e.amount;
      }
    }
    buckets.push({
      label: formatShortDate(bucketEnd),
      essential,
      discretionary,
      total: essential + discretionary,
      budgetPace: Math.round(dailyBudget * bucketDays),
    });
  }
  return buckets;
}

export interface CategoryBreakdownItem {
  category: ExpenseCategory;
  spent: number;
  percentOfTotal: number;
  tone: ChartTone;
}

export function computeCategoryBreakdown(
  expenses: Expense[],
  period: Period,
  referenceDate: string
): CategoryBreakdownItem[] {
  const current = filterExpensesByPeriod(expenses, period, referenceDate);
  const totals = new Map<ExpenseCategory, number>();
  let grandTotal = 0;

  for (const e of current) {
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    grandTotal += e.amount;
  }

  return Array.from(totals.entries())
    .map(([category, spent]) => ({
      category,
      spent,
      percentOfTotal: grandTotal > 0 ? Math.round((spent / grandTotal) * 100) : 0,
      tone: CATEGORY_TONES[category],
    }))
    .sort((a, b) => b.spent - a.spent);
}

export type BudgetStatus = "On Track" | "Near Limit" | "Over Budget";

export interface CategoryBudgetHealth {
  category: ExpenseCategory;
  limit: number;
  spent: number;
  remaining: number;
  utilizationPercent: number;
  status: BudgetStatus;
  tone: ChartTone;
}

export function computeMonthlyCategoryHealth(
  expenses: Expense[],
  categoryBudgets: CategoryBudgets,
  referenceDate: string
): CategoryBudgetHealth[] {
  const monthPrefix = referenceDate.slice(0, 7); // YYYY-MM
  const spentMap = new Map<ExpenseCategory, number>();
  for (const e of expenses) {
    if (e.date.startsWith(monthPrefix)) {
      spentMap.set(e.category, (spentMap.get(e.category) ?? 0) + e.amount);
    }
  }

  return EXPENSE_CATEGORIES.map((category) => {
    const limit = Math.max(0, categoryBudgets[category] ?? 0);
    const spent = spentMap.get(category) ?? 0;
    const remaining = limit - spent;
    const utilizationPercent = limit > 0 ? (spent / limit) * 100 : spent > 0 ? 100 : 0;
    let status: BudgetStatus = "On Track";
    if (utilizationPercent >= 100) status = "Over Budget";
    else if (utilizationPercent >= 85) status = "Near Limit";

    return {
      category,
      limit,
      spent,
      remaining,
      utilizationPercent,
      status,
      tone: CATEGORY_TONES[category],
    };
  });
}

export function computeCurrentMonthTotal(expenses: Expense[], referenceDate: string): number {
  const monthPrefix = referenceDate.slice(0, 7);
  return expenses
    .filter((e) => e.date.startsWith(monthPrefix))
    .reduce((sum, e) => sum + e.amount, 0);
}

export function validateExpenseInput(input: {
  title: string;
  amount: string | number;
  date: string;
}): string | null {
  if (!input.title.trim()) return "Please enter an expense title or merchant.";
  const num = typeof input.amount === "number" ? input.amount : Number(input.amount);
  if (!Number.isFinite(num) || num <= 0) return "Amount must be greater than $0.";
  if (num > 1_000_000) return "Amount looks unusually high. Please verify.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return "Please choose a valid date.";
  return null;
}

export function validateBillInput(input: {
  name: string;
  amount: string | number;
  dueDay: string | number;
  provider: string;
}): string | null {
  if (!input.name.trim()) return "Please enter a bill name.";
  if (!input.provider.trim()) return "Please enter a provider or payee.";
  const num = typeof input.amount === "number" ? input.amount : Number(input.amount);
  if (!Number.isFinite(num) || num <= 0) return "Amount must be greater than $0.";
  const day = typeof input.dueDay === "number" ? input.dueDay : Number(input.dueDay);
  if (!Number.isInteger(day) || day < 1 || day > 31) return "Due day must be between 1 and 31.";
  return null;
}

export function markBillPaidInState(
  state: HouseholdState,
  billId: string,
  paidDate: string
): HouseholdState {
  const target = state.bills.find((b) => b.id === billId);
  if (!target) return state;

  const updatedBills = state.bills.map((b) =>
    b.id === billId
      ? { ...b, lane: "Paid" as BillLane, lastPaidDate: paidDate }
      : b
  );

  const newExpense: Expense = {
    id: `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: `${target.name} (${target.provider})`,
    amount: target.amount,
    category: target.category,
    date: paidDate,
    paymentMethod: target.paymentMethod,
    member: "Shared",
    status: "Recurring",
    notes: "Logged from recurring bill payment",
  };

  return {
    ...state,
    bills: updatedBills,
    expenses: [newExpense, ...state.expenses],
  };
}

export function escapeCsvCell(cell: string | number): string {
  const str = String(cell);
  return `"${str.replaceAll('"', '""')}"`;
}

export function buildCsvContent(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export const INITIAL_HOUSEHOLD_STATE: HouseholdState = {
  monthlyBudget: 4800,
  categoryBudgets: {
    "Housing & Utilities": 2200,
    "Groceries": 780,
    "Dining & Coffee": 420,
    "Transport": 360,
    "Home & Maintenance": 450,
    "Health & Personal": 320,
    "Subscriptions": 270,
  },
  expenses: [
    // Current month (Nov 2026, up to Nov 21)
    { id: "EXP-314", title: "Whole Foods Market", amount: 168.40, category: "Groceries", date: "2026-11-21", paymentMethod: "Household Card", member: "Alex", status: "Cleared", notes: "Weekly produce & pantry restock" },
    { id: "EXP-313", title: "Blue Bottle Coffee", amount: 18.50, category: "Dining & Coffee", date: "2026-11-20", paymentMethod: "Household Card", member: "Sam", status: "Cleared" },
    { id: "EXP-312", title: "ConEd Electric & Gas", amount: 164.00, category: "Housing & Utilities", date: "2026-11-19", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
    { id: "EXP-311", title: "Shell Fuel Station", amount: 58.20, category: "Transport", date: "2026-11-18", paymentMethod: "Household Card", member: "Alex", status: "Cleared" },
    { id: "EXP-310", title: "Home Depot Hardware", amount: 124.80, category: "Home & Maintenance", date: "2026-11-17", paymentMethod: "Household Card", member: "Sam", status: "Cleared", notes: "Weatherstripping & furnace filters" },
    { id: "EXP-309", title: "Trader Joe's", amount: 134.15, category: "Groceries", date: "2026-11-16", paymentMethod: "Household Card", member: "Shared", status: "Cleared" },
    { id: "EXP-308", title: "Osteria Neighborhood Dinner", amount: 96.00, category: "Dining & Coffee", date: "2026-11-15", paymentMethod: "Household Card", member: "Shared", status: "Cleared" },
    { id: "EXP-307", title: "CVS Pharmacy", amount: 44.90, category: "Health & Personal", date: "2026-11-14", paymentMethod: "Checking", member: "Alex", status: "Cleared" },
    { id: "EXP-306", title: "Fiber Home Internet", amount: 79.00, category: "Subscriptions", date: "2026-11-12", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
    { id: "EXP-305", title: "Farmers Market Produce", amount: 62.00, category: "Groceries", date: "2026-11-10", paymentMethod: "Shared Cash", member: "Sam", status: "Cleared" },
    { id: "EXP-304", title: "Bistro Lunch", amount: 48.50, category: "Dining & Coffee", date: "2026-11-09", paymentMethod: "Household Card", member: "Alex", status: "Cleared" },
    { id: "EXP-303", title: "City Transit Pass", amount: 85.00, category: "Transport", date: "2026-11-07", paymentMethod: "Checking", member: "Sam", status: "Recurring" },
    { id: "EXP-302", title: "Oakwood Mortgage", amount: 1850.00, category: "Housing & Utilities", date: "2026-11-01", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
    { id: "EXP-301", title: "Aldi Weekly Run", amount: 142.30, category: "Groceries", date: "2026-11-03", paymentMethod: "Household Card", member: "Shared", status: "Cleared" },
    { id: "EXP-300", title: "Family Streaming Bundle", amount: 34.99, category: "Subscriptions", date: "2026-11-05", paymentMethod: "Household Card", member: "Shared", status: "Recurring" },
    { id: "EXP-299", title: "Dental Copay", amount: 110.00, category: "Health & Personal", date: "2026-11-06", paymentMethod: "Checking", member: "Sam", status: "Cleared" },
    { id: "EXP-298", title: "Plumbing Inspection", amount: 195.00, category: "Home & Maintenance", date: "2026-11-04", paymentMethod: "Checking", member: "Shared", status: "Pending" },
    { id: "EXP-297", title: "Roastery Beans & Pastries", amount: 38.00, category: "Dining & Coffee", date: "2026-11-02", paymentMethod: "Shared Cash", member: "Alex", status: "Cleared" },

    // October 2026 (prior 30d & within 90d window)
    { id: "EXP-292", title: "Trader Joe's", amount: 128.50, category: "Groceries", date: "2026-10-31", paymentMethod: "Household Card", member: "Shared", status: "Cleared" },
    { id: "EXP-291", title: "Blue Bottle Coffee", amount: 22.00, category: "Dining & Coffee", date: "2026-10-30", paymentMethod: "Household Card", member: "Alex", status: "Cleared" },
    { id: "EXP-290", title: "Shell Fuel Station", amount: 54.00, category: "Transport", date: "2026-10-29", paymentMethod: "Household Card", member: "Alex", status: "Cleared" },
    { id: "EXP-289", title: "Whole Foods Market", amount: 174.00, category: "Groceries", date: "2026-10-28", paymentMethod: "Household Card", member: "Alex", status: "Cleared" },
    { id: "EXP-288", title: "Sushi Takeout", amount: 84.00, category: "Dining & Coffee", date: "2026-10-25", paymentMethod: "Household Card", member: "Shared", status: "Cleared" },
    { id: "EXP-287", title: "ConEd Electric & Gas", amount: 152.00, category: "Housing & Utilities", date: "2026-10-19", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
    { id: "EXP-286", title: "Trader Joe's", amount: 149.00, category: "Groceries", date: "2026-10-15", paymentMethod: "Household Card", member: "Sam", status: "Cleared" },
    { id: "EXP-285", title: "Auto Insurance", amount: 148.00, category: "Transport", date: "2026-10-12", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
    { id: "EXP-284", title: "Garden Mulch & Tools", amount: 112.00, category: "Home & Maintenance", date: "2026-10-08", paymentMethod: "Household Card", member: "Sam", status: "Cleared" },
    { id: "EXP-283", title: "Oakwood Mortgage", amount: 1850.00, category: "Housing & Utilities", date: "2026-10-01", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
    { id: "EXP-282", title: "Fiber Home Internet", amount: 79.00, category: "Subscriptions", date: "2026-10-12", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
    { id: "EXP-281", title: "Primary Care Visit", amount: 75.00, category: "Health & Personal", date: "2026-10-05", paymentMethod: "Checking", member: "Alex", status: "Cleared" },
    { id: "EXP-280", title: "Neighborhood Bistro", amount: 92.00, category: "Dining & Coffee", date: "2026-10-18", paymentMethod: "Household Card", member: "Shared", status: "Cleared" },
    { id: "EXP-279", title: "Municipal Water & Trash", amount: 94.00, category: "Housing & Utilities", date: "2026-10-24", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
    { id: "EXP-278", title: "Aldi Pantry Stock", amount: 138.00, category: "Groceries", date: "2026-10-21", paymentMethod: "Household Card", member: "Shared", status: "Cleared" },
    { id: "EXP-277", title: "CVS Pharmacy", amount: 39.50, category: "Health & Personal", date: "2026-10-16", paymentMethod: "Checking", member: "Sam", status: "Cleared" },
    { id: "EXP-276", title: "HOA Grounds Fee", amount: 135.00, category: "Home & Maintenance", date: "2026-10-28", paymentMethod: "Checking", member: "Shared", status: "Recurring" },

    // September 2026 (within 90d window)
    { id: "EXP-275", title: "Neighborhood Bistro", amount: 88.00, category: "Dining & Coffee", date: "2026-09-27", paymentMethod: "Household Card", member: "Shared", status: "Cleared" },
    { id: "EXP-274", title: "Whole Foods Market", amount: 162.00, category: "Groceries", date: "2026-09-24", paymentMethod: "Household Card", member: "Shared", status: "Cleared" },
    { id: "EXP-273", title: "ConEd Electric & Gas", amount: 189.00, category: "Housing & Utilities", date: "2026-09-19", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
    { id: "EXP-272", title: "HVAC Fall Tune-Up", amount: 220.00, category: "Home & Maintenance", date: "2026-09-14", paymentMethod: "Checking", member: "Shared", status: "Cleared" },
    { id: "EXP-271", title: "Auto Insurance", amount: 148.00, category: "Transport", date: "2026-09-12", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
    { id: "EXP-270", title: "Oakwood Mortgage", amount: 1850.00, category: "Housing & Utilities", date: "2026-09-01", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
    { id: "EXP-269", title: "Trader Joe's", amount: 158.00, category: "Groceries", date: "2026-09-08", paymentMethod: "Household Card", member: "Alex", status: "Cleared" },
    { id: "EXP-268", title: "Fiber Home Internet", amount: 79.00, category: "Subscriptions", date: "2026-09-12", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
    { id: "EXP-267", title: "HOA Grounds Fee", amount: 135.00, category: "Home & Maintenance", date: "2026-09-28", paymentMethod: "Checking", member: "Shared", status: "Recurring" },
  ],
  bills: [
    {
      id: "BILL-101",
      name: "Municipal Water & Trash",
      description: "Quarterly municipal water, sewer, and curbside recycling cycle.",
      amount: 94.00,
      category: "Housing & Utilities",
      dueDay: 24,
      dueLabel: "Due Nov 24",
      autopay: false,
      lane: "Due Soon",
      provider: "City Water",
      paymentMethod: "Checking",
    },
    {
      id: "BILL-102",
      name: "Auto Insurance Policy",
      description: "Two-driver household vehicle coverage renewal.",
      amount: 148.00,
      category: "Transport",
      dueDay: 26,
      dueLabel: "Due Nov 26",
      autopay: false,
      lane: "Due Soon",
      provider: "Progressive",
      paymentMethod: "Household Card",
    },
    {
      id: "BILL-103",
      name: "HOA Grounds Fee",
      description: "Monthly shared courtyard & exterior maintenance assessment.",
      amount: 135.00,
      category: "Home & Maintenance",
      dueDay: 28,
      dueLabel: "Autopay Nov 28",
      autopay: true,
      lane: "Autopay Scheduled",
      provider: "Maple HOA",
      paymentMethod: "Checking",
    },
    {
      id: "BILL-104",
      name: "Cloud Backup & Music",
      description: "Family 2TB photo archive and lossless audio plan.",
      amount: 24.99,
      category: "Subscriptions",
      dueDay: 29,
      dueLabel: "Autopay Nov 29",
      autopay: true,
      lane: "Autopay Scheduled",
      provider: "Apple One",
      paymentMethod: "Household Card",
    },
    {
      id: "BILL-105",
      name: "Oakwood Mortgage",
      description: "Fixed 30-year principal, interest, and property escrow.",
      amount: 1850.00,
      category: "Housing & Utilities",
      dueDay: 1,
      dueLabel: "Paid Nov 1",
      autopay: true,
      lane: "Paid",
      provider: "Oakwood Bank",
      paymentMethod: "Checking",
      lastPaidDate: "2026-11-01",
    },
    {
      id: "BILL-106",
      name: "ConEd Electric & Gas",
      description: "Home heating and electricity meter statement.",
      amount: 164.00,
      category: "Housing & Utilities",
      dueDay: 19,
      dueLabel: "Paid Nov 19",
      autopay: true,
      lane: "Paid",
      provider: "ConEd",
      paymentMethod: "Checking",
      lastPaidDate: "2026-11-19",
    },
    {
      id: "BILL-107",
      name: "Pest & Lawn Care",
      description: "Seasonal yard treatment invoice waiting on manual confirmation.",
      amount: 65.00,
      category: "Home & Maintenance",
      dueDay: 15,
      dueLabel: "Past due Nov 15",
      autopay: false,
      lane: "Overdue",
      provider: "GreenScape",
      paymentMethod: "Household Card",
    },
  ],
};
