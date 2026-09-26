import type { RiskLevel } from "@/lib/types";

const levelColor: Record<RiskLevel, string> = {
  low: "var(--status-good)",
  medium: "var(--status-warning)",
  high: "var(--status-serious)",
  critical: "var(--status-critical)",
};

export function ScoreRing({
  score,
  level,
  size = 168,
  stroke = 12,
  onDark = false,
  label,
}: {
  score: number;
  level: RiskLevel;
  size?: number;
  stroke?: number;
  onDark?: boolean;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={onDark ? "rgba(255,255,255,0.12)" : "var(--surface-muted)"}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={levelColor[level]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-semibold leading-none tracking-tight" style={{ fontSize: size * 0.3 }}>
          {score}
        </span>
        {label && (
          <span
            className="mt-1 font-medium uppercase tracking-wider"
            style={{ fontSize: Math.max(9, size * 0.06), opacity: 0.6 }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
