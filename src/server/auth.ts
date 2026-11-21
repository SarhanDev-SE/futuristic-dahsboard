import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { ensureSchema, getPool } from "./db.ts";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  sessionToken?: string;
}

const SESSION_TTL_DAYS = 7;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateCredentials(input: {
  email: string;
  password: string;
  name?: string;
  isRegister: boolean;
}): string | null {
  const email = normalizeEmail(input.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Please enter a valid email address.";
  }
  if (!input.password || input.password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (input.password.length > 128) {
    return "Password must be 128 characters or fewer.";
  }
  if (input.isRegister) {
    const name = (input.name ?? "").trim();
    if (!name || name.length < 2) {
      return "Please enter your name (at least 2 characters).";
    }
    if (name.length > 80) {
      return "Name must be 80 characters or fewer.";
    }
  }
  return null;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const expected = Buffer.from(keyHex, "hex");
    const actual = crypto.scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  await ensureSchema();
  const pool = getPool();
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    [tokenHash, userId, expiresAt.toISOString()]
  );
  return token;
}

export async function revokeSession(token: string): Promise<void> {
  await ensureSchema();
  const pool = getPool();
  const tokenHash = hashSessionToken(token);
  await pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
}

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  if (!token) return null;
  await ensureSchema();
  const pool = getPool();
  const tokenHash = hashSessionToken(token);
  const result = await pool.query<{ id: string; email: string; name: string; expires_at: Date }>(
    `SELECT u.id, u.email, u.name, s.expires_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1`,
    [tokenHash]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name };
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    const user = await getUserFromToken(token);
    if (!user) {
      res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
      return;
    }
    req.user = user;
    req.sessionToken = token;
    next();
  } catch (err) {
    next(err);
  }
}
