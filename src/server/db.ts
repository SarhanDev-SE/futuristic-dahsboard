import pg from "pg";

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
let schemaReadyPromise: Promise<void> | null = null;

export function getDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL?.trim() || process.env.NEON_DB?.trim() || "";
  return url.length > 0 ? url : null;
}

export function getPool(): pg.Pool {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    });
  }
  return poolInstance;
}

export async function ensureSchema(): Promise<void> {
  const pool = getPool();
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

        CREATE TABLE IF NOT EXISTS household_settings (
          user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          monthly_budget INTEGER NOT NULL,
          category_budgets JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          amount DOUBLE PRECISION NOT NULL,
          category TEXT NOT NULL,
          date TEXT NOT NULL,
          payment_method TEXT NOT NULL,
          member TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);

        CREATE TABLE IF NOT EXISTS recurring_bills (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          amount DOUBLE PRECISION NOT NULL,
          category TEXT NOT NULL,
          due_day INTEGER NOT NULL,
          due_label TEXT NOT NULL,
          autopay BOOLEAN NOT NULL DEFAULT FALSE,
          lane TEXT NOT NULL,
          provider TEXT NOT NULL,
          payment_method TEXT NOT NULL,
          last_paid_date TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_bills_user_id ON recurring_bills(user_id);
      `);
    })().catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }
  return schemaReadyPromise;
}
