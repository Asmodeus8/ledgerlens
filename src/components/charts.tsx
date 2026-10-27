"use client";

import { useState } from "react";
import { formatCompactMoney, formatMoney } from "@/lib/format";

export type ColumnPoint = { key: string; label: string; fullLabel: string; value: number };

/** Round tick values (0, 5K, 10K…) covering `max` in about `target` steps. */
export function niceTicks(max: number, target = 3): number[] {
  if (max <= 0) return [0];
  const raw = max / target;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
  return ticks;
}

/**
 * Single-series column chart. One hue, no legend (the card title names the series),
 * hairline grid, 24px max columns with a 4px rounded cap, value on the latest column,
 * per-column tooltip on hover and keyboard focus, and a table for screen readers.
 */
export function ColumnChart({
  points,
  currency,
  caption,
}: {
  points: ColumnPoint[];
  currency: string;
  caption: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const ticks = niceTicks(Math.max(...points.map((p) => p.value)));
  const top = ticks[ticks.length - 1] || 1;
  const latest = points.length - 1;

  return (
    <figure className="pt-3">
      <div className="flex h-56 gap-3">
        {/* Y axis */}
        <div className="relative w-12 shrink-0 text-right text-[11px] text-subtle tabular-nums" aria-hidden>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2"
              style={{ bottom: `${(t / top) * 100}%` }}
            >
              {formatCompactMoney(t, currency)}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* Gridlines */}
          {ticks.map((t) => (
            <div
              key={t}
              aria-hidden
              className="absolute inset-x-0 h-px bg-chart-grid"
              style={{ bottom: `${(t / top) * 100}%` }}
            />
          ))}

          {/* Columns */}
          <div className="absolute inset-0 flex items-end" aria-hidden>
            {points.map((p, i) => {
              const height = (p.value / top) * 100;
              const isActive = active === i;
              return (
                <div
                  key={p.key}
                  tabIndex={0}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
                >
                  {i === latest && p.value > 0 && !isActive && (
                    <span
                      className="absolute -translate-y-full pb-1.5 text-[11px] font-medium text-foreground tabular-nums"
                      style={{ bottom: `${height}%` }}
                    >
                      {formatCompactMoney(p.value, currency)}
                    </span>
                  )}
                  <div
                    className={`w-full max-w-6 rounded-t-[4px] bg-chart-1 transition-[opacity,height] duration-300 ${
                      active !== null && !isActive ? "opacity-45" : ""
                    } group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-surface`}
                    style={{ height: p.value > 0 ? `max(${height}%, 2px)` : "0" }}
                  />
                  {isActive && (
                    <div
                      className="pointer-events-none absolute z-10 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-left whitespace-nowrap shadow-md"
                      style={{ bottom: `calc(${height}% + 8px)` }}
                    >
                      <p className="money text-sm font-semibold">{formatMoney(p.value, currency)}</p>
                      <p className="text-[11px] text-muted">{p.fullLabel}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X axis */}
      <div className="mt-2 flex gap-3" aria-hidden>
        <div className="w-12 shrink-0" />
        <div className="flex flex-1">
          {points.map((p, i) => (
            <span
              key={p.key}
              className={`flex-1 text-center text-[11px] ${i === latest ? "font-medium text-foreground" : "text-subtle"}`}
            >
              {p.label}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Spend</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.key}>
              <td>{p.fullLabel}</td>
              <td>{formatMoney(p.value, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
