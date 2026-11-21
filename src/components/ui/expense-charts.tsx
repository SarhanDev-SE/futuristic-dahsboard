import { useId, useState, type CSSProperties } from "react";
import type { CategoryBreakdownItem, ChartTone, SeriesBucket } from "../../lib/expenses";

export const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
}).format;

export const usdExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format;

export const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
}).format;

export const wholeNumber = new Intl.NumberFormat("en-US");

export type CountFormat = "number" | "usd" | "compact" | "percent";

export const formatCount: Record<CountFormat, (value: number) => string> = {
  number: (value) => wholeNumber.format(Math.round(value)),
  usd,
  compact: usdCompact,
  percent: (value) => `${value.toFixed(1)}%`,
};

export function Counter({ value, format = "number" }: { value: number; format?: CountFormat }) {
  const text = formatCount[format](value);
  return (
    <>
      <span data-gd-count={value} data-format={format} aria-hidden="true">
        {text}
      </span>
      <span className="gd-sr">{text}</span>
    </>
  );
}

export function Legend({ entries }: { entries: { label: string; tone: ChartTone }[] }) {
  return (
    <div className="gd-legend">
      {entries.map(({ label, tone }) => (
        <span key={label}>
          <i data-tone={tone} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

export type Stack = { label: string; lower: number; upper: number };

export function StackChart({
  items,
  labels,
  tones,
  format,
  title,
}: {
  items: Stack[];
  labels: [string, string];
  tones: [ChartTone, ChartTone];
  format: (value: number) => string;
  title: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...items.map((item) => item.lower + item.upper)) * 1.12;
  const selected = active === null ? undefined : items[active];

  return (
    <figure className="gd-stack" aria-label={title}>
      <div className="gd-stack-meta">
        <Legend entries={labels.map((label, index) => ({ label, tone: tones[index] }))} />
        {selected && (
          <span className="gd-chart-readout">
            {selected.label} · {format(selected.lower + selected.upper)}
          </span>
        )}
      </div>
      <div
        className="gd-stack-plot"
        style={{ "--gd-series-count": items.length } as CSSProperties}
        onMouseLeave={() => setActive(null)}
      >
        {items.map((item, index) => {
          const total = item.lower + item.upper;
          const heightPct = total > 0 ? Math.max(4, (total / max) * 100) : 0;
          return (
            <button
              type="button"
              className="gd-stack-column"
              key={item.label}
              aria-label={`${item.label}: ${format(item.lower)} ${labels[0]}, ${format(item.upper)} ${labels[1]}`}
              aria-pressed={active === index}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              onMouseEnter={() => setActive(index)}
              onClick={() => setActive(index)}
            >
              <span className="gd-stack-track" aria-hidden="true">
                {total > 0 && (
                  <span className="gd-stack-bar" style={{ height: `${heightPct}%` }}>
                    {item.upper > 0 && <i data-tone={tones[1]} style={{ flexGrow: item.upper }} />}
                    {item.lower > 0 && <i data-tone={tones[0]} style={{ flexGrow: item.lower }} />}
                  </span>
                )}
              </span>
              <span className="gd-stack-label" aria-hidden="true">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </figure>
  );
}

type Point = [number, number];

function curve(points: Point[]) {
  return points.reduce((path, [x, y], index) => {
    if (index === 0) return `M ${x} ${y}`;
    const [previousX, previousY] = points[index - 1];
    const midpoint = (x + previousX) / 2;
    return `${path} C ${midpoint} ${previousY}, ${midpoint} ${y}, ${x} ${y}`;
  }, "");
}

export function SpendingChart({ buckets }: { buckets: SeriesBucket[] }) {
  const fillId = `spend-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [active, setActive] = useState<number | null>(null);
  const plotHeight = 204;
  const width = 600;
  const totals = buckets.map((b) => b.total);
  const paces = buckets.map((b) => b.budgetPace);
  const rawMax = Math.max(200, ...totals, ...paces) * 1.14;
  const stepUnit = rawMax > 2500 ? 500 : rawMax > 800 ? 200 : 100;
  const max = Math.ceil(rawMax / stepUnit) * stepUnit;

  const points = (values: number[]): Point[] =>
    values.map((value, index) => [
      (index * width) / Math.max(1, values.length - 1),
      plotHeight - (value / max) * plotHeight,
    ]);

  const spendPoints = points(totals);
  const pacePoints = points(paces);
  const spendLine = curve(spendPoints);
  const last = ((spendPoints.length - 1) * width) / Math.max(1, spendPoints.length - 1);
  const point = active === null ? undefined : spendPoints[active];
  const pacePoint = active === null ? undefined : pacePoints[active];
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];

  return (
    <figure className="gd-revenue-chart" aria-label="Actual household spending versus budget pace">
      <div className="gd-revenue-main">
        <div className="gd-chart-y" aria-hidden="true">
          {ticks.map((value) => (
            <span key={value}>
              {value === 0 ? "$0" : value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${Math.round(value)}`}
            </span>
          ))}
        </div>
        <div className="gd-line-plot" onMouseLeave={() => setActive(null)}>
          <svg viewBox={`0 0 ${width} ${plotHeight}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox">
                <stop offset="0" stopColor="var(--gd-coral)" stopOpacity=".30" />
                <stop offset="1" stopColor="var(--gd-coral)" stopOpacity=".025" />
              </linearGradient>
            </defs>
            {ticks.map((tick, index) => (
              <line
                className="gd-grid-line"
                key={tick}
                x1="0"
                x2={width}
                y1={(plotHeight * index) / 4}
                y2={(plotHeight * index) / 4}
              />
            ))}
            <g className="gd-line-reveal">
              <path d={`${spendLine} L ${last} ${plotHeight} H 0 Z`} fill={`url(#${fillId})`} />
              <path className="gd-chart-path" data-tone="coral" d={spendLine} />
              <path className="gd-chart-path" data-tone="ink" d={curve(pacePoints)} />
            </g>
            {point && pacePoint && (
              <g>
                <line className="gd-line-cursor" x1={point[0]} x2={point[0]} y1="0" y2={plotHeight} />
                <circle cx={point[0]} cy={point[1]} r="4" fill="var(--gd-coral)" />
                <circle cx={pacePoint[0]} cy={pacePoint[1]} r="4" fill="var(--gd-graph-ink)" />
              </g>
            )}
          </svg>
          <div className="gd-chart-zones">
            {buckets.map((bucket, index) => (
              <button
                type="button"
                key={bucket.label}
                aria-label={`${bucket.label}, spent ${usd(bucket.total)}, budget pace ${usd(bucket.budgetPace)}`}
                aria-pressed={active === index}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                onMouseEnter={() => setActive(index)}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
          {active !== null && buckets[active] && (
            <div
              className="gd-line-tooltip"
              style={{ "--gd-tooltip-x": `${(active / Math.max(1, buckets.length - 1)) * 100}%` } as CSSProperties}
            >
              <strong>{buckets[active].label}</strong>
              <span>
                Actual spend <b>{usd(buckets[active].total)}</b>
              </span>
              <span>
                Budget pace <b>{usd(buckets[active].budgetPace)}</b>
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="gd-chart-axis" aria-hidden="true">
        {buckets.map((bucket) => (
          <span key={bucket.label}>{bucket.label}</span>
        ))}
      </div>
    </figure>
  );
}

export function CategoryMixChart({
  items,
  totalSpent,
}: {
  items: CategoryBreakdownItem[];
  totalSpent: number;
}) {
  const maskId = `gd-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [active, setActive] = useState<number | null>(null);
  const topItems = items.slice(0, 4);

  return (
    <div className="gd-device" aria-label="Spending by category">
      <div className="gd-device-ring">
        <svg viewBox="0 0 124 124" aria-hidden="true">
          <defs>
            <mask id={maskId}>
              <circle
                className="gd-donut-draw"
                cx="62"
                cy="62"
                r="47"
                fill="none"
                stroke="white"
                strokeWidth="15"
                pathLength="100"
                strokeDasharray="100 0"
                transform="rotate(-90 62 62)"
              />
            </mask>
          </defs>
          <circle cx="62" cy="62" r="47" fill="none" stroke="var(--gd-track)" strokeWidth="14" />
          <g mask={`url(#${maskId})`} transform="rotate(-90 62 62)">
            {topItems.map((item, index) => (
              <circle
                key={item.category}
                cx="62"
                cy="62"
                r="47"
                pathLength="100"
                fill="none"
                strokeWidth="14"
                data-tone={item.tone}
                className="gd-device-segment"
                data-muted={active !== null && index !== active}
                strokeDasharray={`${Math.max(0, item.percentOfTotal - 1.1)} 100`}
                strokeDashoffset={-topItems.slice(0, index).reduce((sum, entry) => sum + entry.percentOfTotal, 0)}
              />
            ))}
          </g>
        </svg>
        <div className="gd-device-total">
          <strong>
            {active === null || !topItems[active] ? (
              <Counter value={totalSpent} format="compact" />
            ) : (
              usd(topItems[active].spent)
            )}
          </strong>
          <span>{active === null || !topItems[active] ? "Total spent" : topItems[active].category}</span>
        </div>
      </div>
      <div className="gd-device-list">
        {topItems.map((item, index) => (
          <button
            type="button"
            key={item.category}
            aria-pressed={active === index}
            aria-label={`${item.category}, ${item.percentOfTotal}% of spending (${usd(item.spent)})`}
            onClick={() => setActive(active === index ? null : index)}
          >
            <span className="gd-cat-label">
              <i data-tone={item.tone} aria-hidden="true" />
              <span className="gd-cat-name">{item.category.split(" & ")[0]}</span>
            </span>
            <span className="gd-mix-track" aria-hidden="true">
              <i className="gd-fill" data-tone={item.tone} style={{ width: `${item.percentOfTotal}%` }} />
            </span>
            <strong>{item.percentOfTotal}%</strong>
          </button>
        ))}
        {topItems.length === 0 && <p className="gd-empty">No spending recorded in this period.</p>}
      </div>
    </div>
  );
}
