import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Home,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  TriangleAlert,
} from "lucide-react";
import "@fontsource-variable/manrope";
import {
  checkHealth,
  loginUser,
  registerUser,
  type AuthSession,
} from "../../lib/api";

const DEFAULT_HOME_BACKDROP = "/src/assets/images/warm_home_backdrop_1795280407979.jpg";

const authStyles = `
.ha-app {
  --ha-ink: #25201e;
  --ha-muted: #423731;
  --ha-line: rgb(74 49 33 / 16%);
  --ha-rim: rgb(255 253 246 / 54%);
  --ha-edge-light: rgb(255 254 247 / 86%);
  --ha-edge-shade: rgb(57 40 28 / 19%);
  --ha-gloss: rgb(255 251 242 / 46%);
  --ha-frame: rgb(247 234 219 / 30%);
  --ha-card: rgb(250 242 232 / 64%);
  --ha-raised: rgb(255 249 243 / 88%);
  --ha-inner: rgb(255 250 245 / 54%);
  --ha-surface: #f6ece2;
  --ha-primary: #261e1b;
  --ha-primary-ink: #fffaf5;
  --ha-coral: #a43c27;
  --ha-teal: #09644f;
  --ha-focus: #194b48;
  --ha-shadow: 35 21 14;
  position: relative;
  isolation: isolate;
  min-block-size: 100svh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 24px clamp(16px, 4vw, 48px);
  color: var(--ha-ink);
  color-scheme: light;
  font-family: "Manrope Variable", Manrope, system-ui, sans-serif;
  font-size: 13px;
  font-weight: 550;
}
.ha-app[data-theme="dark"] {
  --ha-ink: #fff6e9;
  --ha-muted: #e5d5c7;
  --ha-line: rgb(243 221 198 / 20%);
  --ha-rim: rgb(255 236 212 / 32%);
  --ha-edge-light: rgb(255 242 225 / 46%);
  --ha-edge-shade: rgb(11 6 5 / 32%);
  --ha-gloss: rgb(255 237 213 / 14%);
  --ha-frame: rgb(42 31 29 / 60%);
  --ha-card: rgb(47 36 34 / 72%);
  --ha-raised: rgb(80 67 61 / 86%);
  --ha-inner: rgb(78 61 56 / 58%);
  --ha-surface: #3b302c;
  --ha-primary: #f3ddca;
  --ha-primary-ink: #231a16;
  --ha-coral: #ff9177;
  --ha-teal: #75dac0;
  --ha-focus: #f9bf9b;
  --ha-shadow: 10 4 3;
  color-scheme: dark;
}
.ha-app *, .ha-app *::before, .ha-app *::after { box-sizing: border-box; }
.ha-app :where(button, input) { color: inherit; font: inherit; }
.ha-app :where(button, input):focus-visible { outline: 2px solid var(--ha-focus); outline-offset: 2px; }
.ha-bg, .ha-app::before {
  position: fixed;
  inset: 0;
  z-index: -2;
  inline-size: 100%;
  block-size: 100%;
  pointer-events: none;
}
.ha-bg {
  object-fit: cover;
  object-position: center 60%;
  filter: sepia(.18) saturate(.82) brightness(.86);
}
.ha-app[data-theme="dark"] .ha-bg {
  filter: sepia(.15) saturate(.75) brightness(.52);
}
.ha-app::before {
  content: "";
  z-index: -1;
  background: linear-gradient(116deg, rgb(73 48 37 / 34%), transparent 45%, rgb(162 101 63 / 22%) 78%, transparent 100%),
    linear-gradient(0deg, rgb(53 33 25 / 36%), transparent 58%);
}
.ha-topbar {
  inline-size: min(100%, 1080px);
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--ha-rim);
  background: linear-gradient(165deg, var(--ha-gloss), transparent 36%), var(--ha-frame);
  box-shadow: inset 1px 1px 1px var(--ha-edge-light), 0 8px 24px rgb(var(--ha-shadow) / 16%);
  backdrop-filter: blur(14px) saturate(1.3);
  -webkit-backdrop-filter: blur(14px) saturate(1.3);
}
.ha-brand { display: flex; align-items: center; gap: 10px; }
.ha-logo {
  inline-size: 36px;
  block-size: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--ha-raised);
  color: var(--ha-ink);
  box-shadow: inset 0 0 0 1px var(--ha-gloss), 0 2px 8px rgb(var(--ha-shadow) / 12%);
}
.ha-logo svg { width: 18px; height: 18px; }
.ha-brand strong { display: block; font-size: 12px; letter-spacing: .17em; font-weight: 850; line-height: 1.1; }
.ha-brand small { display: block; margin-top: 2px; font-size: 10px; color: var(--ha-muted); }
.ha-icon-btn {
  min-inline-size: 42px;
  min-block-size: 42px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid var(--ha-line);
  background: var(--ha-inner);
  cursor: pointer;
}
.ha-icon-btn:hover { background: var(--ha-raised); }
.ha-icon-btn svg { width: 17px; height: 17px; }

.ha-main {
  display: grid;
  place-items: center;
  padding-block: 24px;
}
.ha-shell {
  inline-size: min(100%, 920px);
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
  border-radius: 32px;
  border: 1px solid var(--ha-rim);
  background: linear-gradient(148deg, var(--ha-gloss), transparent 24%), var(--ha-frame);
  box-shadow: inset 1px 1px 1px var(--ha-edge-light), inset -1px -1px 1px var(--ha-edge-shade),
    0 24px 68px rgb(var(--ha-shadow) / 24%);
  backdrop-filter: blur(14px) saturate(1.24);
  -webkit-backdrop-filter: blur(14px) saturate(1.24);
}
.ha-story {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  padding: clamp(20px, 3vw, 32px);
  border-radius: 22px;
  border: 1px solid var(--ha-rim);
  background: radial-gradient(ellipse at 5% -20%, #3a9381, transparent 68%), linear-gradient(145deg, #1e7461, #08443a);
  color: #fffaf5;
  box-shadow: inset 0 1px 2px rgb(214 252 240 / 42%), 0 10px 26px rgb(19 78 64 / 22%);
}
.ha-story h1 {
  margin: 0;
  font-size: clamp(28px, 3.2vw, 40px);
  line-height: 1.04;
  letter-spacing: -.05em;
  font-weight: 780;
  text-wrap: balance;
}
.ha-story p {
  margin: 12px 0 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: #e4f5ef;
}
.ha-points {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ha-points li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgb(255 255 255 / 11%);
  font-size: 12px;
  font-weight: 680;
  color: #f4fbf8;
}
.ha-points svg { width: 16px; height: 16px; flex: none; color: #b8f1dd; }

.ha-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(20px, 3vw, 30px);
  border-radius: 22px;
  border: 1px solid var(--ha-rim);
  background: var(--ha-card);
  box-shadow: inset 0 1px 1px var(--ha-edge-light), 0 8px 24px rgb(var(--ha-shadow) / 10%);
}
.ha-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid var(--ha-line);
  background: var(--ha-inner);
  margin-bottom: 18px;
}
.ha-tabs button {
  min-block-size: 38px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: 12px;
  font-weight: 780;
  cursor: pointer;
}
.ha-tabs button[aria-pressed="true"] {
  background: var(--ha-primary);
  color: var(--ha-primary-ink);
}
.ha-card h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 820;
  letter-spacing: -.04em;
}
.ha-sub {
  margin: 6px 0 16px;
  color: var(--ha-muted);
  font-size: 12.5px;
}
.ha-form { display: grid; gap: 12px; }
.ha-field { display: grid; gap: 5px; }
.ha-field > span { font-size: 11px; font-weight: 760; color: var(--ha-muted); }
.ha-field input {
  inline-size: 100%;
  min-block-size: 42px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--ha-line);
  background: var(--ha-raised);
  font-size: 13px;
}
.ha-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--ha-coral) 14%, var(--ha-raised));
  color: var(--ha-coral);
  font-size: 12px;
  font-weight: 740;
}
.ha-error svg { width: 15px; height: 15px; flex: none; }
.ha-submit {
  margin-top: 4px;
  min-block-size: 44px;
  padding: 0 18px;
  border-radius: 999px;
  border: 0;
  background: var(--ha-primary);
  color: var(--ha-primary-ink);
  font-size: 12.5px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}
.ha-submit:disabled { opacity: .65; cursor: not-allowed; }
.ha-submit svg { width: 15px; height: 15px; }
.ha-footer {
  inline-size: min(100%, 1080px);
  margin-inline: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.ha-footer span {
  border-radius: 999px;
  padding: 5px 11px;
  font-size: 10.5px;
  font-weight: 740;
  color: var(--ha-ink);
  background: var(--ha-raised);
  border: 1px solid var(--ha-rim);
}
@media (max-width: 780px) {
  .ha-shell { grid-template-columns: 1fr; }
}
`;

export function AuthScreen({
  initialTheme = "light",
  onAuthenticated,
}: {
  initialTheme?: "light" | "dark";
  onAuthenticated: (session: AuthSession) => void;
}) {
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
  useEffect(() => setTheme(initialTheme), [initialTheme]);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dbWarning, setDbWarning] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    checkHealth().then((health) => {
      if (!active) return;
      if (!health.ok) {
        setDbWarning(
          health.error || "Database connection is not configured in server environment."
        );
      } else {
        setDbWarning(null);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const switchMode = (nextMode: "login" | "register") => {
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode === "register" && name.trim().length < 2) {
      setError("Please enter your name (at least 2 characters).");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const session =
        mode === "register"
          ? await registerUser({ name: name.trim(), email: trimmedEmail, password })
          : await loginUser({ email: trimmedEmail, password });
      onAuthenticated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ha-app" data-theme={theme}>
      <style>{authStyles}</style>
      <img
        className="ha-bg"
        src={DEFAULT_HOME_BACKDROP}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
      />
      <header className="ha-topbar">
        <div className="ha-brand">
          <span className="ha-logo" aria-hidden="true">
            <Home aria-hidden="true" />
          </span>
          <div>
            <strong>HEARTH</strong>
            <small>Home Expenses</small>
          </div>
        </div>
        <button
          type="button"
          className="ha-icon-btn"
          aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
        </button>
      </header>

      <main className="ha-main">
        <div className="ha-shell">
          <section className="ha-story">
            <div>
              <h1>Keep every household expense, budget, and bill in one calm ledger.</h1>
              <p>
                Sign in to access your private household budget, log daily spending, and track
                upcoming recurring bills backed by PostgreSQL.
              </p>
            </div>
            <ul className="ha-points">
              <li>
                <ShieldCheck aria-hidden="true" />
                <span>Private per-account budgets, expenses, and recurring bills</span>
              </li>
              <li>
                <Lock aria-hidden="true" />
                <span>Salted scrypt password hashing &amp; verified server sessions</span>
              </li>
            </ul>
          </section>

          <section className="ha-card" aria-label="Account authentication">
            <div className="ha-tabs" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                aria-pressed={mode === "login"}
                onClick={() => switchMode("login")}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                aria-pressed={mode === "register"}
                onClick={() => switchMode("register")}
              >
                Create account
              </button>
            </div>

            <h2>{mode === "login" ? "Welcome back" : "Create your household"}</h2>
            <p className="ha-sub">
              {mode === "login"
                ? "Enter your email and password to open your dashboard."
                : "Start with a pre-configured household budget you can customize anytime."}
            </p>

            <form className="ha-form" onSubmit={handleSubmit} noValidate>
              {dbWarning && (
                <p className="ha-error" role="status">
                  <TriangleAlert aria-hidden="true" />
                  <span>{dbWarning}</span>
                </p>
              )}
              {error && (
                <p className="ha-error" role="alert">
                  <TriangleAlert aria-hidden="true" />
                  <span>{error}</span>
                </p>
              )}

              {mode === "register" && (
                <label className="ha-field">
                  <span>Full name</span>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Alex Morgan"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                  />
                </label>
              )}

              <label className="ha-field">
                <span>Email address</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                />
              </label>

              <label className="ha-field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                />
              </label>

              <button type="submit" className="ha-submit" disabled={submitting}>
                <span>
                  {submitting
                    ? mode === "register"
                      ? "Creating account..."
                      : "Signing in..."
                    : mode === "register"
                      ? "Create account"
                      : "Sign in"}
                </span>
                <ArrowRight aria-hidden="true" />
              </button>
            </form>
          </section>
        </div>
      </main>

      <footer className="ha-footer">
        <span>HEARTH Household Ledger</span>
        <span>PostgreSQL-backed authentication</span>
      </footer>
    </div>
  );
}
