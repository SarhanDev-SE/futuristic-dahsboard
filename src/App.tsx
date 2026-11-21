import { useCallback, useEffect, useState } from "react";
import { AuthScreen } from "./components/ui/auth-screen";
import GlassyDashboard from "./components/ui/glassy-dashboard";
import {
  ApiError,
  fetchHousehold,
  logoutUser,
  type AuthSession,
} from "./lib/api";
import type { HouseholdState } from "./lib/expenses";

function useWorkspaceTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      if (html.classList.contains("dark") || html.dataset.theme === "dark") setDark(true);
      else if (html.classList.contains("light") || html.dataset.theme === "light") setDark(false);
      else setDark(preferred.matches);
    };
    const changes = new MutationObserver(update);
    changes.observe(html, { attributes: true, attributeFilter: ["class", "data-theme"] });
    preferred.addEventListener("change", update);
    update();
    return () => {
      changes.disconnect();
      preferred.removeEventListener("change", update);
    };
  }, []);

  return dark;
}

export default function App() {
  const dark = useWorkspaceTheme();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [household, setHousehold] = useState<HouseholdState | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadForSession = useCallback(async (activeSession: AuthSession) => {
    setLoading(true);
    setLoadError(null);
    try {
      const state = await fetchHousehold(activeSession.token);
      setHousehold(state);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSession(null);
        setHousehold(null);
        return;
      }
      setLoadError(err instanceof Error ? err.message : "Failed to load household ledger.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAuthenticated = (newSession: AuthSession) => {
    setSession(newSession);
    void loadForSession(newSession);
  };

  const handleSignOut = () => {
    const activeToken = session?.token;
    setSession(null);
    setHousehold(null);
    setLoadError(null);
    if (activeToken) {
      void logoutUser(activeToken);
    }
  };

  if (!session) {
    return (
      <AuthScreen
        initialTheme={dark ? "dark" : "light"}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  if (loading || !household) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          background: dark ? "#2a201c" : "#e8d7c6",
          color: dark ? "#fff6e9" : "#25201e",
          fontFamily: '"Manrope Variable", Manrope, system-ui, sans-serif',
        }}
      >
        <div
          className="max-w-md w-full rounded-3xl p-8 text-center shadow-xl border"
          style={{
            background: dark ? "rgba(47, 36, 34, 0.85)" : "rgba(250, 242, 232, 0.85)",
            borderColor: dark ? "rgba(255, 236, 212, 0.25)" : "rgba(74, 49, 33, 0.16)",
          }}
        >
          <h1 className="text-xl font-bold tracking-tight">
            {loadError ? "Could not open your ledger" : "Opening your household ledger..."}
          </h1>
          <p className="mt-2 text-sm opacity-80">
            {loadError
              ? loadError
              : `Syncing ${session.user.name}'s expenses and recurring bills.`}
          </p>
          {loadError && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-full text-xs font-bold cursor-pointer"
                style={{
                  background: dark ? "#f3ddca" : "#261e1b",
                  color: dark ? "#231a16" : "#fffaf5",
                }}
                onClick={() => void loadForSession(session)}
              >
                Retry
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-full text-xs font-bold border cursor-pointer"
                style={{ borderColor: "currentColor" }}
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <GlassyDashboard
      workspaceName="HEARTH"
      panelFrost={12}
      initialTheme={dark ? "dark" : "light"}
      authUser={session.user}
      apiToken={session.token}
      initialHouseholdState={household}
      onSignOut={handleSignOut}
    />
  );
}
