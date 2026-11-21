import crypto from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import type pg from "pg";
import {
  BILL_LANES,
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  HOUSEHOLD_MEMBERS,
  INITIAL_HOUSEHOLD_STATE,
  PAYMENT_METHODS,
  formatIsoDate,
  formatShortDate,
  validateBillInput,
  validateExpenseInput,
  type BillLane,
  type CategoryBudgets,
  type Expense,
  type ExpenseCategory,
  type ExpenseStatus,
  type HouseholdMember,
  type HouseholdState,
  type PaymentMethod,
  type RecurringBill,
} from "../lib/expenses.ts";
import {
  createSession,
  extractBearerToken,
  hashPassword,
  normalizeEmail,
  requireAuth,
  revokeSession,
  validateCredentials,
  verifyPassword,
  type AuthenticatedRequest,
} from "./auth.ts";
import { ensureSchema, getDatabaseUrl, getPool } from "./db.ts";

interface ExpenseRow {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  payment_method: string;
  member: string;
  status: string;
  notes: string | null;
}

interface BillRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  amount: number;
  category: string;
  due_day: number;
  due_label: string;
  autopay: boolean;
  lane: string;
  provider: string;
  payment_method: string;
  last_paid_date: string | null;
}

function mapExpenseRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    category: row.category as ExpenseCategory,
    date: row.date,
    paymentMethod: row.payment_method as PaymentMethod,
    member: row.member as HouseholdMember,
    status: row.status as ExpenseStatus,
    notes: row.notes ?? undefined,
  };
}

function mapBillRow(row: BillRow): RecurringBill {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    amount: Number(row.amount),
    category: row.category as ExpenseCategory,
    dueDay: Number(row.due_day),
    dueLabel: row.due_label,
    autopay: Boolean(row.autopay),
    lane: row.lane as BillLane,
    provider: row.provider,
    paymentMethod: row.payment_method as PaymentMethod,
    lastPaidDate: row.last_paid_date ?? undefined,
  };
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

async function seedUserHousehold(client: pg.PoolClient, userId: string): Promise<void> {
  await client.query(
    `INSERT INTO household_settings (user_id, monthly_budget, category_budgets)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (user_id) DO UPDATE
       SET monthly_budget = EXCLUDED.monthly_budget,
           category_budgets = EXCLUDED.category_budgets,
           updated_at = NOW()`,
    [
      userId,
      INITIAL_HOUSEHOLD_STATE.monthlyBudget,
      JSON.stringify(INITIAL_HOUSEHOLD_STATE.categoryBudgets),
    ]
  );

  for (const exp of INITIAL_HOUSEHOLD_STATE.expenses) {
    await client.query(
      `INSERT INTO expenses (id, user_id, title, amount, category, date, payment_method, member, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        `${userId}-${exp.id}`,
        userId,
        exp.title,
        exp.amount,
        exp.category,
        exp.date,
        exp.paymentMethod,
        exp.member,
        exp.status,
        exp.notes ?? null,
      ]
    );
  }

  for (const bill of INITIAL_HOUSEHOLD_STATE.bills) {
    await client.query(
      `INSERT INTO recurring_bills (id, user_id, name, description, amount, category, due_day, due_label, autopay, lane, provider, payment_method, last_paid_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        `${userId}-${bill.id}`,
        userId,
        bill.name,
        bill.description,
        bill.amount,
        bill.category,
        bill.dueDay,
        bill.dueLabel,
        bill.autopay,
        bill.lane,
        bill.provider,
        bill.paymentMethod,
        bill.lastPaidDate ?? null,
      ]
    );
  }
}

async function fetchHouseholdForUser(userId: string): Promise<HouseholdState> {
  const pool = getPool();
  const [settingsRes, expensesRes, billsRes] = await Promise.all([
    pool.query<{ monthly_budget: number; category_budgets: CategoryBudgets }>(
      "SELECT monthly_budget, category_budgets FROM household_settings WHERE user_id = $1",
      [userId]
    ),
    pool.query<ExpenseRow>(
      `SELECT id, user_id, title, amount, category, date, payment_method, member, status, notes
       FROM expenses
       WHERE user_id = $1
       ORDER BY date DESC, created_at DESC`,
      [userId]
    ),
    pool.query<BillRow>(
      `SELECT id, user_id, name, description, amount, category, due_day, due_label, autopay, lane, provider, payment_method, last_paid_date
       FROM recurring_bills
       WHERE user_id = $1
       ORDER BY due_day ASC, created_at DESC`,
      [userId]
    ),
  ]);

  const settings = settingsRes.rows[0];
  return {
    monthlyBudget: settings ? Number(settings.monthly_budget) : INITIAL_HOUSEHOLD_STATE.monthlyBudget,
    categoryBudgets: settings
      ? { ...INITIAL_HOUSEHOLD_STATE.categoryBudgets, ...settings.category_budgets }
      : { ...INITIAL_HOUSEHOLD_STATE.categoryBudgets },
    expenses: expensesRes.rows.map(mapExpenseRow),
    bills: billsRes.rows.map(mapBillRow),
  };
}

export function createApiApp(): express.Express {
  const app = express();
  const api = express.Router();

  api.use(express.json({ limit: "1mb" }));

  api.get("/health", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      if (!getDatabaseUrl()) {
        res.json({
          ok: false,
          configured: false,
          error: "Set DATABASE_URL in your environment secrets to connect Neon PostgreSQL.",
        });
        return;
      }
      await ensureSchema();
      await getPool().query("SELECT 1");
      res.json({ ok: true, configured: true });
    } catch (err) {
      next(err);
    }
  });

  api.post("/auth/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as { email?: unknown; password?: unknown; name?: unknown };
      const emailRaw = typeof body.email === "string" ? body.email : "";
      const password = typeof body.password === "string" ? body.password : "";
      const nameRaw = typeof body.name === "string" ? body.name : "";

      const validationError = validateCredentials({
        email: emailRaw,
        password,
        name: nameRaw,
        isRegister: true,
      });
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      await ensureSchema();
      const pool = getPool();
      const email = normalizeEmail(emailRaw);
      const name = nameRaw.trim();

      const existing = await pool.query<{ id: string }>(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      if (existing.rows.length > 0) {
        res.status(409).json({ error: "An account with that email already exists." });
        return;
      }

      const userId = crypto.randomUUID();
      const passwordHash = hashPassword(password);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)",
          [userId, email, name, passwordHash]
        );
        await seedUserHousehold(client, userId);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code?: string }).code === "23505"
        ) {
          res.status(409).json({ error: "An account with that email already exists." });
          return;
        }
        throw err;
      } finally {
        client.release();
      }

      const token = await createSession(userId);
      res.status(201).json({
        token,
        user: { id: userId, email, name },
      });
    } catch (err) {
      next(err);
    }
  });

  api.post("/auth/login", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as { email?: unknown; password?: unknown };
      const emailRaw = typeof body.email === "string" ? body.email : "";
      const password = typeof body.password === "string" ? body.password : "";

      const validationError = validateCredentials({
        email: emailRaw,
        password,
        isRegister: false,
      });
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      await ensureSchema();
      const pool = getPool();
      const email = normalizeEmail(emailRaw);

      const result = await pool.query<{
        id: string;
        email: string;
        name: string;
        password_hash: string;
      }>("SELECT id, email, name, password_hash FROM users WHERE email = $1", [email]);

      const userRow = result.rows[0];
      if (!userRow || !verifyPassword(password, userRow.password_hash)) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      const token = await createSession(userRow.id);
      res.json({
        token,
        user: { id: userRow.id, email: userRow.email, name: userRow.name },
      });
    } catch (err) {
      next(err);
    }
  });

  api.get("/auth/me", requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user });
  });

  api.post("/auth/logout", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractBearerToken(req);
      if (token) {
        await revokeSession(token);
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  api.get("/household", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await ensureSchema();
      const state = await fetchHouseholdForUser(req.user!.id);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  api.put("/household/budgets", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = req.body as { monthlyBudget?: unknown; categoryBudgets?: Record<string, unknown> };
      const monthlyBudget = Number(body.monthlyBudget);
      if (!Number.isFinite(monthlyBudget) || monthlyBudget <= 0 || monthlyBudget > 10_000_000) {
        res.status(400).json({ error: "Monthly household budget must be greater than $0." });
        return;
      }

      const incomingCats = body.categoryBudgets;
      if (!incomingCats || typeof incomingCats !== "object") {
        res.status(400).json({ error: "Category budgets are required." });
        return;
      }

      const cleanCats = {} as CategoryBudgets;
      for (const cat of EXPENSE_CATEGORIES) {
        const val = Number(incomingCats[cat]);
        if (!Number.isFinite(val) || val < 0 || val > 10_000_000) {
          res.status(400).json({ error: `Budget for ${cat} must be $0 or more.` });
          return;
        }
        cleanCats[cat] = Math.round(val);
      }

      const roundedMonthly = Math.round(monthlyBudget);
      await ensureSchema();
      const pool = getPool();
      await pool.query(
        `INSERT INTO household_settings (user_id, monthly_budget, category_budgets, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET monthly_budget = EXCLUDED.monthly_budget,
               category_budgets = EXCLUDED.category_budgets,
               updated_at = NOW()`,
        [req.user!.id, roundedMonthly, JSON.stringify(cleanCats)]
      );

      res.json({ monthlyBudget: roundedMonthly, categoryBudgets: cleanCats });
    } catch (err) {
      next(err);
    }
  });

  api.post("/expenses", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = req.body as Record<string, unknown>;
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const amount = Number(body.amount);
      const date = typeof body.date === "string" ? body.date.trim() : "";
      const category = body.category;
      const paymentMethod = body.paymentMethod;
      const member = body.member;
      const status = body.status;
      const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 400) : null;

      const validationError = validateExpenseInput({ title, amount, date });
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }
      if (title.length > 140) {
        res.status(400).json({ error: "Title must be 140 characters or fewer." });
        return;
      }
      if (!isOneOf(category, EXPENSE_CATEGORIES)) {
        res.status(400).json({ error: "Invalid expense category." });
        return;
      }
      if (!isOneOf(paymentMethod, PAYMENT_METHODS)) {
        res.status(400).json({ error: "Invalid payment method." });
        return;
      }
      if (!isOneOf(member, HOUSEHOLD_MEMBERS)) {
        res.status(400).json({ error: "Invalid household member." });
        return;
      }
      if (!isOneOf(status, EXPENSE_STATUSES)) {
        res.status(400).json({ error: "Invalid expense status." });
        return;
      }

      await ensureSchema();
      const pool = getPool();
      const id = crypto.randomUUID();
      const roundedAmount = Math.round(amount * 100) / 100;

      const result = await pool.query<ExpenseRow>(
        `INSERT INTO expenses (id, user_id, title, amount, category, date, payment_method, member, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, user_id, title, amount, category, date, payment_method, member, status, notes`,
        [id, req.user!.id, title, roundedAmount, category, date, paymentMethod, member, status, notes]
      );

      res.status(201).json({ expense: mapExpenseRow(result.rows[0]) });
    } catch (err) {
      next(err);
    }
  });

  api.put("/expenses/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const expenseId = req.params.id;
      const body = req.body as Record<string, unknown>;
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const amount = Number(body.amount);
      const date = typeof body.date === "string" ? body.date.trim() : "";
      const category = body.category;
      const paymentMethod = body.paymentMethod;
      const member = body.member;
      const status = body.status;
      const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 400) : null;

      const validationError = validateExpenseInput({ title, amount, date });
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }
      if (title.length > 140) {
        res.status(400).json({ error: "Title must be 140 characters or fewer." });
        return;
      }
      if (!isOneOf(category, EXPENSE_CATEGORIES)) {
        res.status(400).json({ error: "Invalid expense category." });
        return;
      }
      if (!isOneOf(paymentMethod, PAYMENT_METHODS)) {
        res.status(400).json({ error: "Invalid payment method." });
        return;
      }
      if (!isOneOf(member, HOUSEHOLD_MEMBERS)) {
        res.status(400).json({ error: "Invalid household member." });
        return;
      }
      if (!isOneOf(status, EXPENSE_STATUSES)) {
        res.status(400).json({ error: "Invalid expense status." });
        return;
      }

      await ensureSchema();
      const pool = getPool();
      const roundedAmount = Math.round(amount * 100) / 100;

      const result = await pool.query<ExpenseRow>(
        `UPDATE expenses
         SET title = $3, amount = $4, category = $5, date = $6, payment_method = $7, member = $8, status = $9, notes = $10
         WHERE id = $1 AND user_id = $2
         RETURNING id, user_id, title, amount, category, date, payment_method, member, status, notes`,
        [expenseId, req.user!.id, title, roundedAmount, category, date, paymentMethod, member, status, notes]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Expense not found." });
        return;
      }

      res.json({ expense: mapExpenseRow(result.rows[0]) });
    } catch (err) {
      next(err);
    }
  });

  api.delete("/expenses/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await ensureSchema();
      const pool = getPool();
      const result = await pool.query<{ id: string }>(
        "DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id",
        [req.params.id, req.user!.id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Expense not found." });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  api.post("/bills", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = req.body as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const provider = typeof body.provider === "string" ? body.provider.trim() : "";
      const amount = Number(body.amount);
      const dueDay = Number(body.dueDay);
      const category = body.category;
      const paymentMethod = body.paymentMethod;
      const autopay = Boolean(body.autopay);
      const lane: BillLane = isOneOf(body.lane, BILL_LANES)
        ? body.lane
        : autopay
          ? "Autopay Scheduled"
          : "Due Soon";
      const dueLabel =
        typeof body.dueLabel === "string" && body.dueLabel.trim()
          ? body.dueLabel.trim().slice(0, 60)
          : autopay
            ? `Autopay day ${dueDay}`
            : `Due day ${dueDay}`;
      const description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim().slice(0, 400)
          : `Monthly recurring ${String(category).toLowerCase()} bill from ${provider}.`;

      const validationError = validateBillInput({ name, amount, dueDay, provider });
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }
      if (!isOneOf(category, EXPENSE_CATEGORIES)) {
        res.status(400).json({ error: "Invalid bill category." });
        return;
      }
      if (!isOneOf(paymentMethod, PAYMENT_METHODS)) {
        res.status(400).json({ error: "Invalid payment method." });
        return;
      }

      await ensureSchema();
      const pool = getPool();
      const id = crypto.randomUUID();
      const roundedAmount = Math.round(amount * 100) / 100;

      const result = await pool.query<BillRow>(
        `INSERT INTO recurring_bills (id, user_id, name, description, amount, category, due_day, due_label, autopay, lane, provider, payment_method, last_paid_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL)
         RETURNING id, user_id, name, description, amount, category, due_day, due_label, autopay, lane, provider, payment_method, last_paid_date`,
        [id, req.user!.id, name, description, roundedAmount, category, dueDay, dueLabel, autopay, lane, provider, paymentMethod]
      );

      res.status(201).json({ bill: mapBillRow(result.rows[0]) });
    } catch (err) {
      next(err);
    }
  });

  api.patch("/bills/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const billId = req.params.id;
      const body = req.body as { action?: unknown; paidDate?: unknown; lane?: unknown };
      await ensureSchema();
      const pool = getPool();

      if (body.action === "mark_paid") {
        const paidDate =
          typeof body.paidDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.paidDate)
            ? body.paidDate
            : formatIsoDate(new Date());

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const billLookup = await client.query<BillRow>(
            `SELECT id, user_id, name, description, amount, category, due_day, due_label, autopay, lane, provider, payment_method, last_paid_date
             FROM recurring_bills
             WHERE id = $1 AND user_id = $2
             FOR UPDATE`,
            [billId, req.user!.id]
          );
          const target = billLookup.rows[0];
          if (!target) {
            await client.query("ROLLBACK");
            res.status(404).json({ error: "Bill not found." });
            return;
          }

          const updatedBillRes = await client.query<BillRow>(
            `UPDATE recurring_bills
             SET lane = 'Paid', last_paid_date = $3, due_label = $4
             WHERE id = $1 AND user_id = $2
             RETURNING id, user_id, name, description, amount, category, due_day, due_label, autopay, lane, provider, payment_method, last_paid_date`,
            [billId, req.user!.id, paidDate, `Paid ${formatShortDate(paidDate)}`]
          );

          const expenseId = crypto.randomUUID();
          const addedExpRes = await client.query<ExpenseRow>(
            `INSERT INTO expenses (id, user_id, title, amount, category, date, payment_method, member, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Shared', 'Recurring', 'Logged from recurring bill payment')
             RETURNING id, user_id, title, amount, category, date, payment_method, member, status, notes`,
            [
              expenseId,
              req.user!.id,
              `${target.name} (${target.provider})`,
              target.amount,
              target.category,
              paidDate,
              target.payment_method,
            ]
          );

          await client.query("COMMIT");
          res.json({
            bill: mapBillRow(updatedBillRes.rows[0]),
            addedExpense: mapExpenseRow(addedExpRes.rows[0]),
          });
          return;
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
      }

      if (isOneOf(body.lane, BILL_LANES)) {
        const result = await pool.query<BillRow>(
          `UPDATE recurring_bills
           SET lane = $3
           WHERE id = $1 AND user_id = $2
           RETURNING id, user_id, name, description, amount, category, due_day, due_label, autopay, lane, provider, payment_method, last_paid_date`,
          [billId, req.user!.id, body.lane]
        );
        if (result.rows.length === 0) {
          res.status(404).json({ error: "Bill not found." });
          return;
        }
        res.json({ bill: mapBillRow(result.rows[0]) });
        return;
      }

      res.status(400).json({ error: "Unsupported bill update." });
    } catch (err) {
      next(err);
    }
  });

  api.delete("/bills/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await ensureSchema();
      const pool = getPool();
      const result = await pool.query<{ id: string }>(
        "DELETE FROM recurring_bills WHERE id = $1 AND user_id = $2 RETURNING id",
        [req.params.id, req.user!.id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Bill not found." });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  api.post("/household/reset", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await ensureSchema();
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM expenses WHERE user_id = $1", [req.user!.id]);
        await client.query("DELETE FROM recurring_bills WHERE user_id = $1", [req.user!.id]);
        await seedUserHousehold(client, req.user!.id);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      const state = await fetchHouseholdForUser(req.user!.id);
      res.json({ state });
    } catch (err) {
      next(err);
    }
  });

  api.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "API route not found." });
  });

  app.use("/api", api);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("DATABASE_URL is not configured")) {
      res.status(503).json({ error: "Database connection is not configured." });
      return;
    }
    console.error("[API error]", message);
    res.status(500).json({ error: "Unexpected server error. Please try again." });
  });

  return app;
}
