export function Sparkline({
  values,
  width = 96,
  height = 32,
  color = "var(--chart-series-1)",
  ring = "var(--surface)",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  ring?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pad = 4;
  const step = (width - pad * 2) / (values.length - 1);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const pts = values.map((v, i) => [pad + i * step, y(v)] as const);
  const line = pts.map(([x, py], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height - pad} L${pts[0][0].toFixed(1)},${height - pad} Z`;
  const [lx, ly] = pts[pts.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={4} fill={color} stroke={ring} strokeWidth={2} />
    </svg>
  );
}
