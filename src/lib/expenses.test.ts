import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_HOUSEHOLD_STATE,
  buildCsvContent,
  buildSpendingSeries,
  computeCategoryBreakdown,
  computeMonthlyCategoryHealth,
  computePeriodSummary,
  filterExpensesByPeriod,
  markBillPaidInState,
  validateBillInput,
  validateExpenseInput,
} from "./expenses";

const REF_DATE = "2026-11-21";

test("filterExpensesByPeriod includes exact inclusive day window", () => {
  const seven = filterExpensesByPeriod(INITIAL_HOUSEHOLD_STATE.expenses, "7 days", REF_DATE);
  assert.ok(seven.length > 0);
  for (const e of seven) {
    assert.ok(e.date >= "2026-11-15" && e.date <= "2026-11-21", `Unexpected date ${e.date}`);
  }
  const thirty = filterExpensesByPeriod(INITIAL_HOUSEHOLD_STATE.expenses, "30 days", REF_DATE);
  assert.ok(thirty.length >= seven.length);
  for (const e of thirty) {
    assert.ok(e.date >= "2026-10-23" && e.date <= "2026-11-21", `Unexpected 30d date ${e.date}`);
  }
});

test("computePeriodSummary sums essentials, discretionary, and payment methods accurately", () => {
  const summary = computePeriodSummary(
    INITIAL_HOUSEHOLD_STATE.expenses,
    "30 days",
    INITIAL_HOUSEHOLD_STATE.monthlyBudget,
    REF_DATE
  );
  const sumMethods = summary.byPaymentMethod.reduce((acc, m) => acc + m.value, 0);
  assert.ok(Math.abs(summary.essentialSpent + summary.discretionarySpent - summary.totalSpent) < 0.01);
  assert.ok(Math.abs(sumMethods - summary.totalSpent) < 0.01);
  assert.equal(summary.periodBudget, 4800);
  assert.ok(summary.spendDelta !== undefined);
});

test("buildSpendingSeries produces 7 buckets matching period total", () => {
  const series7 = buildSpendingSeries(INITIAL_HOUSEHOLD_STATE.expenses, "7 days", 4800, REF_DATE);
  assert.equal(series7.length, 7);
  const sevenSum = series7.reduce((acc, b) => acc + b.total, 0);
  const summary7 = computePeriodSummary(INITIAL_HOUSEHOLD_STATE.expenses, "7 days", 4800, REF_DATE);
  assert.ok(Math.abs(sevenSum - summary7.totalSpent) < 0.01);

  const series30 = buildSpendingSeries(INITIAL_HOUSEHOLD_STATE.expenses, "30 days", 4800, REF_DATE);
  const thirtySum = series30.reduce((acc, b) => acc + b.total, 0);
  const summary30 = computePeriodSummary(INITIAL_HOUSEHOLD_STATE.expenses, "30 days", 4800, REF_DATE);
  assert.ok(Math.abs(thirtySum - summary30.totalSpent) < 0.01);
});

test("computeMonthlyCategoryHealth flags Over Budget and Near Limit correctly", () => {
  const customBudgets = {
    ...INITIAL_HOUSEHOLD_STATE.categoryBudgets,
    Groceries: 400, // Nov groceries > 400
    "Dining & Coffee": 220, // Nov dining ~201 -> >85% Near Limit
  };
  const health = computeMonthlyCategoryHealth(INITIAL_HOUSEHOLD_STATE.expenses, customBudgets, REF_DATE);
  const groceries = health.find((h) => h.category === "Groceries");
  const dining = health.find((h) => h.category === "Dining & Coffee");
  assert.equal(groceries?.status, "Over Budget");
  assert.equal(dining?.status, "Near Limit");
});

test("computeCategoryBreakdown sorts descending by spend", () => {
  const breakdown = computeCategoryBreakdown(INITIAL_HOUSEHOLD_STATE.expenses, "30 days", REF_DATE);
  assert.ok(breakdown.length > 0);
  for (let i = 1; i < breakdown.length; i++) {
    assert.ok(breakdown[i - 1].spent >= breakdown[i].spent);
  }
});

test("markBillPaidInState moves bill to Paid and adds expense record", () => {
  const beforeCount = INITIAL_HOUSEHOLD_STATE.expenses.length;
  const next = markBillPaidInState(INITIAL_HOUSEHOLD_STATE, "BILL-101", REF_DATE);
  assert.equal(next.expenses.length, beforeCount + 1);
  assert.equal(next.expenses[0].status, "Recurring");
  assert.equal(next.expenses[0].amount, 94);
  const updatedBill = next.bills.find((b) => b.id === "BILL-101");
  assert.equal(updatedBill?.lane, "Paid");
  assert.equal(updatedBill?.lastPaidDate, REF_DATE);
});

test("validation rejects invalid expense and bill inputs", () => {
  assert.ok(validateExpenseInput({ title: "  ", amount: "12", date: "2026-11-21" }) !== null);
  assert.ok(validateExpenseInput({ title: "Milk", amount: "-5", date: "2026-11-21" }) !== null);
  assert.equal(validateExpenseInput({ title: "Milk", amount: "5.50", date: "2026-11-21" }), null);

  assert.ok(validateBillInput({ name: "Water", amount: "50", dueDay: "35", provider: "City" }) !== null);
  assert.equal(validateBillInput({ name: "Water", amount: "50", dueDay: "15", provider: "City" }), null);
});

test("buildCsvContent escapes embedded quotes safely", () => {
  const csv = buildCsvContent([
    ["Title", "Amount"],
    ['Joe\'s "Best" Market', 42.5],
  ]);
  assert.equal(csv, '"Title","Amount"\r\n"Joe\'s ""Best"" Market","42.5"');
});
