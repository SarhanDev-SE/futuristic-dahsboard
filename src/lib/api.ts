import type {
  BillLane,
  CategoryBudgets,
  Expense,
  HouseholdState,
  RecurringBill,
} from "./expenses";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === "string" && payload.error.trim()
        ? payload.error
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function checkHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch("/api/health");
    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok && Boolean(payload?.ok),
      error: typeof payload?.error === "string" ? payload.error : undefined,
    };
  } catch {
    return { ok: false, error: "Unable to reach the Hearth server." };
  }
}

export function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  return requestJson<AuthSession>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  return requestJson<AuthSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logoutUser(token: string): Promise<void> {
  await requestJson<{ ok: boolean }>(
    "/api/auth/logout",
    { method: "POST" },
    token
  ).catch(() => undefined);
}

export function fetchHousehold(token: string): Promise<HouseholdState> {
  return requestJson<HouseholdState>("/api/household", { method: "GET" }, token);
}

export function saveBudgetsApi(
  token: string,
  monthlyBudget: number,
  categoryBudgets: CategoryBudgets
): Promise<{ monthlyBudget: number; categoryBudgets: CategoryBudgets }> {
  return requestJson(
    "/api/household/budgets",
    {
      method: "PUT",
      body: JSON.stringify({ monthlyBudget, categoryBudgets }),
    },
    token
  );
}

export async function createExpenseApi(
  token: string,
  expense: Omit<Expense, "id">
): Promise<Expense> {
  const res = await requestJson<{ expense: Expense }>(
    "/api/expenses",
    {
      method: "POST",
      body: JSON.stringify(expense),
    },
    token
  );
  return res.expense;
}

export async function updateExpenseApi(
  token: string,
  id: string,
  expense: Omit<Expense, "id">
): Promise<Expense> {
  const res = await requestJson<{ expense: Expense }>(
    `/api/expenses/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(expense),
    },
    token
  );
  return res.expense;
}

export async function deleteExpenseApi(token: string, id: string): Promise<void> {
  await requestJson<{ ok: boolean }>(
    `/api/expenses/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    token
  );
}

export async function createBillApi(
  token: string,
  bill: Omit<RecurringBill, "id">
): Promise<RecurringBill> {
  const res = await requestJson<{ bill: RecurringBill }>(
    "/api/bills",
    {
      method: "POST",
      body: JSON.stringify(bill),
    },
    token
  );
  return res.bill;
}

export function markBillPaidApi(
  token: string,
  id: string,
  paidDate: string
): Promise<{ bill: RecurringBill; addedExpense: Expense }> {
  return requestJson(
    `/api/bills/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ action: "mark_paid", paidDate }),
    },
    token
  );
}

export async function updateBillLaneApi(
  token: string,
  id: string,
  lane: BillLane
): Promise<RecurringBill> {
  const res = await requestJson<{ bill: RecurringBill }>(
    `/api/bills/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ lane }),
    },
    token
  );
  return res.bill;
}

export async function deleteBillApi(token: string, id: string): Promise<void> {
  await requestJson<{ ok: boolean }>(
    `/api/bills/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    token
  );
}

export async function resetHouseholdApi(token: string): Promise<HouseholdState> {
  const res = await requestJson<{ state: HouseholdState }>(
    "/api/household/reset",
    { method: "POST" },
    token
  );
  return res.state;
}
