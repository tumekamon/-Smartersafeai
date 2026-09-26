"use client";

import { useState } from "react";

export type TrendPoint = {
  label: string;
  raised: number;
  closed: number;
  inspections: number;
};

const W = 720;
const H = 264;
const PAD = { top: 20, right: 20, bottom: 30, left: 36 };

function niceStep(v: number) {
  const raw = Math.max(v / 4, 1);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const step = niceStep(Math.max(...points.map((p) => Math.max(p.raised, p.closed)), 1));
  const max = step * 4;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const path = (key: "raised" | "closed") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const area = `${path("raised")} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, step, step * 2, step * 3, step * 4].map((t) => Math.round(t * 10) / 10);
  const last = points.length - 1;
  const active = hover ?? last;
  const activePoint = points[active];

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(last, Math.round(rel * last))));
  }

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-foreground/70">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: "var(--chart-series-1)" }} />
          Findings raised
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: "var(--chart-series-3)" }} />
          Actions closed
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Findings raised and actions closed per week">
        {ticks.map((t, i) => (
          <g key={`${t}-${i}`}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--chart-gridline)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--chart-ink-muted)">
              {t}
            </text>
          </g>
        ))}

        {points.map((p, i) =>
          i % 2 === 0 || i === last ? (
            <text key={p.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--chart-ink-muted)">
              {p.label}
            </text>
          ) : null
        )}

        <path d={area} fill="var(--chart-series-1)" opacity={0.1} />
        <path d={path("raised")} fill="none" stroke="var(--chart-series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={path("closed")} fill="none" stroke="var(--chart-series-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--chart-ink-muted)" strokeWidth={1} opacity={0.5} />
        <circle cx={x(active)} cy={y(activePoint.raised)} r={5} fill="var(--chart-series-1)" stroke="var(--surface)" strokeWidth={2} />
        <circle cx={x(active)} cy={y(activePoint.closed)} r={5} fill="var(--chart-series-3)" stroke="var(--surface)" strokeWidth={2} />

        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      <div
        className={`pointer-events-none absolute top-8 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg transition-opacity ${hover === null ? "opacity-0" : "opacity-100"}`}
        style={{
          left: `${(x(active) / W) * 100}%`,
          transform: `translateX(${active > points.length * 0.6 ? "-108%" : "8%"})`,
        }}
      >
        <p className="mb-1 font-semibold">Week of {activePoint.label}</p>
        <p className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--chart-series-1)" }} />
          Raised <span className="ml-auto font-semibold">{activePoint.raised}</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--chart-series-3)" }} />
          Closed <span className="ml-auto font-semibold">{activePoint.closed}</span>
        </p>
        <p className="mt-1 text-foreground/50">{activePoint.inspections} inspections</p>
      </div>
    </div>
  );
}
