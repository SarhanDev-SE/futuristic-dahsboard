"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownRight,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Filter,
  Home,
  LayoutDashboard,
  LogOut,
  Moon,
  Pencil,
  PieChart,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import "@fontsource-variable/manrope";

import {
  BILL_LANES,
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  PERIODS,
  buildCsvContent,
  buildSpendingSeries,
  computeCategoryBreakdown,
  computeCurrentMonthTotal,
  computeMonthlyCategoryHealth,
  computePeriodSummary,
  filterExpensesByPeriod,
  formatShortDate,
  getReferenceDate,
  type BillLane,
  type CategoryBudgets,
  type Expense,
  type ExpenseCategory,
  type HouseholdState,
  type Period,
  type RecurringBill,
} from "../../lib/expenses";
import {
  ApiError,
  createBillApi,
  createExpenseApi,
  deleteBillApi,
  deleteExpenseApi,
  markBillPaidApi,
  resetHouseholdApi,
  saveBudgetsApi,
  updateBillLaneApi,
  updateExpenseApi,
  type AuthUser,
} from "../../lib/api";
import {
  CategoryMixChart,
  Counter,
  Legend,
  SpendingChart,
  StackChart,
  formatCount,
  usd,
  usdExact,
  type CountFormat,
} from "./expense-charts";
import {
  BillDetailDialog,
  BillFormDialog,
  BudgetSettingsDialog,
  ExpenseFormDialog,
  NotificationsDialog,
  QuickSearchDialog,
} from "./expense-dialogs";

export interface GlassyDashboardProps {
  backgroundImage?: string;
  workspaceName?: string;
  panelFrost?: number;
  initialTheme?: "light" | "dark";
  authUser: AuthUser;
  apiToken: string;
  initialHouseholdState: HouseholdState;
  onSignOut: () => void;
}

const DEFAULT_HOME_BACKDROP = "/src/assets/images/warm_home_backdrop_1795280407979.jpg";

const dashboardStyles = `
.gd-app {
  --gd-ink: #25201e;
  --gd-muted: #423731;
  --gd-line: rgb(74 49 33 / 15%);
  --gd-grid: rgb(74 49 33 / 19%);
  --gd-rim: rgb(255 253 246 / 51%);
  --gd-edge-light: rgb(255 254 247 / 84%);
  --gd-edge-shade: rgb(57 40 28 / 19%);
  --gd-gloss: rgb(255 251 242 / 45%);
  --gd-frame: rgb(247 234 219 / 23%);
  --gd-rail: rgb(241 222 206 / 48%);
  --gd-card: rgb(250 242 232 / 46%);
  --gd-card-light: rgb(255 251 245 / 34%);
  --gd-raised: rgb(255 249 243 / 81%);
  --gd-inner: rgb(255 250 245 / 37%);
  --gd-surface: #f6ece2;
  --gd-track: rgb(81 49 32 / 14%);
  --gd-primary: #261e1b;
  --gd-primary-ink: #fffaf5;
  --gd-pick: #fff9f3;
  --gd-pick-ink: #241b17;
  --gd-coral: #a43c27;
  --gd-teal: #09644f;
  --gd-ochre: #996300;
  --gd-graph-ink: #40332d;
  --gd-focus: #194b48;
  --gd-dark-shadow: 35 21 14;
  inline-size: 100%;
  min-inline-size: 0;
  flex: 1 1 100%;
  position: relative;
  isolation: isolate;
  min-block-size: 100svh;
  background: #ab8e76;
  color: var(--gd-ink);
  color-scheme: light;
  font-family: "Manrope Variable", Manrope, system-ui, sans-serif;
  font-size: 13px;
  font-weight: 550;
  font-variant-numeric: tabular-nums;
}
.gd-app[data-theme="dark"] {
  --gd-ink: #fff6e9;
  --gd-muted: #e5d5c7;
  --gd-line: rgb(243 221 198 / 19%);
  --gd-grid: rgb(243 221 198 / 19%);
  --gd-rim: rgb(255 236 212 / 31%);
  --gd-edge-light: rgb(255 242 225 / 49%);
  --gd-edge-shade: rgb(11 6 5 / 30%);
  --gd-gloss: rgb(255 237 213 / 13%);
  --gd-frame: rgb(42 31 29 / 52%);
  --gd-rail: rgb(45 32 30 / 59%);
  --gd-card: rgb(47 36 34 / 53%);
  --gd-card-light: rgb(106 88 81 / 30%);
  --gd-raised: rgb(80 67 61 / 82%);
  --gd-inner: rgb(78 61 56 / 49%);
  --gd-surface: #3b302c;
  --gd-track: rgb(245 226 212 / 16%);
  --gd-primary: #f3ddca;
  --gd-primary-ink: #231a16;
  --gd-pick: #f9eee0;
  --gd-pick-ink: #241b17;
  --gd-coral: #ff9177;
  --gd-teal: #75dac0;
  --gd-ochre: #f1be58;
  --gd-graph-ink: #e7d9cd;
  --gd-focus: #f9bf9b;
  --gd-dark-shadow: 10 4 3;
  background: #40322b;
  color-scheme: dark;
}

.gd-app *, .gd-app *::before, .gd-app *::after { box-sizing: border-box; }
.gd-app :where(button, input, select) { color: inherit; font: inherit; }
.gd-app :where(button, a, input, select):focus-visible { outline: 2px solid var(--gd-focus); outline-offset: 3px; }
.gd-app a { color: inherit; text-decoration: none; }
.gd-app button { cursor: pointer; }
.gd-app :where(h1, h2, h3, p, figure) { margin: 0; }
.gd-app svg { flex: none; }
.gd-sr { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

.gd-background, .gd-app::before {
  position: fixed;
  z-index: -2;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  pointer-events: none;
}
.gd-background {
  object-fit: cover;
  object-position: center 60%;
  filter: sepia(.18) saturate(.82) brightness(.88);
}
.gd-app::before {
  content: "";
  z-index: -1;
  background: linear-gradient(116deg, rgb(73 48 37 / 32%), transparent 43%, rgb(162 101 63 / 22%) 76%, transparent 100%),
    linear-gradient(0deg, rgb(53 33 25 / 32%), transparent 58%);
}
.gd-app[data-theme="dark"] .gd-background { filter: sepia(.15) saturate(.75) brightness(.55); }
.gd-surround {
  inline-size: min(calc(100% - 100px), 1380px);
  margin-inline: auto;
  padding-block: 24px 8px;
}
.gd-top, .gd-dock {
  border: 1px solid var(--gd-rim);
  background: linear-gradient(165deg, var(--gd-gloss), transparent 32% 73%, var(--gd-gloss)), var(--gd-rail);
  box-shadow: inset 1px 1px 1px var(--gd-edge-light), inset -1px -1px 1px var(--gd-edge-shade),
    inset 0 -2px 5px var(--gd-gloss), 0 7px 20px rgb(var(--gd-dark-shadow) / 17%);
  backdrop-filter: blur(15px) saturate(1.35);
  -webkit-backdrop-filter: blur(15px) saturate(1.35);
}
.gd-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 400px) minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-block-size: 60px;
  border-radius: 999px;
  padding: 6px 9px 6px 13px;
}
.gd-brand { display: flex; align-items: center; gap: 10px; min-inline-size: 0; padding-inline-start: 3px; }
.gd-logo {
  inline-size: 35px; block-size: 35px; display: grid; place-items: center;
  border-radius: 50%; background: var(--gd-pick); color: var(--gd-pick-ink);
  box-shadow: inset 0 0 0 1px var(--gd-gloss), 0 2px 7px rgb(var(--gd-dark-shadow) / 12%);
}
.gd-logo svg { width: 18px; height: 18px; }
.gd-brand strong { display: block; font-size: 12px; letter-spacing: .17em; line-height: 1.1; font-weight: 850; }
.gd-brand small { display: block; margin-block-start: 3px; font-size: 10px; color: var(--gd-muted); }
.gd-ask {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-block-size: 43px;
  max-inline-size: 100%;
  border: 1px solid var(--gd-line);
  border-radius: 999px;
  background: var(--gd-inner);
  box-shadow: inset 0 1px 0 var(--gd-gloss);
  padding: 4px 13px 4px 9px;
  text-align: start;
}
.gd-ask:hover, .gd-icon-button:hover { background: var(--gd-raised); }
.gd-orb {
  flex: none;
  inline-size: 25px;
  block-size: 25px;
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 32% 24%, #faf7fe 5%, #72ecf1 25%, transparent 58%),
    radial-gradient(ellipse at 67% 54%, #e1b7f9, #815add 55%, #353467 79%);
  box-shadow: inset 0 0 0 .75px rgb(246 245 255 / 75%), inset 0 -2px 5px #604db4, 0 0 0 3px rgb(91 70 115 / 13%), 0 2px 8px rgb(71 46 113 / 35%);
}
.gd-prompt {
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  font-size: 12px; font-weight: 750;
  animation: gd-prompt-in .74s steps(28, end) both;
}
@keyframes gd-prompt-in { from { clip-path: inset(0 100% 0 0); } }
.gd-ask-search { margin-inline-start: auto; width: 15px; height: 15px; color: var(--gd-muted); }
.gd-top-actions { display: flex; justify-content: flex-end; align-items: center; gap: 6px; min-inline-size: 0; }
.gd-user-name {
  max-inline-size: 132px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
  font-weight: 760;
  color: var(--gd-muted);
  padding-inline: 6px;
}
.gd-signout-btn {
  display: inline-flex; align-items: center; gap: 6px;
  min-block-size: 40px; padding: 0 12px;
  border-radius: 999px; border: 1px solid var(--gd-line);
  background: var(--gd-inner); font-size: 11.5px; font-weight: 780;
  white-space: nowrap;
}
.gd-signout-btn:hover { background: var(--gd-raised); }
.gd-signout-btn svg { width: 14px; height: 14px; }
.gd-sync-error {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-block-end: 14px; padding: 10px 14px; border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--gd-coral) 34%, transparent);
  background: color-mix(in srgb, var(--gd-coral) 14%, var(--gd-surface));
  color: var(--gd-coral); font-size: 12px; font-weight: 760;
}
.gd-sync-error-msg { display: inline-flex; align-items: center; gap: 8px; }
.gd-sync-error svg { width: 15px; height: 15px; flex: none; }
.gd-icon-button {
  position: relative; min-inline-size: 44px; min-block-size: 44px; display: inline-grid; place-items: center;
  border-radius: 999px; border: 1px solid var(--gd-line); padding: 0; background: var(--gd-inner);
}
.gd-icon-button svg { width: 17px; height: 17px; stroke-width: 1.75; }
.gd-notices { background: var(--gd-raised); }
.gd-notice-count {
  position: absolute; top: 5px; right: 5px; min-inline-size: 16px; block-size: 16px;
  border-radius: 999px; background: var(--gd-coral); color: #fffaf5;
  font-size: 9px; font-weight: 850; display: grid; place-items: center; padding-inline: 4px;
  box-shadow: 0 0 0 2px var(--gd-surface);
}

.gd-stage-wrap { position: relative; margin-block: 11px 0; }
.gd-stage {
  color: var(--gd-ink);
  border: 1px solid var(--gd-rim);
  border-radius: 34px;
  background:
    linear-gradient(148deg, var(--gd-gloss), transparent 19% 77%, color-mix(in srgb, var(--gd-gloss) 48%, transparent)),
    var(--gd-frame);
  box-shadow: inset 1px 1px 1px var(--gd-edge-light), inset -1px -1px 1px var(--gd-edge-shade),
    inset 0 0 7px var(--gd-gloss),
    0 1px 3px rgb(var(--gd-dark-shadow) / 17%), 0 22px 72px rgb(var(--gd-dark-shadow) / 22%);
  backdrop-filter: blur(var(--gd-panel-frost, 12px)) saturate(1.24);
  -webkit-backdrop-filter: blur(var(--gd-panel-frost, 12px)) saturate(1.24);
}
.gd-stage-scroll {
  block-size: max(605px, min(865px, calc(100svh - 165px)));
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--gd-line) transparent;
  border-radius: inherit;
  padding: clamp(19px, 2.15vw, 35px) clamp(25px, 3.2vw, 49px) 41px;
}
.gd-view-head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 12px 22px;
  margin-block-end: 19px;
}
.gd-view-head h1 {
  font-size: clamp(29px, 3.35vw, 49px);
  font-weight: 760;
  line-height: 1.03;
  letter-spacing: -.062em;
  text-wrap: balance;
}
.gd-view-head p { color: var(--gd-muted); font-size: 13px; margin-block-start: 8px; }
.gd-view-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.gd-period {
  display: inline-flex; align-items: center; padding: 3px; border-radius: 999px;
  border: 1px solid var(--gd-rim); background: var(--gd-inner);
  box-shadow: inset 0 1px 0 var(--gd-gloss);
}
.gd-period button {
  min-block-size: 35px; min-inline-size: 56px; border: 0; border-radius: 999px; background: transparent;
  padding: 0 11px; font-size: 11px; font-weight: 750; white-space: nowrap;
}
.gd-period button[aria-pressed="true"] { background: var(--gd-primary); color: var(--gd-primary-ink); }
.gd-period button[aria-pressed="false"]:hover { background: var(--gd-inner); }

.gd-primary, .gd-secondary, .gd-danger-btn {
  display: inline-flex; justify-content: center; align-items: center; gap: 7px;
  min-block-size: 40px; padding: 7px 14px;
  font-size: 11.5px; font-weight: 790; line-height: 1.2; border-radius: 999px;
  border: 1px solid transparent; white-space: nowrap; flex-shrink: 0;
}
.gd-primary { background: var(--gd-primary); color: var(--gd-primary-ink); }
.gd-secondary { background: var(--gd-raised); border-color: var(--gd-rim); color: var(--gd-ink); }
.gd-danger-btn {
  background: color-mix(in srgb, var(--gd-coral) 14%, var(--gd-inner));
  border-color: color-mix(in srgb, var(--gd-coral) 32%, transparent);
  color: var(--gd-coral);
}
.gd-primary:hover { filter: brightness(1.14); }
.gd-secondary:hover { background: var(--gd-surface); }
.gd-danger-btn:hover { background: color-mix(in srgb, var(--gd-coral) 22%, var(--gd-inner)); }
.gd-primary svg, .gd-secondary svg, .gd-danger-btn svg { width: 14px; height: 14px; }
.gd-small-btn {
  display: inline-flex; align-items: center; gap: 5px; min-block-size: 32px; padding: 4px 10px;
  border-radius: 999px; border: 1px solid var(--gd-line); background: var(--gd-inner);
  font-size: 11px; font-weight: 760; white-space: nowrap;
}
.gd-small-btn:hover { background: var(--gd-raised); }
.gd-small-btn svg { width: 12px; height: 12px; }
.gd-export { white-space: nowrap; }
.gd-content { min-inline-size: 0; }
.gd-analytics, .gd-command-grid, .gd-command-side, .gd-summary, .gd-metric-grid, .gd-analytics-grid { display: grid; gap: 12px; }
.gd-command-grid { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr) minmax(0, 1.05fr); align-items: stretch; }
.gd-command-side { grid-column: 1; align-content: start; }
.gd-command-grid > .gd-activity { grid-column: 2 / -1; }
.gd-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; padding: 6px; }
.gd-analytics-grid { grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr); }
.gd-metric-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }

.gd-panel, .gd-metric, .gd-summary {
  min-inline-size: 0;
  border: 1px solid var(--gd-rim);
  border-radius: 20px;
  background: linear-gradient(144deg, var(--gd-card-light), transparent 66%), var(--gd-card);
  box-shadow: inset 0 1px 1px var(--gd-edge-light), inset 0 -1px 1px var(--gd-edge-shade), 0 6px 18px rgb(var(--gd-dark-shadow) / 9%);
}
.gd-summary { border-radius: 20px; background: var(--gd-inner); }
.gd-summary .gd-metric { border-radius: 15px; }
.gd-panel { padding: 15px 16px; }
.gd-panel-head {
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start;
  gap: 7px 12px; margin-block-end: 12px;
}
.gd-panel-head h2 { font-size: 14px; font-weight: 810; letter-spacing: -.024em; }
.gd-panel-head p { font-size: 11px; color: var(--gd-muted); margin-block-start: 3px; }
.gd-metric { display: flex; flex-direction: column; justify-content: space-between; min-block-size: 112px; padding: 11px 12px; }
.gd-metric[data-tone="teal"] {
  --gd-coral: #ffc8b8;
  --gd-teal: #b8f1dd;
  --gd-muted: #e4f5ef;
  color: #fff;
  border-color: rgb(196 248 231 / 55%);
  background: radial-gradient(ellipse at 5% -20%, #3a9381, transparent 68%), linear-gradient(145deg, #1e7461, #08443a);
  box-shadow: inset 0 1px 2px rgb(214 252 240 / 45%), 0 6px 14px rgb(19 78 64 / 17%);
}
.gd-metric-head { display: flex; justify-content: space-between; align-items: center; gap: 4px; min-inline-size: 0; font-size: 11px; font-weight: 740; }
.gd-metric-icon, .gd-list-icon {
  display: grid; place-items: center; flex: none; color: inherit;
  inline-size: 28px; block-size: 28px; border-radius: 10px;
  background: var(--gd-inner); box-shadow: inset 0 1px 0 var(--gd-gloss);
}
.gd-metric-icon svg, .gd-list-icon svg { width: 14px; height: 14px; }
.gd-metric[data-tone="teal"] .gd-metric-icon { background: rgb(235 255 247 / 16%); }
.gd-metric-value { display: block; font-size: clamp(22px, 2.35vw, 35px); line-height: 1.05; margin-block: 3px 7px; letter-spacing: -.052em; font-weight: 815; }
.gd-summary .gd-metric-value { font-size: clamp(20px, 2vw, 31px); }
.gd-metric-caption, .gd-balance-change { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; color: var(--gd-muted); font-size: 10px; font-weight: 680; }
.gd-delta {
  display: inline-flex; align-items: center; gap: 2px; color: var(--gd-teal); font-weight: 850;
  border-radius: 6px; padding: 2px 4px;
  background: color-mix(in srgb, var(--gd-teal) 12%, transparent);
}
.gd-delta[data-attention="true"] { color: var(--gd-coral); background: color-mix(in srgb, var(--gd-coral) 11%, transparent); }
.gd-delta svg { width: 11px; height: 11px; stroke-width: 2.4; }

.gd-balance .gd-panel-head { align-items: center; margin-block-end: 9px; }
.gd-unit { border-radius: 6px; padding: 4px 6px; background: var(--gd-raised); font-size: 10px; font-weight: 810; }
.gd-balance-number { font-size: clamp(28px, 3.85vw, 57px); font-weight: 820; letter-spacing: -.077em; line-height: 1.02; }
.gd-balance-change { margin-block-start: 7px; }
.gd-balance-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-block: 13px 12px; }
.gd-streams { display: flex; border-radius: 12px; background: var(--gd-inner); padding: 8px 2px; }
.gd-streams div { flex: 1; min-inline-size: 0; padding: 0 7px; }
.gd-streams div + div { border-inline-start: 1px solid var(--gd-line); }
.gd-streams span, .gd-streams strong { display: block; }
.gd-streams span { font-size: 9px; color: var(--gd-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gd-streams strong { font-size: 11px; font-weight: 810; margin-block-start: 4px; }
.gd-capacity .gd-panel-head, .gd-approvals .gd-panel-head { margin-block-end: 10px; }
.gd-capacity-track, .gd-mix-track { display: block; height: 7px; border-radius: 999px; overflow: hidden; background: var(--gd-track); }
.gd-capacity-track .gd-fill { display: block; block-size: 100%; border-radius: inherit; background: var(--gd-teal); transform-origin: left center; }
.gd-capacity-track .gd-fill[data-status="Near Limit"] { background: var(--gd-ochre); }
.gd-capacity-track .gd-fill[data-status="Over Budget"] { background: var(--gd-coral); }
.gd-capacity-label { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px; color: var(--gd-muted); font-size: 10px; margin-top: 8px; }
.gd-capacity-label strong { color: var(--gd-ink); }
.gd-approval-content { display: flex; align-items: center; gap: 9px; min-inline-size: 0; }
.gd-approval-content .gd-list-icon { inline-size: 37px; block-size: 37px; color: var(--gd-teal); background: color-mix(in srgb, var(--gd-teal) 12%, var(--gd-inner)); }
.gd-approval-content div { flex: 1; min-inline-size: 0; }
.gd-approval-content strong, .gd-approval-content small { display: block; }
.gd-approval-content strong { font-size: 12px; font-weight: 810; }
.gd-approval-content small { margin-top: 4px; font-size: 10px; color: var(--gd-muted); }
.gd-statement .gd-panel-head { margin-block-end: 8px; }

.gd-table-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; max-inline-size: 100%; }
.gd-search, .gd-filter {
  display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--gd-line); border-radius: 10px;
  background: var(--gd-inner); min-block-size: 35px; padding: 0 8px;
}
.gd-search svg, .gd-filter svg { width: 13px; height: 13px; color: var(--gd-muted); }
.gd-search input { width: 120px; flex: 1; min-inline-size: 0; border: 0; background: transparent; min-block-size: 33px; }
.gd-search input::placeholder { color: var(--gd-muted); opacity: 1; }
.gd-search input, .gd-filter select { font-size: 11px; }
.gd-filter select { border: 0; background: transparent; padding: 5px 0; min-inline-size: 0; }
.gd-filter select option { color: var(--gd-ink); background: var(--gd-surface); }
.gd-search:focus-within, .gd-filter:focus-within { outline: 2px solid var(--gd-focus); }
.gd-app .gd-search input:focus-visible, .gd-app .gd-filter select:focus-visible { outline: none; }
.gd-table-scroll { max-inline-size: 100%; overflow: auto; scrollbar-width: thin; }
.gd-table-scroll table { inline-size: 100%; border-spacing: 0; text-align: start; }
.gd-table-scroll th, .gd-table-scroll td { padding: 9px 10px; text-align: start; vertical-align: middle; }
.gd-table-scroll th { background: var(--gd-inner); font-size: 10px; color: var(--gd-muted); font-weight: 800; white-space: nowrap; }
.gd-table-scroll th:first-child { border-radius: 8px 0 0 8px; }
.gd-table-scroll th:last-child { border-radius: 0 8px 8px 0; }
.gd-table-scroll td { white-space: nowrap; font-size: 11.5px; }
.gd-table-scroll td:first-child { font-weight: 760; }
.gd-table-scroll tr + tr td { border-top: 1px solid var(--gd-line); }
.gd-table-scroll tbody tr:hover td { background: color-mix(in srgb, var(--gd-inner) 65%, transparent); }
.gd-amount-col { text-align: end !important; font-weight: 800; }
.gd-row-meta { display: block; font-size: 10px; font-weight: 600; color: var(--gd-muted); margin-top: 2px; }
.gd-row-action {
  inline-size: 30px; block-size: 30px; border-radius: 8px; border: 1px solid var(--gd-line);
  background: var(--gd-inner); display: inline-grid; place-items: center; padding: 0;
}
.gd-row-action:hover { background: var(--gd-raised); }
.gd-row-action svg { width: 13px; height: 13px; }
.gd-status {
  --gd-status-color: var(--gd-graph-ink);
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 7px; border-radius: 999px; font-size: 10px; font-weight: 790;
  background: color-mix(in srgb, var(--gd-status-color) 11%, var(--gd-inner));
  color: var(--gd-status-color); white-space: nowrap;
}
.gd-status[data-state="teal"] { --gd-status-color: var(--gd-teal); }
.gd-status[data-state="coral"] { --gd-status-color: var(--gd-coral); }
.gd-status[data-state="ochre"] { --gd-status-color: var(--gd-ochre); }
.gd-status i { inline-size: 5px; block-size: 5px; border-radius: 50%; background: currentColor; }
.gd-empty { padding: 14px 3px; color: var(--gd-muted); font-size: 12px; }
.gd-empty-box {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
  padding: 14px; border-radius: 14px; border: 1px dashed var(--gd-line); margin-top: 8px;
}

.gd-app [data-tone="ink"] { --gd-series: var(--gd-graph-ink); }
.gd-app [data-tone="coral"] { --gd-series: var(--gd-coral); }
.gd-app [data-tone="teal"] { --gd-series: var(--gd-teal); }
.gd-app [data-tone="ochre"] { --gd-series: var(--gd-ochre); }
.gd-legend { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; color: var(--gd-muted); }
.gd-legend span, .gd-device-list button span:first-child { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 740; }
.gd-legend i, .gd-device-list button span:first-child i { inline-size: 7px; block-size: 7px; border-radius: 50%; background: var(--gd-series); flex: none; }
.gd-stack-meta { display: flex; justify-content: space-between; align-items: center; height: 20px; gap: 4px; }
.gd-chart-readout { font-size: 10px; font-weight: 830; white-space: nowrap; }
.gd-stack-plot { display: grid; grid-template-columns: repeat(var(--gd-series-count), minmax(0, 1fr)); gap: 4px; block-size: 194px; margin-top: 5px; }
.gd-command-chart .gd-stack-plot { block-size: 141px; }
.gd-stack-column { display: flex; flex-direction: column; align-items: center; min-inline-size: 0; border: 0; border-radius: 8px; background: transparent; padding: 3px 0 0; }
.gd-stack-column:is(:focus-visible, :hover, [aria-pressed="true"]) { background: var(--gd-inner); }
.gd-stack-track { display: flex; justify-content: center; align-items: end; flex: 1; inline-size: 100%; border-bottom: 1px solid var(--gd-line); }
.gd-stack-bar {
  display: flex; flex-direction: column; transform-origin: center bottom;
  inline-size: min(65%, 40px); min-inline-size: 6px; border-radius: 6px 6px 3px 3px; overflow: hidden;
}
.gd-stack-bar i { display: block; flex-basis: 0; background: var(--gd-series); min-block-size: 2px; }
.gd-stack-bar i:first-child { background: repeating-linear-gradient(138deg, var(--gd-series) 0 4px, color-mix(in srgb, var(--gd-series) 76%, white) 4px 6px); }
.gd-stack-label { font-size: 9px; color: var(--gd-muted); margin-top: 7px; white-space: nowrap; }
.gd-revenue-main { display: grid; grid-template-columns: 44px minmax(0, 1fr); }
.gd-chart-y { display: flex; flex-direction: column; justify-content: space-between; padding-block: 0; font-size: 10px; color: var(--gd-muted); }
.gd-line-plot { position: relative; min-inline-size: 0; block-size: 208px; }
.gd-line-plot svg { display: block; width: 100%; height: 100%; overflow: visible; }
.gd-grid-line { stroke: var(--gd-grid); stroke-dasharray: 3 4; vector-effect: non-scaling-stroke; }
.gd-chart-path { fill: none; stroke: var(--gd-series); stroke-width: 2.5; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.gd-line-cursor { stroke: var(--gd-muted); stroke-dasharray: 2 4; vector-effect: non-scaling-stroke; }
.gd-chart-zones { position: absolute; inset: 0; display: flex; align-items: stretch; }
.gd-chart-zones button { flex: 1; min-inline-size: 0; border: 0; background: transparent; padding: 0; border-radius: 2px; }
.gd-line-tooltip {
  pointer-events: none; position: absolute; top: 6px; left: clamp(74px, var(--gd-tooltip-x), calc(100% - 74px)); translate: -50% 0;
  display: grid; gap: 2px; min-inline-size: 146px; padding: 7px 8px; background: var(--gd-surface);
  border: 1px solid var(--gd-line); border-radius: 9px; font-size: 10px; box-shadow: 0 4px 10px rgb(var(--gd-dark-shadow) / 15%);
}
.gd-line-tooltip span { display: flex; justify-content: space-between; gap: 10px; }
.gd-chart-axis { display: flex; justify-content: space-between; margin: 9px 0 0 44px; font-size: 9px; color: var(--gd-muted); }
.gd-device { display: grid; gap: 8px; justify-items: stretch; }
.gd-device-ring { position: relative; inline-size: min(100%, 150px); aspect-ratio: 1; justify-self: center; }
.gd-device-ring svg { display: block; inline-size: 100%; block-size: 100%; }
.gd-device-segment { stroke: var(--gd-series); transition: opacity .2s ease; }
.gd-device-segment[data-muted="true"] { opacity: .29; }
.gd-device-total { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: none; text-align: center; padding-inline: 18px; }
.gd-device-total strong { font-size: 21px; line-height: 1.05; letter-spacing: -.05em; font-weight: 850; }
.gd-device-total > span { font-size: 9.5px; margin-top: 4px; color: var(--gd-muted); max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gd-device-list { display: grid; gap: 2px; }
.gd-device-list button {
  display: grid; grid-template-columns: 88px minmax(0, 1fr) 34px; gap: 7px; align-items: center;
  min-block-size: 32px; text-align: start; background: transparent; border: 0; border-radius: 8px; padding: 3px 6px;
}
.gd-cat-label { display: inline-flex; align-items: center; gap: 5px; min-inline-size: 0; }
.gd-cat-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gd-device-list button:is(:hover, [aria-pressed="true"]) { background: var(--gd-inner); }
.gd-device-list button strong { text-align: end; font-weight: 850; font-size: 11px; }
.gd-mix-track { height: 4px; }
.gd-mix-track .gd-fill { display: block; block-size: 100%; border-radius: inherit; background: var(--gd-series); transform-origin: left center; }

.gd-budget-list { display: grid; gap: 10px; }
.gd-budget-row {
  display: grid; gap: 6px; padding: 10px 12px; border-radius: 13px;
  border: 1px solid var(--gd-line); background: var(--gd-inner);
}
.gd-budget-row-top {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px;
}
.gd-budget-row-title { display: inline-flex; align-items: center; gap: 8px; font-weight: 800; font-size: 12.5px; }
.gd-budget-row-nums { display: inline-flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--gd-muted); }
.gd-budget-row-nums strong { color: var(--gd-ink); }
.gd-budget-row-foot { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: var(--gd-muted); }

.gd-lanes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; }
.gd-lanes[data-filtered="true"] { grid-template-columns: minmax(0, 1fr); }
.gd-lane { min-inline-size: 0; border: 1px solid var(--gd-line); background: var(--gd-inner); padding: 7px; border-radius: 14px; }
.gd-lane header { display: flex; align-items: center; gap: 5px; padding: 3px 4px 8px; }
.gd-lane header i { display: inline-grid; place-items: center; border-radius: 7px; width: 23px; height: 23px; color: var(--gd-series); background: color-mix(in srgb, var(--gd-series) 13%, transparent); }
.gd-lane header svg { width: 13px; height: 13px; }
.gd-lane header h3 { min-inline-size: 0; font-size: 11px; font-weight: 840; }
.gd-lane header span { margin-inline-start: auto; color: var(--gd-muted); font-size: 10px; }
.gd-work-item {
  display: grid; gap: 5px; width: 100%; text-align: start; border-radius: 11px; padding: 9px;
  border: 1px solid var(--gd-rim); background: var(--gd-card);
  box-shadow: inset 0 1px 0 var(--gd-gloss);
}
.gd-work-item + .gd-work-item { margin-top: 6px; }
.gd-work-item:hover { background: var(--gd-raised); }
.gd-work-titlerow, .gd-work-meta { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
.gd-work-titlerow strong { font-size: 11.5px; font-weight: 820; }
.gd-work-amount { font-size: 11.5px; font-weight: 840; white-space: nowrap; }
.gd-work-detail { font-size: 10.5px; line-height: 1.42; color: var(--gd-muted); }
.gd-work-meta { font-size: 9.5px; font-weight: 750; margin-top: 2px; color: var(--gd-muted); }

.gd-dock {
  position: absolute; z-index: 3;
  display: flex; align-items: center; gap: 3px; padding: 4px; border-radius: 999px;
}
.gd-dock-side { flex-direction: column; left: -24px; top: clamp(66px, 16vh, 153px); }
.gd-dock-bottom { left: 50%; bottom: -24px; translate: -50% 0; }
.gd-dock a {
  z-index: 1; position: relative; display: flex; gap: 6px; justify-content: center; align-items: center;
  min-inline-size: 44px; min-block-size: 44px; padding: 0 13px; border-radius: 999px;
  font-size: 11px; font-weight: 800; white-space: nowrap;
}
.gd-dock-side a { padding: 0; }
.gd-dock a svg { width: 16px; height: 16px; stroke-width: 1.9; }
.gd-dock a[aria-current="page"] { color: var(--gd-pick-ink); }
.gd-dock a:not([aria-current="page"]):hover { background: var(--gd-inner); }
.gd-dock-indicator {
  position: absolute; inset: 0 auto auto 0; pointer-events: none; visibility: hidden;
  border-radius: 999px; background: var(--gd-pick); box-shadow: inset 0 1px 0 white, 0 2px 7px rgb(var(--gd-dark-shadow) / 16%);
}
.gd-dock-indicator[data-ready="true"] { visibility: visible; transition: transform .36s cubic-bezier(.24, .89, .26, 1), width .36s cubic-bezier(.24, .89, .26, 1), height .36s cubic-bezier(.24, .89, .26, 1); }
.gd-dock-side .gd-dock-text, .gd-dock-short { display: none; }
.gd-dock-tip {
  display: none; position: absolute; left: calc(100% + 7px); z-index: 1; pointer-events: none;
  color: var(--gd-ink); background: var(--gd-surface); padding: 6px 9px; border: 1px solid var(--gd-rim);
  border-radius: 7px; box-shadow: 0 3px 8px rgb(var(--gd-dark-shadow) / 17%);
}
.gd-dock-side a:is(:hover, :focus-visible) .gd-dock-tip { display: inline; }
.gd-footer { padding: 33px 3px 1px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.gd-footer-pill {
  border-radius: 999px; padding: 5px 10px; color: var(--gd-ink); font-size: 10.5px; font-weight: 740;
  background: var(--gd-raised); min-block-size: 28px; display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid var(--gd-rim);
}
.gd-footer-reset { cursor: pointer; }
.gd-footer-reset:hover { background: var(--gd-surface); }
.gd-footer-reset svg { width: 11px; height: 11px; }

.gd-dialog {
  margin: auto;
  max-inline-size: min(calc(100% - 26px), 520px); inline-size: 100%;
  border-radius: 23px; border: 1px solid var(--gd-rim); color: var(--gd-ink); padding: 0;
  background: var(--gd-surface); box-shadow: 0 20px 80px rgb(var(--gd-dark-shadow) / 38%);
}
.gd-dialog::backdrop { background: rgb(30 21 17 / 48%); backdrop-filter: blur(5px); }
.gd-dialog-inner { padding: 20px; }
.gd-dialog-inner > header { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.gd-dialog-inner h2 { font-size: 22px; font-weight: 830; letter-spacing: -.04em; }
.gd-command-input { inline-size: 100%; padding-inline: 10px; margin-bottom: 10px; min-block-size: 44px; }
.gd-command-input input { min-block-size: 42px; font-size: 13.5px; }
.gd-quick-list { display: grid; gap: 6px; max-block-size: 55vh; overflow: auto; }
.gd-quick-list button {
  display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px 10px;
  text-align: start; border: 1px solid var(--gd-line); border-radius: 11px; background: var(--gd-inner);
}
.gd-quick-list button:hover { background: var(--gd-raised); }
.gd-quick-list button svg { width: 16px; height: 16px; color: var(--gd-muted); flex: none; }
.gd-quick-list button div { flex: 1; min-inline-size: 0; }
.gd-quick-list strong, .gd-quick-list small { display: block; }
.gd-quick-list small { color: var(--gd-muted); margin-top: 2px; font-size: 11px; }
.gd-work-dialog-description { margin: 12px 0; line-height: 1.45; color: var(--gd-muted); }
.gd-work-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-bottom: 14px; }
.gd-work-facts div { border: 1px solid var(--gd-line); border-radius: 10px; padding: 8px 10px; background: var(--gd-inner); }
.gd-work-facts dt { font-size: 10.5px; color: var(--gd-muted); }
.gd-work-facts dd { margin: 4px 0 0; font-weight: 800; font-size: 12.5px; }

.gd-form { display: grid; gap: 12px; }
.gd-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.gd-field { display: grid; gap: 5px; }
.gd-field-span { grid-column: 1 / -1; }
.gd-field > span { font-size: 11px; font-weight: 760; color: var(--gd-muted); }
.gd-field input, .gd-field select {
  inline-size: 100%; min-block-size: 40px; padding: 8px 10px;
  border-radius: 10px; border: 1px solid var(--gd-line);
  background: var(--gd-inner); font-size: 12.5px;
}
.gd-field select option { color: var(--gd-ink); background: var(--gd-surface); }
.gd-checkbox { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; cursor: pointer; }
.gd-checkbox input { inline-size: 16px; block-size: 16px; accent-color: var(--gd-teal); }
.gd-form-error {
  display: flex; align-items: center; gap: 8px; padding: 9px 11px; border-radius: 10px;
  background: color-mix(in srgb, var(--gd-coral) 14%, var(--gd-inner));
  color: var(--gd-coral); font-size: 11.5px; font-weight: 760;
}
.gd-form-error svg { width: 15px; height: 15px; flex: none; }
.gd-form-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px; }
.gd-form-actions-right { display: flex; align-items: center; gap: 8px; margin-inline-start: auto; }
.gd-budget-alloc-note { font-size: 11.5px; color: var(--gd-muted); font-weight: 740; }
.gd-bill-lane-row { margin-bottom: 10px; }

@media (max-width: 1060px) {
  .gd-surround { inline-size: calc(100% - 74px); }
  .gd-stage-scroll { padding-inline: 29px; }
  .gd-command-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .gd-command-grid > .gd-command-chart { grid-column: 1; }
  .gd-command-side { grid-column: 2; }
  .gd-command-grid > .gd-activity { grid-column: 1 / -1; }
}
@media (max-width: 760px) {
  .gd-surround { padding-top: 11px; padding-bottom: calc(73px + env(safe-area-inset-bottom)); inline-size: calc(100% - 24px); }
  .gd-top { grid-template-columns: minmax(0, 1fr) auto; padding: 7px 9px; gap: 6px 12px; border-radius: 21px; }
  .gd-brand { padding-inline-start: 3px; }
  .gd-ask { grid-area: 2 / 1 / 3 / -1; min-block-size: 41px; }
  .gd-top-actions { grid-area: 1 / 2; }
  .gd-user-name { display: none; }
  .gd-signout-btn span { display: none; }
  .gd-signout-btn { min-inline-size: 41px; min-block-size: 41px; padding: 0; justify-content: center; }
  .gd-top-actions .gd-icon-button { width: 41px; min-inline-size: 41px; min-block-size: 41px; }
  .gd-stage { border-radius: 23px; }
  .gd-stage-scroll { block-size: auto; padding: 15px 13px 17px; overflow: visible; }
  .gd-view-head { align-items: flex-start; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .gd-view-head p { font-size: 12px; margin-top: 6px; }
  .gd-view-actions { justify-content: flex-start; }
  .gd-command-grid, .gd-analytics-grid { grid-template-columns: minmax(0, 1fr); }
  .gd-command-side, .gd-command-grid > .gd-activity { grid-column: 1; }
  .gd-metric-grid, .gd-lanes { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gd-dock-side { display: none; }
  .gd-dock-bottom { position: fixed; inset: auto 11px calc(9px + env(safe-area-inset-bottom)); translate: none; justify-content: space-between; }
  .gd-dock-bottom a { flex: 1; flex-direction: column; gap: 2px; padding: 3px 5px; min-block-size: 47px; line-height: 1.2; font-size: 9.5px; }
  .gd-dock-bottom a svg { width: 15px; height: 15px; }
  .gd-dock-bottom .gd-dock-text { display: none; }
  .gd-dock-bottom .gd-dock-short { display: inline; }
  .gd-footer { padding-top: 9px; }
  .gd-period button { min-block-size: 41px; }
  .gd-primary, .gd-secondary { min-block-size: 44px; }
  .gd-form-grid { grid-template-columns: 1fr; }
}
@media (max-width: 420px) {
  .gd-panel { padding: 12px; }
  .gd-metric { padding: 9px; }
  .gd-summary { gap: 5px; padding: 5px; }
  .gd-chart-axis span:nth-child(even) { visibility: hidden; }
  .gd-chart-y { font-size: 9px; }
  .gd-stack-label { font-size: 8px; }
  .gd-lanes { grid-template-columns: 1fr; }
  .gd-table-scroll table { min-inline-size: 278px; }
  .gd-table-scroll th, .gd-table-scroll td { padding-inline: 6px; }
  .gd-table-scroll td { font-size: 10.5px; }
}
@media (prefers-reduced-motion: reduce) {
  .gd-app *, .gd-app *::before, .gd-app *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active) {
  .gd-top, .gd-stage, .gd-dock, .gd-panel, .gd-metric, .gd-summary { background: var(--gd-surface); backdrop-filter: none; -webkit-backdrop-filter: none; }
  .gd-metric[data-tone="teal"] { background: var(--gd-surface); color: var(--gd-ink); --gd-muted: var(--gd-ink); --gd-teal: var(--gd-ink); }
}
@media (forced-colors: active) {
  .gd-app { --gd-ink: CanvasText; --gd-muted: CanvasText; --gd-focus: Highlight; --gd-coral: LinkText; --gd-teal: Highlight; --gd-graph-ink: CanvasText; --gd-surface: Canvas; }
  .gd-app :is(.gd-metric, .gd-panel, .gd-lane, .gd-dock, button, .gd-stage) { border: 1px solid CanvasText; }
  .gd-dock a[aria-current="page"] { border: 2px solid Highlight; }
}
`;

function Panel({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`gd-panel ${className}`} data-gd-enter>
      <header className="gd-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

type View = "overview" | "trends" | "budgets" | "bills";

function Metric({
  title,
  icon,
  value,
  format,
  change,
  detail,
  tone,
  attention,
}: {
  title: string;
  icon: ReactNode;
  value: number;
  format?: CountFormat;
  change?: string;
  detail?: string;
  tone?: "teal" | "coral";
  attention?: boolean;
}) {
  return (
    <article className="gd-metric" data-tone={tone} data-gd-enter>
      <div className="gd-metric-head">
        <span>{title}</span>
        <span className="gd-metric-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <strong className="gd-metric-value">
        <Counter value={value} format={format} />
      </strong>
      <div className="gd-metric-caption">
        {change && (
          <span className="gd-delta" data-attention={attention ?? tone === "coral"}>
            {change.startsWith("−") ? (
              <ArrowDownRight aria-hidden="true" />
            ) : (
              <ArrowUpRight aria-hidden="true" />
            )}
            {change}
          </span>
        )}
        <span>{detail ?? "vs prior period"}</span>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "Cleared" || status === "Paid" || status === "On Track"
      ? "teal"
      : status === "Over Budget" || status === "Overdue" || status === "Due Soon"
        ? "coral"
        : status === "Near Limit" || status === "Pending"
          ? "ochre"
          : "ink";
  return (
    <span className="gd-status" data-state={color}>
      <i aria-hidden="true" />
      {status}
    </span>
  );
}

function ExpenseLedger({
  expenses,
  onEdit,
  onAdd,
  initialCategory = "All categories",
}: {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onAdd: () => void;
  initialCategory?: ExpenseCategory | "All categories";
}) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "All categories">(initialCategory);
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setCategoryFilter(initialCategory);
  }, [initialCategory]);

  const trimmed = query.trim().toLowerCase();
  const visible = expenses.filter((item) => {
    const matchesSearch =
      !trimmed ||
      [item.title, item.category, item.paymentMethod, item.member, item.notes ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(trimmed);
    const matchesCategory =
      categoryFilter === "All categories" || item.category === categoryFilter;
    const matchesStatus =
      statusFilter === "All statuses" || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const rowsToShow = expanded || trimmed || categoryFilter !== "All categories" || statusFilter !== "All statuses"
    ? visible
    : visible.slice(0, 5);

  return (
    <Panel
      title="Recent expenses"
      subtitle={`${visible.length} transaction${visible.length === 1 ? "" : "s"}`}
      className="gd-activity"
      action={
        <div className="gd-table-tools">
          <label className="gd-search">
            <Search aria-hidden="true" />
            <input
              type="search"
              placeholder="Search expenses"
              aria-label="Search expenses"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="gd-filter">
            <Filter aria-hidden="true" />
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as ExpenseCategory | "All categories")
              }
            >
              <option value="All categories">All categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label className="gd-filter">
            <SlidersHorizontal aria-hidden="true" />
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All statuses">All statuses</option>
              {EXPENSE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    >
      <div className="gd-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Expense</th>
              <th scope="col">Category</th>
              <th scope="col">Status</th>
              <th scope="col">Date</th>
              <th scope="col" className="gd-amount-col">
                Amount
              </th>
              <th scope="col">
                <span className="gd-sr">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rowsToShow.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.title}
                  <span className="gd-row-meta">
                    {item.paymentMethod} · {item.member}
                  </span>
                </td>
                <td>{item.category}</td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                <td>{formatShortDate(item.date)}</td>
                <td className="gd-amount-col">{usdExact(item.amount)}</td>
                <td>
                  <button
                    type="button"
                    className="gd-row-action"
                    aria-label={`Edit ${item.title}`}
                    onClick={() => onEdit(item)}
                  >
                    <Pencil aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length > 5 && !trimmed && categoryFilter === "All categories" && statusFilter === "All statuses" && (
        <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="gd-small-btn"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Show recent 5" : `Show all (${visible.length})`}
          </button>
        </div>
      )}
      {visible.length === 0 && (
        <div className="gd-empty-box" role="status">
          <p className="gd-empty">No expenses match the current search or filters.</p>
          <button type="button" className="gd-secondary" onClick={onAdd}>
            <Plus aria-hidden="true" />
            Log expense
          </button>
        </div>
      )}
    </Panel>
  );
}

function OverviewView({
  state,
  period,
  referenceDate,
  open,
  onLogExpense,
  onEditExpense,
  onEditBudgets,
}: {
  state: HouseholdState;
  period: Period;
  referenceDate: string;
  open: (view: View) => void;
  onLogExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onEditBudgets: () => void;
}) {
  const summary = computePeriodSummary(state.expenses, period, state.monthlyBudget, referenceDate);
  const series = buildSpendingSeries(state.expenses, period, state.monthlyBudget, referenceDate);
  const periodExpenses = filterExpensesByPeriod(state.expenses, period, referenceDate);
  const monthSpent = computeCurrentMonthTotal(state.expenses, referenceDate);
  const monthPct = state.monthlyBudget > 0 ? Math.min(100, (monthSpent / state.monthlyBudget) * 100) : 0;
  const monthStatus =
    monthSpent >= state.monthlyBudget
      ? "Over Budget"
      : monthSpent >= state.monthlyBudget * 0.85
        ? "Near Limit"
        : "On Track";

  const dueBills = state.bills.filter((b) => b.lane === "Due Soon" || b.lane === "Overdue");
  const dueTotal = dueBills.reduce((sum, b) => sum + b.amount, 0);
  const nextBill = dueBills[0] ?? state.bills[0];

  return (
    <div className="gd-command-grid">
      <Panel
        title="Household spend"
        className="gd-balance"
        action={<span className="gd-unit">USD</span>}
      >
        <div className="gd-balance-number">
          <Counter value={summary.totalSpent} format="usd" />
        </div>
        <div className="gd-balance-change">
          {summary.spendDelta && (
            <span className="gd-delta" data-attention={summary.deltaIsIncrease}>
              {summary.spendDelta.startsWith("−") ? (
                <ArrowDownRight aria-hidden="true" />
              ) : (
                <ArrowUpRight aria-hidden="true" />
              )}
              {summary.spendDelta}
            </span>
          )}
          <span>
            {summary.transactionCount} transaction{summary.transactionCount === 1 ? "" : "s"} in {period}
          </span>
        </div>
        <div className="gd-balance-actions">
          <button type="button" className="gd-primary" onClick={onLogExpense}>
            <Plus aria-hidden="true" />
            Log expense
          </button>
          <button type="button" className="gd-secondary" onClick={() => open("trends")}>
            View trends <ArrowRight aria-hidden="true" />
          </button>
        </div>
        <div className="gd-streams" aria-label="Spend by payment method">
          {summary.byPaymentMethod.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{usd(item.value)}</strong>
            </div>
          ))}
        </div>
      </Panel>

      <div className="gd-summary">
        <Metric
          title="Essentials"
          icon={<Home />}
          value={summary.essentialSpent}
          format="usd"
          detail="housing, food, transit"
          tone="teal"
        />
        <Metric
          title="Remaining budget"
          icon={<Wallet />}
          value={Math.max(0, summary.remainingBudget)}
          format="usd"
          detail={
            summary.remainingBudget >= 0
              ? `of ${usd(summary.periodBudget)} target`
              : `${usd(Math.abs(summary.remainingBudget))} over target`
          }
        />
        <Metric
          title="Discretionary"
          icon={<Receipt />}
          value={summary.discretionarySpent}
          format="usd"
          detail="dining, home, subs"
          tone={summary.discretionarySpent > summary.periodBudget * 0.35 ? "coral" : undefined}
        />
        <Metric
          title="Bills due soon"
          icon={<CalendarClock />}
          value={dueBills.length}
          detail={`${usdExact(dueTotal)} pending`}
        />
      </div>

      <Panel
        title="Spending rhythm"
        subtitle={`Essentials vs discretionary · ${period}`}
        className="gd-command-chart"
      >
        <StackChart
          items={series.map((b) => ({
            label: b.label,
            lower: b.essential,
            upper: b.discretionary,
          }))}
          labels={["Essentials", "Discretionary"]}
          tones={["ink", "teal"]}
          format={usd}
          title="Household spending by day"
        />
      </Panel>

      <div className="gd-command-side">
        <Panel
          title="Monthly budget cap"
          className="gd-capacity"
          action={
            <button type="button" className="gd-small-btn" onClick={onEditBudgets}>
              <SlidersHorizontal aria-hidden="true" />
              Edit
            </button>
          }
        >
          <div
            className="gd-capacity-track"
            role="meter"
            aria-label="Monthly household budget used"
            aria-valuenow={Math.round(monthSpent)}
            aria-valuemin={0}
            aria-valuemax={state.monthlyBudget}
          >
            <span
              className="gd-fill"
              data-status={monthStatus}
              style={{ width: `${monthPct}%` }}
            />
          </div>
          <div className="gd-capacity-label">
            <span>
              <strong>{usd(monthSpent)}</strong> spent in Nov
            </span>
            <span>{usd(state.monthlyBudget)} cap</span>
          </div>
        </Panel>

        <Panel
          title="Upcoming bills"
          subtitle="Recurring utilities & home obligations"
          className="gd-approvals"
        >
          <div className="gd-approval-content">
            <span className="gd-list-icon">
              <CalendarClock aria-hidden="true" />
            </span>
            <div>
              <strong>{nextBill ? `${nextBill.name} · ${usdExact(nextBill.amount)}` : "All bills paid"}</strong>
              <small>
                {nextBill ? `${nextBill.dueLabel} · ${nextBill.provider}` : "No pending bills"}
              </small>
            </div>
            <button
              type="button"
              className="gd-icon-button"
              aria-label="Open Recurring Bills"
              onClick={() => open("bills")}
            >
              <ArrowUpRight aria-hidden="true" />
            </button>
          </div>
        </Panel>
      </div>

      <ExpenseLedger
        expenses={periodExpenses}
        onEdit={onEditExpense}
        onAdd={onLogExpense}
      />
    </div>
  );
}

function TrendsView({
  state,
  period,
  referenceDate,
  download,
}: {
  state: HouseholdState;
  period: Period;
  referenceDate: string;
  download: () => void;
}) {
  const summary = computePeriodSummary(state.expenses, period, state.monthlyBudget, referenceDate);
  const series = buildSpendingSeries(state.expenses, period, state.monthlyBudget, referenceDate);
  const breakdown = computeCategoryBreakdown(state.expenses, period, referenceDate);

  return (
    <div className="gd-analytics">
      <div className="gd-metric-grid">
        <Metric
          title="Total spent"
          icon={<CircleDollarSign />}
          value={summary.totalSpent}
          format="compact"
          change={summary.spendDelta}
          attention={summary.deltaIsIncrease}
          tone="teal"
        />
        <Metric
          title="Period target"
          icon={<Wallet />}
          value={summary.periodBudget}
          format="compact"
          detail="allocated budget"
        />
        <Metric
          title="Daily average"
          icon={<TrendingUp />}
          value={summary.dailyAverage}
          format="usd"
          detail={`across ${period}`}
        />
        <Metric
          title="Budget used"
          icon={<PieChart />}
          value={summary.budgetUsedPercent}
          format="percent"
          detail="of period target"
        />
      </div>

      <div className="gd-analytics-grid">
        <Panel
          title="Actual spend vs budget pace"
          subtitle="Compare cumulative spending against your household pace"
          action={
            <Legend
              entries={[
                { label: "Actual spend", tone: "coral" },
                { label: "Budget pace", tone: "ink" },
              ]}
            />
          }
        >
          <SpendingChart buckets={series} />
        </Panel>

        <Panel title="Category mix" className="gd-device-panel">
          <CategoryMixChart items={breakdown} totalSpent={summary.totalSpent} />
        </Panel>
      </div>

      <Panel title="Reporting snapshot" className="gd-statement">
        <div className="gd-approval-content">
          <span className="gd-list-icon">
            <Clock3 aria-hidden="true" />
          </span>
          <div>
            <strong>Household expense ledger ({period})</strong>
            <small>
              {summary.transactionCount} entries · {series[0]?.label} to {series.at(-1)?.label}
            </small>
          </div>
          <button
            type="button"
            className="gd-icon-button"
            aria-label="Download expenses CSV"
            onClick={download}
          >
            <ArrowDownToLine aria-hidden="true" />
          </button>
        </div>
      </Panel>
    </div>
  );
}

function BudgetsView({
  state,
  period,
  referenceDate,
  onEditBudgets,
  onLogExpense,
  onEditExpense,
}: {
  state: HouseholdState;
  period: Period;
  referenceDate: string;
  onEditBudgets: () => void;
  onLogExpense: () => void;
  onEditExpense: (expense: Expense) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | "All categories">(
    "All categories"
  );
  const monthSpent = computeCurrentMonthTotal(state.expenses, referenceDate);
  const categoryHealth = computeMonthlyCategoryHealth(
    state.expenses,
    state.categoryBudgets,
    referenceDate
  );
  const overBudgetCount = categoryHealth.filter((c) => c.status === "Over Budget").length;
  const nearLimitCount = categoryHealth.filter((c) => c.status === "Near Limit").length;
  const periodExpenses = filterExpensesByPeriod(state.expenses, period, referenceDate);

  return (
    <div className="gd-analytics">
      <div className="gd-metric-grid">
        <Metric
          title="Monthly budget"
          icon={<Wallet />}
          value={state.monthlyBudget}
          format="usd"
          detail="household cap"
          tone="teal"
        />
        <Metric
          title="Month spent"
          icon={<CircleDollarSign />}
          value={monthSpent}
          format="usd"
          detail="November total"
        />
        <Metric
          title="Month remaining"
          icon={<CheckCircle2 />}
          value={Math.max(0, state.monthlyBudget - monthSpent)}
          format="usd"
          detail={
            state.monthlyBudget - monthSpent >= 0
              ? "available this month"
              : `${usd(Math.abs(state.monthlyBudget - monthSpent))} over cap`
          }
        />
        <Metric
          title="Needs attention"
          icon={<TriangleAlert />}
          value={overBudgetCount + nearLimitCount}
          detail={`${overBudgetCount} over · ${nearLimitCount} near limit`}
          tone={overBudgetCount > 0 ? "coral" : undefined}
        />
      </div>

      <Panel
        title="Monthly category budgets"
        subtitle="Click a category to filter the ledger below, or customize limits"
        action={
          <button type="button" className="gd-primary" onClick={onEditBudgets}>
            <SlidersHorizontal aria-hidden="true" />
            Adjust budgets
          </button>
        }
      >
        <div className="gd-budget-list">
          {categoryHealth.map((cat) => {
            const fillPct = Math.min(100, Math.round(cat.utilizationPercent));
            const isSelected = selectedCategory === cat.category;
            return (
              <div className="gd-budget-row" key={cat.category}>
                <div className="gd-budget-row-top">
                  <button
                    type="button"
                    className="gd-small-btn"
                    aria-pressed={isSelected}
                    onClick={() =>
                      setSelectedCategory(isSelected ? "All categories" : cat.category)
                    }
                  >
                    <span className="gd-budget-row-title">{cat.category}</span>
                  </button>
                  <div className="gd-budget-row-nums">
                    <span>
                      <strong>{usdExact(cat.spent)}</strong> / {usd(cat.limit)}
                    </span>
                    <StatusBadge status={cat.status} />
                  </div>
                </div>
                <div
                  className="gd-capacity-track"
                  role="meter"
                  aria-label={`${cat.category} budget usage`}
                  aria-valuenow={Math.round(cat.spent)}
                  aria-valuemin={0}
                  aria-valuemax={cat.limit}
                >
                  <span
                    className="gd-fill"
                    data-status={cat.status}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <div className="gd-budget-row-foot">
                  <span>{Math.round(cat.utilizationPercent)}% used</span>
                  <span>
                    {cat.remaining >= 0
                      ? `${usdExact(cat.remaining)} remaining`
                      : `${usdExact(Math.abs(cat.remaining))} over limit`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <ExpenseLedger
        expenses={periodExpenses}
        onEdit={onEditExpense}
        onAdd={onLogExpense}
        initialCategory={selectedCategory}
      />
    </div>
  );
}

const billLaneStyle: Record<BillLane, { icon: ReactNode; tone: "teal" | "coral" | "ochre" | "ink" }> = {
  "Due Soon": { icon: <Clock3 />, tone: "ochre" },
  "Autopay Scheduled": { icon: <CalendarClock />, tone: "ink" },
  "Paid": { icon: <CheckCircle2 />, tone: "teal" },
  "Overdue": { icon: <TriangleAlert />, tone: "coral" },
};

function BillsView({
  bills,
  onInspectBill,
  onAddBill,
}: {
  bills: RecurringBill[];
  onInspectBill: (bill: RecurringBill) => void;
  onAddBill: () => void;
}) {
  const [filter, setFilter] = useState<BillLane | "All lanes">("All lanes");
  const totalMonthly = bills.reduce((sum, b) => sum + b.amount, 0);
  const dueSoonCount = bills.filter((b) => b.lane === "Due Soon" || b.lane === "Overdue").length;
  const paidTotal = bills
    .filter((b) => b.lane === "Paid")
    .reduce((sum, b) => sum + b.amount, 0);
  const lanes = filter === "All lanes" ? BILL_LANES : [filter];

  return (
    <div className="gd-analytics">
      <div className="gd-metric-grid">
        <Metric
          title="Monthly recurring"
          icon={<CircleDollarSign />}
          value={totalMonthly}
          format="usd"
          detail="total fixed bills"
          tone="teal"
        />
        <Metric
          title="Bills tracked"
          icon={<CalendarClock />}
          value={bills.length}
          detail="active household bills"
        />
        <Metric
          title="Needs payment"
          icon={<TriangleAlert />}
          value={dueSoonCount}
          detail="due soon or overdue"
          tone={dueSoonCount > 0 ? "coral" : undefined}
        />
        <Metric
          title="Paid this cycle"
          icon={<CheckCircle2 />}
          value={paidTotal}
          format="usd"
          detail="cleared obligations"
        />
      </div>

      <Panel
        title="Recurring bills board"
        subtitle="Click any bill to mark it paid, update its status, or adjust details."
        className="gd-board"
        action={
          <div className="gd-table-tools">
            <label className="gd-filter">
              <Filter aria-hidden="true" />
              <select
                aria-label="Filter bill lanes"
                value={filter}
                onChange={(event) => setFilter(event.target.value as BillLane | "All lanes")}
              >
                {["All lanes", ...BILL_LANES].map((lane) => (
                  <option key={lane} value={lane}>
                    {lane}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="gd-primary" onClick={onAddBill}>
              <Plus aria-hidden="true" />
              Add bill
            </button>
          </div>
        }
      >
        <div className="gd-lanes" data-filtered={filter !== "All lanes"}>
          {lanes.map((lane) => {
            const items = bills.filter((item) => item.lane === lane);
            return (
              <section className="gd-lane" key={lane} aria-label={lane}>
                <header>
                  <i data-tone={billLaneStyle[lane].tone} aria-hidden="true">
                    {billLaneStyle[lane].icon}
                  </i>
                  <h3>{lane}</h3>
                  <span>{items.length}</span>
                </header>
                {items.map((item) => (
                  <button
                    className="gd-work-item"
                    type="button"
                    onClick={() => onInspectBill(item)}
                    key={item.id}
                  >
                    <span className="gd-work-titlerow">
                      <strong>{item.name}</strong>
                      <span className="gd-work-amount">{usdExact(item.amount)}</span>
                    </span>
                    <span className="gd-work-detail">{item.description}</span>
                    <span className="gd-work-meta">
                      <span>{item.provider}</span>
                      <span>{item.dueLabel}</span>
                    </span>
                  </button>
                ))}
                {items.length === 0 && <p className="gd-empty">No bills in this lane.</p>}
              </section>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function useNavigationReducedMotion(motion: boolean) {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    update();
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced || !motion;
}

gsap.registerPlugin(useGSAP);

const views = [
  {
    id: "overview",
    label: "Home Overview",
    short: "Home",
    icon: LayoutDashboard,
    description: "Monthly household spending, budget pacing, and recent expenses.",
    prompt: "Search expenses, bills, or categories...",
  },
  {
    id: "trends",
    label: "Spending Trends",
    short: "Trends",
    icon: TrendingUp,
    description: "Compare actual household spending against budget pace and category mix.",
    prompt: "How is spending trending this month?",
  },
  {
    id: "budgets",
    label: "Category Budgets",
    short: "Budgets",
    icon: BarChart3,
    description: "Set monthly limits per category and spot overspending early.",
    prompt: "Which categories are near or over budget?",
  },
  {
    id: "bills",
    label: "Recurring Bills",
    short: "Bills",
    icon: CalendarClock,
    description: "Track due dates, autopay schedules, and mark monthly bills paid.",
    prompt: "Which household bills are due soon?",
  },
] as const;

const routeOrder: View[] = views.map((view) => view.id);

function routeFromHash(): View {
  if (typeof location === "undefined") return "overview";
  const id = location.hash.slice(1);
  return routeOrder.find((view) => view === id) ?? "overview";
}

function saveCsv(filename: string, rows: (string | number)[][]) {
  const csv = buildCsvContent(rows);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function Dock({
  active,
  side = false,
  select,
}: {
  active: View;
  side?: boolean;
  select: (view: View) => void;
}) {
  const nav = useRef<HTMLElement>(null);
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = nav.current;
    const indicator = marker.current;
    if (!container || !indicator) return;
    const adjust = () => {
      const current = container.querySelector<HTMLElement>('[aria-current="page"]');
      if (!current) return;
      indicator.style.width = `${current.offsetWidth}px`;
      indicator.style.height = `${current.offsetHeight}px`;
      indicator.style.transform = `translate(${current.offsetLeft}px, ${current.offsetTop}px)`;
      indicator.dataset.ready = "true";
    };
    const observer = new ResizeObserver(adjust);
    observer.observe(container);
    container.querySelectorAll("a").forEach((link) => observer.observe(link));
    adjust();
    return () => observer.disconnect();
  }, [active]);

  const onSelect = (event: MouseEvent<HTMLAnchorElement>, id: View) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    select(id);
  };

  return (
    <nav
      ref={nav}
      className={side ? "gd-dock gd-dock-side" : "gd-dock gd-dock-bottom"}
      aria-label={side ? "Workspace shortcuts" : "Workspace views"}
    >
      <span ref={marker} className="gd-dock-indicator" aria-hidden="true" />
      {views.map(({ id, label, short, icon: Icon }) => (
        <a
          href={`#${id}`}
          key={id}
          aria-label={label}
          aria-current={active === id ? "page" : undefined}
          onClick={(event) => onSelect(event, id)}
        >
          <Icon aria-hidden="true" />
          <span className="gd-dock-text" aria-hidden="true">
            {label}
          </span>
          <span className="gd-dock-short" aria-hidden="true">
            {short}
          </span>
          {side && (
            <span className="gd-dock-tip" aria-hidden="true">
              {label}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}

type ModalState =
  | { kind: "search" }
  | { kind: "notifications" }
  | { kind: "add-expense" }
  | { kind: "edit-expense"; expense: Expense }
  | { kind: "budgets" }
  | { kind: "add-bill" }
  | { kind: "inspect-bill"; billId: string }
  | null;

export function GlassyDashboard({
  backgroundImage = DEFAULT_HOME_BACKDROP,
  workspaceName = "HEARTH",
  panelFrost = 12,
  initialTheme = "light",
  authUser,
  apiToken,
  initialHouseholdState,
  onSignOut,
}: GlassyDashboardProps) {
  const [state, setState] = useState<HouseholdState>(initialHouseholdState);
  useEffect(() => setState(initialHouseholdState), [initialHouseholdState]);
  const [view, setView] = useState<View>(routeFromHash);
  const [active, setActive] = useState<View>(view);
  const [period, setPeriod] = useState<Period>("30 days");
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => setTheme(initialTheme), [initialTheme]);
  const [modal, setModal] = useState<ModalState>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const referenceDate = getReferenceDate(state.expenses, "2026-11-21");
  const root = useRef<HTMLDivElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const reduced = useNavigationReducedMotion(true);

  const changeView = (next: View) => {
    setActive(next);
    setView(next);
  };

  function selectView(next: View) {
    if (location.hash !== `#${next}`) history.pushState(null, "", `#${next}`);
    changeView(next);
  }

  useEffect(() => {
    const restore = () => {
      const next = routeFromHash();
      setActive(next);
      setView(next);
    };
    addEventListener("popstate", restore);
    addEventListener("hashchange", restore);
    return () => {
      removeEventListener("popstate", restore);
      removeEventListener("hashchange", restore);
    };
  }, []);

  useEffect(() => {
    scrollArea.current?.scrollTo({ top: 0 });
    if (root.current && root.current.getBoundingClientRect().top < -20) {
      root.current.scrollIntoView({ block: "start" });
    }
  }, [view]);

  useGSAP(
    () => {
      const layer = content.current;
      if (!layer) return;
      const counts = layer.querySelectorAll<HTMLElement>("[data-gd-count]");
      gsap.set(layer, { clearProps: "opacity" });
      if (reduced) {
        counts.forEach((el) => {
          el.textContent = formatCount[el.dataset.format as CountFormat](
            Number(el.dataset.gdCount)
          );
        });
        return;
      }
      const animate = gsap.timeline({ defaults: { ease: "power3.out" } });
      animate.fromTo(
        layer,
        { opacity: 0.6 },
        { opacity: 1, clearProps: "opacity", duration: 0.24 },
        0
      );
      animate.from(
        "[data-gd-enter]",
        { y: 18, opacity: 0, stagger: 0.045, duration: 0.5, clearProps: "transform,opacity" },
        0.035
      );
      const bars = layer.querySelectorAll(".gd-stack-bar");
      const line = layer.querySelector(".gd-line-reveal");
      const ring = layer.querySelector(".gd-donut-draw");
      const meters = layer.querySelectorAll(".gd-fill");
      if (bars.length)
        animate.from(bars, { scaleY: 0, stagger: 0.034, duration: 0.46, clearProps: "transform" }, 0.17);
      if (line)
        animate.fromTo(
          line,
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 0.74, clearProps: "clipPath" },
          0.14
        );
      if (ring)
        animate.fromTo(
          ring,
          { attr: { "stroke-dasharray": "0 100" } },
          { attr: { "stroke-dasharray": "100 0" }, duration: 0.76 },
          0.16
        );
      if (meters.length)
        animate.from(meters, { scaleX: 0, duration: 0.58, stagger: 0.045, clearProps: "transform" }, 0.18);
      counts.forEach((el, index) => {
        const value = Number(el.dataset.gdCount);
        const format = formatCount[el.dataset.format as CountFormat];
        const counter = { value: 0 };
        animate.to(
          counter,
          {
            value,
            duration: 0.42,
            onUpdate: () => {
              el.textContent = format(counter.value);
            },
          },
          0.04 + index * 0.015
        );
      });
    },
    { scope: content, dependencies: [view, period, reduced], revertOnUpdate: true }
  );

  const current = views.find((item) => item.id === view)!;
  const attentionBills = state.bills.filter(
    (item) => item.lane === "Due Soon" || item.lane === "Overdue"
  );
  const budgetAlerts = computeMonthlyCategoryHealth(
    state.expenses,
    state.categoryBudgets,
    referenceDate
  ).filter((c) => c.status !== "On Track");
  const alertCount = attentionBills.length + budgetAlerts.length;

  const inspectedBill =
    modal?.kind === "inspect-bill"
      ? state.bills.find((b) => b.id === modal.billId)
      : undefined;

  const close = () => setModal(null);

  const handleApiError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      onSignOut();
      return;
    }
    setSyncError(err instanceof Error ? err.message : "Could not sync changes with PostgreSQL.");
  };

  const handleSaveExpense = async (data: Omit<Expense, "id">, existingId?: string) => {
    setSyncError(null);
    try {
      if (existingId) {
        const updated = await updateExpenseApi(apiToken, existingId, data);
        setState((prev) => ({
          ...prev,
          expenses: prev.expenses.map((e) => (e.id === existingId ? updated : e)),
        }));
      } else {
        const created = await createExpenseApi(apiToken, data);
        setState((prev) => ({
          ...prev,
          expenses: [created, ...prev.expenses],
        }));
      }
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setSyncError(null);
    try {
      await deleteExpenseApi(apiToken, id);
      setState((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== id),
      }));
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleSaveBudgets = async (monthlyBudget: number, categoryBudgets: CategoryBudgets) => {
    setSyncError(null);
    try {
      const saved = await saveBudgetsApi(apiToken, monthlyBudget, categoryBudgets);
      setState((prev) => ({
        ...prev,
        monthlyBudget: saved.monthlyBudget,
        categoryBudgets: saved.categoryBudgets,
      }));
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleAddBill = async (billData: Omit<RecurringBill, "id">) => {
    setSyncError(null);
    try {
      const created = await createBillApi(apiToken, billData);
      setState((prev) => ({
        ...prev,
        bills: [created, ...prev.bills],
      }));
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleMarkBillPaid = async (billId: string) => {
    setSyncError(null);
    try {
      const { bill, addedExpense } = await markBillPaidApi(apiToken, billId, referenceDate);
      setState((prev) => ({
        ...prev,
        bills: prev.bills.map((b) => (b.id === billId ? bill : b)),
        expenses: [addedExpense, ...prev.expenses],
      }));
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleChangeBillLane = async (billId: string, lane: BillLane) => {
    setSyncError(null);
    try {
      const updated = await updateBillLaneApi(apiToken, billId, lane);
      setState((prev) => ({
        ...prev,
        bills: prev.bills.map((b) => (b.id === billId ? updated : b)),
      }));
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleDeleteBill = async (billId: string) => {
    setSyncError(null);
    try {
      await deleteBillApi(apiToken, billId);
      setState((prev) => ({
        ...prev,
        bills: prev.bills.filter((b) => b.id !== billId),
      }));
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleResetSampleData = async () => {
    if (resetting) return;
    setSyncError(null);
    setResetting(true);
    try {
      const freshState = await resetHouseholdApi(apiToken);
      setState(freshState);
    } catch (err) {
      handleApiError(err);
    } finally {
      setResetting(false);
    }
  };

  const downloadExpensesCsv = () => {
    const rows = filterExpensesByPeriod(state.expenses, period, referenceDate);
    saveCsv(`hearth-expenses-${period.replace(" ", "-")}.csv`, [
      ["Date", "Title", "Category", "Amount (USD)", "Payment Method", "Member", "Status", "Notes"],
      ...rows.map((e) => [
        e.date,
        e.title,
        e.category,
        e.amount.toFixed(2),
        e.paymentMethod,
        e.member,
        e.status,
        e.notes ?? "",
      ]),
    ]);
  };

  const downloadBillsCsv = () => {
    saveCsv("hearth-recurring-bills.csv", [
      ["ID", "Bill", "Provider", "Category", "Amount (USD)", "Schedule", "Autopay", "Status"],
      ...state.bills.map((b) => [
        b.id,
        b.name,
        b.provider,
        b.category,
        b.amount.toFixed(2),
        b.dueLabel,
        b.autopay ? "Yes" : "No",
        b.lane,
      ]),
    ]);
  };

  return (
    <div
      className="gd-app"
      data-theme={theme}
      ref={root}
      style={{ "--gd-panel-frost": Math.max(0, Math.min(36, panelFrost)) + "px" } as CSSProperties}
    >
      <style>{dashboardStyles}</style>
      <img
        className="gd-background"
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        fetchPriority="high"
      />
      <div className="gd-surround">
        <header className="gd-top">
          <div className="gd-brand">
            <span className="gd-logo" aria-hidden="true">
              <Home aria-hidden="true" />
            </span>
            <div>
              <strong>{workspaceName}</strong>
              <small>Home Expenses</small>
            </div>
          </div>

          <button
            type="button"
            className="gd-ask"
            aria-label={`Search ${workspaceName} expenses, bills, or views`}
            onClick={() => setModal({ kind: "search" })}
          >
            <span className="gd-orb" aria-hidden="true" />
            <span className="gd-prompt" key={view}>
              {current.prompt}
            </span>
            <Search aria-hidden="true" className="gd-ask-search" />
          </button>

          <div className="gd-top-actions">
            <span className="gd-user-name" title={authUser.email}>
              {authUser.name}
            </span>
            <button
              title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              type="button"
              className="gd-icon-button"
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="gd-icon-button gd-notices"
              aria-label={`Notifications (${alertCount} alert${alertCount === 1 ? "" : "s"})`}
              onClick={() => setModal({ kind: "notifications" })}
            >
              <Bell aria-hidden="true" />
              {alertCount > 0 && (
                <span className="gd-notice-count" aria-hidden="true">
                  {alertCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className="gd-signout-btn"
              aria-label="Sign out"
              onClick={onSignOut}
            >
              <LogOut aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <div className="gd-stage-wrap">
          <Dock active={active} side select={selectView} />
          <main className="gd-stage">
            <div className="gd-stage-scroll" ref={scrollArea}>
              {syncError && (
                <div className="gd-sync-error" role="alert">
                  <span className="gd-sync-error-msg">
                    <TriangleAlert aria-hidden="true" />
                    <span>{syncError}</span>
                  </span>
                  <button
                    type="button"
                    className="gd-small-btn"
                    onClick={() => setSyncError(null)}
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <header className="gd-view-head">
                <div>
                  <h1>{current.label}</h1>
                  <p>{current.description}</p>
                </div>
                <div className="gd-view-actions">
                  {view !== "bills" && (
                    <div className="gd-period" role="group" aria-label="Reporting period">
                      {PERIODS.map((item) => (
                        <button
                          type="button"
                          key={item}
                          aria-pressed={item === period}
                          onClick={() => setPeriod(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                  {view === "overview" && (
                    <button
                      type="button"
                      className="gd-primary"
                      onClick={() => setModal({ kind: "add-expense" })}
                    >
                      <Plus aria-hidden="true" />
                      Log expense
                    </button>
                  )}
                  {(view === "trends" || view === "bills") && (
                    <button
                      type="button"
                      className="gd-primary gd-export"
                      onClick={view === "bills" ? downloadBillsCsv : downloadExpensesCsv}
                    >
                      <ArrowDownToLine aria-hidden="true" />
                      Export CSV
                    </button>
                  )}
                </div>
              </header>

              <div className="gd-content" ref={content} key={view} data-view={view}>
                {view === "overview" && (
                  <OverviewView
                    state={state}
                    period={period}
                    referenceDate={referenceDate}
                    open={selectView}
                    onLogExpense={() => setModal({ kind: "add-expense" })}
                    onEditExpense={(expense) => setModal({ kind: "edit-expense", expense })}
                    onEditBudgets={() => setModal({ kind: "budgets" })}
                  />
                )}
                {view === "trends" && (
                  <TrendsView
                    state={state}
                    period={period}
                    referenceDate={referenceDate}
                    download={downloadExpensesCsv}
                  />
                )}
                {view === "budgets" && (
                  <BudgetsView
                    state={state}
                    period={period}
                    referenceDate={referenceDate}
                    onEditBudgets={() => setModal({ kind: "budgets" })}
                    onLogExpense={() => setModal({ kind: "add-expense" })}
                    onEditExpense={(expense) => setModal({ kind: "edit-expense", expense })}
                  />
                )}
                {view === "bills" && (
                  <BillsView
                    bills={state.bills}
                    onInspectBill={(bill) => setModal({ kind: "inspect-bill", billId: bill.id })}
                    onAddBill={() => setModal({ kind: "add-bill" })}
                  />
                )}
              </div>
            </div>
          </main>
          <Dock active={active} select={selectView} />
        </div>

        <footer className="gd-footer">
          <span className="gd-footer-pill">Synced with Neon Postgres · {authUser.email}</span>
          <button
            type="button"
            className="gd-footer-pill gd-footer-reset"
            disabled={resetting}
            onClick={handleResetSampleData}
          >
            <RotateCcw aria-hidden="true" />
            {resetting ? "Resetting..." : "Reset sample data"}
          </button>
        </footer>
      </div>

      {modal?.kind === "search" && (
        <QuickSearchDialog
          workspaceName={workspaceName}
          views={views}
          expenses={state.expenses}
          bills={state.bills}
          onSelectView={(id) => selectView(id as View)}
          onSelectExpense={(expense) => setModal({ kind: "edit-expense", expense })}
          onSelectBill={(bill) => {
            selectView("bills");
            setModal({ kind: "inspect-bill", billId: bill.id });
          }}
          close={close}
        />
      )}

      {modal?.kind === "notifications" && (
        <NotificationsDialog
          attentionBills={attentionBills}
          budgetAlerts={budgetAlerts}
          onInspectBill={(bill) => {
            selectView("bills");
            setModal({ kind: "inspect-bill", billId: bill.id });
          }}
          onOpenBudgets={() => selectView("budgets")}
          close={close}
        />
      )}

      {modal?.kind === "add-expense" && (
        <ExpenseFormDialog
          defaultDate={referenceDate}
          onSave={handleSaveExpense}
          close={close}
        />
      )}

      {modal?.kind === "edit-expense" && (
        <ExpenseFormDialog
          initialExpense={modal.expense}
          defaultDate={referenceDate}
          onSave={handleSaveExpense}
          onDelete={handleDeleteExpense}
          close={close}
        />
      )}

      {modal?.kind === "budgets" && (
        <BudgetSettingsDialog
          monthlyBudget={state.monthlyBudget}
          categoryBudgets={state.categoryBudgets}
          onSave={handleSaveBudgets}
          close={close}
        />
      )}

      {modal?.kind === "add-bill" && (
        <BillFormDialog onSave={handleAddBill} close={close} />
      )}

      {modal?.kind === "inspect-bill" && inspectedBill && (
        <BillDetailDialog
          bill={inspectedBill}
          onMarkPaid={handleMarkBillPaid}
          onChangeLane={handleChangeBillLane}
          onDelete={handleDeleteBill}
          close={close}
        />
      )}
    </div>
  );
}

export default GlassyDashboard;
