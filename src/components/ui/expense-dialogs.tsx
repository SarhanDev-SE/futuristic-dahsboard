import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Bell,
  ChevronRight,
  CircleCheck,
  Search,
  Trash2,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  BILL_LANES,
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  HOUSEHOLD_MEMBERS,
  PAYMENT_METHODS,
  validateBillInput,
  validateExpenseInput,
  type BillLane,
  type CategoryBudgets,
  type CategoryBudgetHealth,
  type Expense,
  type ExpenseCategory,
  type ExpenseStatus,
  type HouseholdMember,
  type PaymentMethod,
  type RecurringBill,
} from "../../lib/expenses";
import { usdExact } from "./expense-charts";

export function Dialog({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const label = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    const firstInput = dialog?.querySelector<HTMLElement>("input, select");
    firstInput?.focus();
  }, []);

  return (
    <dialog
      className="gd-dialog"
      ref={ref}
      aria-labelledby={label}
      onClose={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <section className="gd-dialog-inner">
        <header>
          <h2 id={label}>{title}</h2>
          <button
            type="button"
            className="gd-icon-button"
            aria-label={`Close ${title}`}
            onClick={() => ref.current?.close()}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </dialog>
  );
}

export function ExpenseFormDialog({
  initialExpense,
  defaultDate,
  onSave,
  onDelete,
  close,
}: {
  initialExpense?: Expense;
  defaultDate: string;
  onSave: (expense: Omit<Expense, "id">, existingId?: string) => void;
  onDelete?: (id: string) => void;
  close: () => void;
}) {
  const [title, setTitle] = useState(initialExpense?.title ?? "");
  const [amount, setAmount] = useState(initialExpense ? String(initialExpense.amount) : "");
  const [category, setCategory] = useState<ExpenseCategory>(initialExpense?.category ?? "Groceries");
  const [date, setDate] = useState(initialExpense?.date ?? defaultDate);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialExpense?.paymentMethod ?? "Household Card"
  );
  const [member, setMember] = useState<HouseholdMember>(initialExpense?.member ?? "Shared");
  const [status, setStatus] = useState<ExpenseStatus>(initialExpense?.status ?? "Cleared");
  const [notes, setNotes] = useState(initialExpense?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateExpenseInput({ title, amount, date });
    if (validationError) {
      setError(validationError);
      return;
    }
    onSave(
      {
        title: title.trim(),
        amount: Math.round(Number(amount) * 100) / 100,
        category,
        date,
        paymentMethod,
        member,
        status,
        notes: notes.trim() || undefined,
      },
      initialExpense?.id
    );
    close();
  };

  return (
    <Dialog title={initialExpense ? "Edit expense" : "Log expense"} close={close}>
      <form className="gd-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="gd-form-error" role="alert">
            <TriangleAlert aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
        <div className="gd-form-grid">
          <label className="gd-field gd-field-span">
            <span>Merchant or description</span>
            <input
              type="text"
              placeholder="e.g. Trader Joe's, Electric Bill"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              required
            />
          </label>
          <label className="gd-field">
            <span>Amount (USD)</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (error) setError(null);
              }}
              required
            />
          </label>
          <label className="gd-field">
            <span>Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (error) setError(null);
              }}
              required
            />
          </label>
          <label className="gd-field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="gd-field">
            <span>Payment method</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="gd-field">
            <span>Household member</span>
            <select value={member} onChange={(e) => setMember(e.target.value as HouseholdMember)}>
              {HOUSEHOLD_MEMBERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="gd-field">
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as ExpenseStatus)}>
              {EXPENSE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="gd-field gd-field-span">
            <span>Notes (optional)</span>
            <input
              type="text"
              placeholder="Receipt memo or split details"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>
        <div className="gd-form-actions">
          {initialExpense && onDelete && (
            <button
              type="button"
              className="gd-danger-btn"
              onClick={() => {
                onDelete(initialExpense.id);
                close();
              }}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </button>
          )}
          <div className="gd-form-actions-right">
            <button type="button" className="gd-secondary" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="gd-primary">
              {initialExpense ? "Save changes" : "Add expense"}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

export function BudgetSettingsDialog({
  monthlyBudget,
  categoryBudgets,
  onSave,
  close,
}: {
  monthlyBudget: number;
  categoryBudgets: CategoryBudgets;
  onSave: (monthlyBudget: number, categoryBudgets: CategoryBudgets) => void;
  close: () => void;
}) {
  const [overall, setOverall] = useState(String(monthlyBudget));
  const [cats, setCats] = useState<Record<ExpenseCategory, string>>(() => {
    const record = {} as Record<ExpenseCategory, string>;
    for (const cat of EXPENSE_CATEGORIES) {
      record[cat] = String(categoryBudgets[cat] ?? 0);
    }
    return record;
  });
  const [error, setError] = useState<string | null>(null);

  const allocatedSum = EXPENSE_CATEGORIES.reduce(
    (sum, cat) => sum + Math.max(0, Number(cats[cat]) || 0),
    0
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const overallNum = Number(overall);
    if (!Number.isFinite(overallNum) || overallNum <= 0) {
      setError("Monthly household budget must be greater than $0.");
      return;
    }
    const nextCats = {} as CategoryBudgets;
    for (const cat of EXPENSE_CATEGORIES) {
      const val = Number(cats[cat]);
      if (!Number.isFinite(val) || val < 0) {
        setError(`Budget for ${cat} must be $0 or more.`);
        return;
      }
      nextCats[cat] = Math.round(val);
    }
    onSave(Math.round(overallNum), nextCats);
    close();
  };

  return (
    <Dialog title="Monthly budgets" close={close}>
      <form className="gd-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="gd-form-error" role="alert">
            <TriangleAlert aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
        <label className="gd-field">
          <span>Total monthly household budget (USD)</span>
          <input
            type="number"
            min="1"
            step="10"
            value={overall}
            onChange={(e) => {
              setOverall(e.target.value);
              if (error) setError(null);
            }}
            required
          />
        </label>
        <div className="gd-budget-alloc-note">
          <span>Category caps total: {usdExact(allocatedSum)}</span>
        </div>
        <div className="gd-form-grid">
          {EXPENSE_CATEGORIES.map((cat) => (
            <label className="gd-field" key={cat}>
              <span>{cat}</span>
              <input
                type="number"
                min="0"
                step="10"
                value={cats[cat]}
                onChange={(e) => {
                  const val = e.target.value;
                  setCats((prev) => ({ ...prev, [cat]: val }));
                  if (error) setError(null);
                }}
              />
            </label>
          ))}
        </div>
        <div className="gd-form-actions">
          <div className="gd-form-actions-right">
            <button type="button" className="gd-secondary" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="gd-primary">
              Save budgets
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

export function BillFormDialog({
  onSave,
  close,
}: {
  onSave: (bill: Omit<RecurringBill, "id">) => void;
  close: () => void;
}) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Housing & Utilities");
  const [dueDay, setDueDay] = useState("25");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Checking");
  const [autopay, setAutopay] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateBillInput({ name, amount, dueDay, provider });
    if (validationError) {
      setError(validationError);
      return;
    }
    const dayNum = Number(dueDay);
    onSave({
      name: name.trim(),
      provider: provider.trim(),
      amount: Math.round(Number(amount) * 100) / 100,
      category,
      dueDay: dayNum,
      dueLabel: autopay ? `Autopay day ${dayNum}` : `Due day ${dayNum}`,
      autopay,
      lane: autopay ? "Autopay Scheduled" : "Due Soon",
      paymentMethod,
      description:
        description.trim() || `Monthly recurring ${category.toLowerCase()} bill from ${provider.trim()}.`,
    });
    close();
  };

  return (
    <Dialog title="Add recurring bill" close={close}>
      <form className="gd-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="gd-form-error" role="alert">
            <TriangleAlert aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
        <div className="gd-form-grid">
          <label className="gd-field">
            <span>Bill name</span>
            <input
              type="text"
              placeholder="e.g. City Trash Service"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              required
            />
          </label>
          <label className="gd-field">
            <span>Provider / payee</span>
            <input
              type="text"
              placeholder="e.g. Metro Utilities"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                if (error) setError(null);
              }}
              required
            />
          </label>
          <label className="gd-field">
            <span>Amount (USD)</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (error) setError(null);
              }}
              required
            />
          </label>
          <label className="gd-field">
            <span>Monthly due day (1-31)</span>
            <input
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => {
                setDueDay(e.target.value);
                if (error) setError(null);
              }}
              required
            />
          </label>
          <label className="gd-field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="gd-field">
            <span>Payment method</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="gd-field gd-field-span">
            <span>Notes (optional)</span>
            <input
              type="text"
              placeholder="Account note or billing cycle"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="gd-checkbox gd-field-span">
            <input
              type="checkbox"
              checked={autopay}
              onChange={(e) => setAutopay(e.target.checked)}
            />
            <span>Enrolled in automatic payment</span>
          </label>
        </div>
        <div className="gd-form-actions">
          <div className="gd-form-actions-right">
            <button type="button" className="gd-secondary" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="gd-primary">
              Save bill
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

export function BillDetailDialog({
  bill,
  onMarkPaid,
  onChangeLane,
  onDelete,
  close,
}: {
  bill: RecurringBill;
  onMarkPaid: (id: string) => void;
  onChangeLane: (id: string, lane: BillLane) => void;
  onDelete: (id: string) => void;
  close: () => void;
}) {
  const statusTone =
    bill.lane === "Paid" ? "teal" : bill.lane === "Overdue" || bill.lane === "Due Soon" ? "coral" : "ink";

  return (
    <Dialog title={bill.name} close={close}>
      <span className="gd-status" data-state={statusTone}>
        <i aria-hidden="true" />
        {bill.lane}
      </span>
      <p className="gd-work-dialog-description">{bill.description}</p>
      <dl className="gd-work-facts">
        <div>
          <dt>Amount</dt>
          <dd>{usdExact(bill.amount)}</dd>
        </div>
        <div>
          <dt>Provider</dt>
          <dd>{bill.provider}</dd>
        </div>
        <div>
          <dt>Schedule</dt>
          <dd>{bill.dueLabel}</dd>
        </div>
      </dl>
      <div className="gd-bill-lane-row">
        <label className="gd-field">
          <span>Move status</span>
          <select
            value={bill.lane}
            onChange={(e) => {
              onChangeLane(bill.id, e.target.value as BillLane);
            }}
          >
            {BILL_LANES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="gd-form-actions">
        <button
          type="button"
          className="gd-danger-btn"
          onClick={() => {
            onDelete(bill.id);
            close();
          }}
        >
          <Trash2 aria-hidden="true" />
          Remove
        </button>
        <div className="gd-form-actions-right">
          {bill.lane !== "Paid" && (
            <button
              type="button"
              className="gd-primary"
              onClick={() => {
                onMarkPaid(bill.id);
                close();
              }}
            >
              <CircleCheck aria-hidden="true" />
              Mark as paid
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

export interface SearchViewOption {
  id: string;
  label: string;
  description: string;
  prompt: string;
  icon: LucideIcon;
}

export function QuickSearchDialog({
  workspaceName,
  views,
  expenses,
  bills,
  onSelectView,
  onSelectExpense,
  onSelectBill,
  close,
}: {
  workspaceName: string;
  views: readonly SearchViewOption[];
  expenses: Expense[];
  bills: RecurringBill[];
  onSelectView: (id: string) => void;
  onSelectExpense: (expense: Expense) => void;
  onSelectBill: (bill: RecurringBill) => void;
  close: () => void;
}) {
  const [query, setQuery] = useState("");
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

  const matchingViews = views.filter((v) =>
    terms.every((t) => `${v.label} ${v.description} ${v.prompt}`.toLowerCase().includes(t))
  );

  const matchingExpenses =
    terms.length === 0
      ? expenses.slice(0, 3)
      : expenses
          .filter((e) =>
            terms.every((t) => `${e.title} ${e.category} ${e.paymentMethod} ${e.member}`.toLowerCase().includes(t))
          )
          .slice(0, 4);

  const matchingBills =
    terms.length === 0
      ? []
      : bills
          .filter((b) =>
            terms.every((t) => `${b.name} ${b.provider} ${b.category} ${b.lane}`.toLowerCase().includes(t))
          )
          .slice(0, 3);

  const hasResults = matchingViews.length > 0 || matchingExpenses.length > 0 || matchingBills.length > 0;

  return (
    <Dialog title={`Search ${workspaceName}`} close={close}>
      <label className="gd-search gd-command-input">
        <Search aria-hidden="true" />
        <input
          type="search"
          aria-label="Search views, expenses, or bills"
          placeholder="Search expenses, categories, bills, or views"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="gd-quick-list">
        {matchingViews.map(({ label, id, description, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              close();
              onSelectView(id);
            }}
          >
            <Icon aria-hidden="true" />
            <div>
              <strong>{label}</strong>
              <small>{description}</small>
            </div>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
        {matchingExpenses.map((exp) => (
          <button
            key={exp.id}
            type="button"
            onClick={() => {
              close();
              onSelectExpense(exp);
            }}
          >
            <Search aria-hidden="true" />
            <div>
              <strong>
                {exp.title} · {usdExact(exp.amount)}
              </strong>
              <small>
                {exp.category} · {exp.date}
              </small>
            </div>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
        {matchingBills.map((bill) => (
          <button
            key={bill.id}
            type="button"
            onClick={() => {
              close();
              onSelectBill(bill);
            }}
          >
            <Bell aria-hidden="true" />
            <div>
              <strong>
                {bill.name} · {usdExact(bill.amount)}
              </strong>
              <small>
                {bill.lane} · {bill.dueLabel}
              </small>
            </div>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
        {!hasResults && (
          <p className="gd-empty" role="status">
            No matching views, expenses, or bills.
          </p>
        )}
      </div>
    </Dialog>
  );
}

export function NotificationsDialog({
  attentionBills,
  budgetAlerts,
  onInspectBill,
  onOpenBudgets,
  close,
}: {
  attentionBills: RecurringBill[];
  budgetAlerts: CategoryBudgetHealth[];
  onInspectBill: (bill: RecurringBill) => void;
  onOpenBudgets: () => void;
  close: () => void;
}) {
  const hasAny = attentionBills.length > 0 || budgetAlerts.length > 0;
  return (
    <Dialog title="Household alerts" close={close}>
      <div className="gd-quick-list">
        {attentionBills.map((bill) => (
          <button
            type="button"
            key={bill.id}
            onClick={() => {
              close();
              onInspectBill(bill);
            }}
          >
            <Bell aria-hidden="true" />
            <div>
              <strong>
                {bill.name} · {usdExact(bill.amount)}
              </strong>
              <small>
                {bill.lane} · {bill.dueLabel} ({bill.provider})
              </small>
            </div>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
        {budgetAlerts.map((cat) => (
          <button
            type="button"
            key={cat.category}
            onClick={() => {
              close();
              onOpenBudgets();
            }}
          >
            <TriangleAlert aria-hidden="true" />
            <div>
              <strong>
                {cat.category} · {cat.status}
              </strong>
              <small>
                {usdExact(cat.spent)} of {usdExact(cat.limit)} monthly limit ({Math.round(cat.utilizationPercent)}%)
              </small>
            </div>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
        {!hasAny && <p className="gd-empty">All bills and category budgets are on track.</p>}
      </div>
    </Dialog>
  );
}
