import type { RiskLevel, SceneKind } from "@/lib/types";

type Box = { x: number; y: number; w: number; h: number; label: string; primary?: boolean };

const W = 640;
const H = 400;

const riskColor: Record<RiskLevel, string> = {
  low: "#3ddc84",
  medium: "#ffc233",
  high: "#ff8a4c",
  critical: "#ff4d4d",
};

function Defs() {
  return (
    <defs>
      <linearGradient id="es-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c9cdd4" />
        <stop offset="1" stopColor="#a3a9b3" />
      </linearGradient>
      <linearGradient id="es-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7d828b" />
        <stop offset="1" stopColor="#4f535b" />
      </linearGradient>
      <radialGradient id="es-vig" cx="0.5" cy="0.5" r="0.75">
        <stop offset="0.55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.5" />
      </radialGradient>
      <filter id="es-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n" />
        <feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.35" />
      </filter>
    </defs>
  );
}

function Room() {
  return (
    <>
      <rect width={W} height={H} fill="url(#es-wall)" />
      <rect y={268} width={W} height={132} fill="url(#es-floor)" />
      <rect y={262} width={W} height={8} fill="#6a6f78" />
      <rect x={0} y={0} width={W} height={26} fill="#8e949e" opacity={0.55} />
      <path d="M0 268 L640 268" stroke="#4a4e56" strokeWidth={2} opacity={0.5} />
    </>
  );
}

function PanelScene() {
  return (
    <>
      <Room />
      <rect x={18} y={0} width={70} height={270} fill="#8b9099" opacity={0.6} />
      <rect x={352} y={0} width={12} height={72} fill="#c4c9d2" />
      <rect x={352} y={0} width={4} height={72} fill="#e6e9ee" />
      <polygon points="290,70 246,86 246,252 290,262" fill="#7a818d" stroke="#565c66" strokeWidth={2} />
      <rect x={290} y={70} width={142} height={192} fill="#8d94a0" stroke="#565c66" strokeWidth={2} />
      <rect x={302} y={84} width={118} height={164} fill="#262a31" />
      {[0, 1, 2, 3, 4, 5].map((r) => (
        <g key={r}>
          <rect x={312} y={96 + r * 24} width={44} height={16} rx={2} fill="#d9dce2" />
          <rect x={338} y={99 + r * 24} width={8} height={10} fill="#1d2026" />
          <rect x={366} y={96 + r * 24} width={44} height={16} rx={2} fill="#d9dce2" />
          <rect x={392} y={99 + r * 24} width={8} height={10} fill="#1d2026" />
        </g>
      ))}
      <rect x={358} y={84} width={4} height={164} fill="#1b1e23" />
      <rect x={356} y={262} width={10} height={36} fill="#c4c9d2" />
      <rect x={464} y={178} width={100} height={84} rx={6} fill="#e5a71a" stroke="#a47408" strokeWidth={2} />
      <rect x={484} y={196} width={62} height={44} rx={4} fill="#f2f3f5" />
      <rect x={494} y={207} width={10} height={20} rx={2} fill="#2a2d33" />
      <rect x={526} y={207} width={10} height={20} rx={2} fill="#2a2d33" />
      <circle cx={515} cy={218} r={2} fill="#2a2d33" />
      <path d="M520 240 C 540 300, 470 300, 420 322 S 300 350, 210 330" fill="none" stroke="#f08a24" strokeWidth={7} strokeLinecap="round" />
      <ellipse cx={430} cy={336} rx={120} ry={24} fill="#8cb6e6" opacity={0.42} />
      <ellipse cx={410} cy={332} rx={70} ry={10} fill="#d6e8fb" opacity={0.35} />
    </>
  );
}

function CordScene() {
  return (
    <>
      <Room />
      <rect x={470} y={90} width={90} height={172} fill="#8e949e" />
      <rect x={476} y={98} width={78} height={164} fill="#5f646d" />
      <rect x={42} y={40} width={200} height={10} rx={3} fill="#d4d7dd" />
      {[70, 120, 170, 220].map((x) => (
        <g key={x}>
          <circle cx={x} cy={62} r={9} fill="#f7e59a" opacity={0.85} />
          <circle cx={x} cy={62} r={4} fill="#fff8d1" />
        </g>
      ))}
      <path d="M40 358 C 160 336, 250 340, 330 336 S 520 322, 610 346" fill="none" stroke="#f0a020" strokeWidth={9} strokeLinecap="round" />
      <path d="M40 358 C 160 336, 250 340, 330 336 S 520 322, 610 346" fill="none" stroke="#ffd06a" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <rect x={306} y={322} width={44} height={26} rx={3} fill="#202226" transform="rotate(-4 328 335)" />
      <path d="M312 330 l-8 -10 M322 328 l-3 -13 M334 330 l4 -12 M344 332 l9 -9" stroke="#d68a4a" strokeWidth={2.5} strokeLinecap="round" />
      <polygon points="560,352 590,352 575,306" fill="#f26a1b" />
      <rect x={564} y={334} width={22} height={5} fill="#fff" />
    </>
  );
}

type Variant = "vest" | "hardhat" | "eyes";

function Worker({ x, y, s, vest, hat, glasses }: { x: number; y: number; s: number; vest: boolean; hat: boolean; glasses: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-34} y={98} width={30} height={118} rx={8} fill="#2f3b52" />
      <rect x={4} y={98} width={30} height={118} rx={8} fill="#2a364d" />
      <rect x={-38} y={208} width={36} height={16} rx={6} fill="#1b1d22" />
      <rect x={2} y={208} width={36} height={16} rx={6} fill="#1b1d22" />
      <rect x={-46} y={8} width={92} height={100} rx={16} fill={vest ? "#b6bcc6" : "#4d5563"} />
      {vest && (
        <>
          <rect x={-42} y={8} width={84} height={100} rx={14} fill="#c8f000" />
          <rect x={-42} y={44} width={84} height={9} fill="#e6e8ec" />
          <rect x={-42} y={78} width={84} height={9} fill="#e6e8ec" />
          <rect x={-3} y={8} width={6} height={100} fill="#9bb800" />
        </>
      )}
      <rect x={-70} y={16} width={26} height={84} rx={12} fill={vest ? "#8a93a2" : "#434a58"} transform="rotate(8 -57 58)" />
      <rect x={44} y={16} width={26} height={84} rx={12} fill={vest ? "#8a93a2" : "#434a58"} transform="rotate(-8 57 58)" />
      <circle cx={0} cy={-26} r={27} fill="#d7a27c" />
      {hat && (
        <>
          <path d="M-30 -30 a30 30 0 0 1 60 0 z" fill="#f2c200" />
          <rect x={-36} y={-32} width={72} height={9} rx={4} fill="#d9ad00" />
        </>
      )}
      {!hat && <path d="M-27 -34 a27 27 0 0 1 54 0 c-10 -8 -44 -8 -54 0z" fill="#3a2a20" />}
      {glasses && <rect x={-17} y={-30} width={34} height={9} rx={4} fill="#2b3a55" opacity={0.85} />}
    </g>
  );
}

function VestScene({ variant }: { variant: Variant }) {
  return (
    <>
      <Room />
      <rect x={70} y={0} width={14} height={268} fill="#8b9099" />
      <rect x={560} y={0} width={14} height={268} fill="#8b9099" />
      <rect x={0} y={150} width={W} height={8} fill="#6f7580" opacity={0.7} />
      <Worker x={150} y={172} s={0.6} vest hat glasses />
      <Worker x={370} y={146} s={1} vest={variant !== "vest"} hat={variant !== "hardhat"} glasses={variant !== "eyes"} />
      <rect x={470} y={224} width={70} height={54} fill="#7b6a55" />
      <rect x={470} y={224} width={70} height={7} fill="#5f5040" />
    </>
  );
}

function EgressScene() {
  return (
    <>
      <rect width={W} height={H} fill="#b9bdc5" />
      <polygon points="0,0 250,110 250,300 0,400" fill="#a2a8b2" />
      <polygon points="640,0 390,110 390,300 640,400" fill="#9aa0ab" />
      <polygon points="0,0 640,0 390,110 250,110" fill="#8d939d" />
      <polygon points="0,400 640,400 390,300 250,300" fill="#5a5e66" />
      <rect x={250} y={110} width={140} height={190} fill="#d6d9df" />
      <rect x={292} y={168} width={56} height={132} fill="#6b7280" />
      <rect x={288} y={126} width={64} height={24} rx={4} fill="#1c9a55" />
      <text x={320} y={143} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff" fontFamily="sans-serif">
        EXIT
      </text>
      <rect x={448} y={218} width={26} height={62} rx={8} fill="#d23a2e" />
      <rect x={455} y={206} width={12} height={16} rx={3} fill="#2c2e33" />
      <rect x={120} y={230} width={170} height={120} fill="#b68f55" stroke="#7a5b30" strokeWidth={3} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={120} y={244 + i * 34} width={170} height={7} fill="#7a5b30" opacity={0.8} />
      ))}
      <rect x={196} y={170} width={150} height={96} fill="#d4d7dc" stroke="#9298a2" strokeWidth={3} />
      <rect x={210} y={182} width={150} height={96} fill="#c9ccd2" stroke="#9298a2" strokeWidth={3} />
      <rect x={392} y={286} width={84} height={62} fill="#b68f55" stroke="#7a5b30" strokeWidth={3} />
    </>
  );
}

function LadderScene() {
  return (
    <>
      <Room />
      <rect x={30} y={70} width={580} height={12} fill="#6f7580" />
      <rect x={30} y={90} width={580} height={9} fill="#8b9099" />
      <g stroke="#e8b02a" strokeWidth={9} strokeLinecap="round">
        <line x1={250} y1={392} x2={300} y2={86} />
        <line x1={346} y1={392} x2={392} y2={86} />
      </g>
      <g stroke="#f4cf6a" strokeWidth={6} strokeLinecap="round">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const t = i / 7;
          const xl = 250 + (300 - 250) * (1 - t);
          const xr = 346 + (392 - 346) * (1 - t);
          const y = 372 - t * 270;
          return <line key={i} x1={xl} y1={y} x2={xr} y2={y} />;
        })}
      </g>
      <g transform="translate(346 172) scale(0.62)">
        <rect x={-34} y={98} width={30} height={100} rx={8} fill="#2f3b52" />
        <rect x={4} y={98} width={30} height={100} rx={8} fill="#2a364d" />
        <rect x={-46} y={8} width={92} height={100} rx={16} fill="#4d5563" />
        <rect x={-70} y={-40} width={26} height={84} rx={12} fill="#434a58" transform="rotate(-24 -57 -6)" />
        <rect x={44} y={-40} width={26} height={84} rx={12} fill="#434a58" transform="rotate(24 57 -6)" />
        <circle cx={0} cy={-26} r={27} fill="#d7a27c" />
        <path d="M-30 -30 a30 30 0 0 1 60 0 z" fill="#f2c200" />
        <rect x={-36} y={-32} width={72} height={9} rx={4} fill="#d9ad00" />
      </g>
    </>
  );
}

function boxesFor(scene: SceneKind, title: string): Box[] {
  const lower = title.toLowerCase();
  switch (scene) {
    case "panel":
      return [
        { x: 0.72, y: 0.44, w: 0.16, h: 0.22, label: title, primary: true },
        { x: 0.46, y: 0.78, w: 0.36, h: 0.14, label: "Standing water" },
        { x: 0.45, y: 0.17, w: 0.22, h: 0.5, label: "Panel" },
      ];
    case "cord":
      return [
        { x: 0.46, y: 0.78, w: 0.13, h: 0.1, label: title, primary: true },
        { x: 0.86, y: 0.75, w: 0.08, h: 0.14, label: "Cone" },
      ];
    case "vest": {
      const primary: Box = lower.includes("hard hat")
        ? { x: 0.52, y: 0.14, w: 0.12, h: 0.18, label: title, primary: true }
        : lower.includes("eye")
          ? { x: 0.53, y: 0.17, w: 0.1, h: 0.08, label: title, primary: true }
          : { x: 0.5, y: 0.32, w: 0.17, h: 0.34, label: title, primary: true };
      return [primary, { x: 0.15, y: 0.34, w: 0.16, h: 0.36, label: "Worker · PPE complete" }];
    }
    case "egress":
      return lower.includes("extinguisher")
        ? [
            { x: 0.7, y: 0.5, w: 0.06, h: 0.17, label: title, primary: true },
            { x: 0.61, y: 0.7, w: 0.14, h: 0.17, label: "Obstruction" },
          ]
        : [
            { x: 0.18, y: 0.55, w: 0.3, h: 0.32, label: title, primary: true },
            { x: 0.3, y: 0.42, w: 0.26, h: 0.24, label: "Stacked material" },
          ];
    case "ladder":
      return [
        { x: 0.5, y: 0.14, w: 0.14, h: 0.44, label: title, primary: true },
        { x: 0.38, y: 0.2, w: 0.26, h: 0.78, label: "Ladder" },
      ];
    default:
      return [];
  }
}

function variantFor(title: string): Variant {
  const l = title.toLowerCase();
  return l.includes("hard hat") ? "hardhat" : l.includes("eye") ? "eyes" : "vest";
}

export function EvidenceScene({
  scene,
  title,
  confidence,
  risk,
  fileName,
  capturedAt,
  location,
  showBoxes = true,
}: {
  scene: SceneKind;
  title: string;
  confidence: number;
  risk: RiskLevel;
  fileName: string;
  capturedAt: string;
  location: string;
  showBoxes?: boolean;
}) {
  const color = riskColor[risk];
  const boxes = showBoxes ? boxesFor(scene, title) : [];
  const stamp = new Date(capturedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl" role="img" aria-label={`Site photo showing ${title}`}>
      <Defs />
      {scene === "panel" && <PanelScene />}
      {scene === "cord" && <CordScene />}
      {scene === "vest" && <VestScene variant={variantFor(title)} />}
      {scene === "egress" && <EgressScene />}
      {scene === "ladder" && <LadderScene />}
      {scene === "lift" && <Room />}
      <rect width={W} height={H} fill="url(#es-vig)" />
      <rect width={W} height={H} filter="url(#es-grain)" opacity={0.28} />

      {boxes.map((b, i) => {
        const x = b.x * W;
        const y = b.y * H;
        const w = b.w * W;
        const h = b.h * H;
        const c = b.primary ? color : "#e6e9f0";
        const text = b.primary ? `${b.label} ${Math.round(confidence * 100)}%` : b.label;
        const lw = text.length * 6.4 + 14;
        const ly = y - 24 < 42 ? y + 5 : y - 22;
        const lx = Math.min(x, W - lw - 12);
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={b.primary ? color : "none"}
              fillOpacity={b.primary ? 0.12 : 0}
              stroke={c}
              strokeWidth={b.primary ? 2.5 : 1.25}
              strokeDasharray={b.primary ? undefined : "5 4"}
              rx={3}
            />
            <rect x={lx} y={ly} width={lw} height={18} rx={4} fill={b.primary ? c : "rgba(20,24,34,0.78)"} />
            <text x={lx + 7} y={ly + 12.5} fontSize={11} fontWeight={600} fill={b.primary ? "#111" : "#fff"} fontFamily="sans-serif">
              {text}
            </text>
          </g>
        );
      })}

      <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={2}>
        <path d="M14 34 V14 H34" />
        <path d="M606 14 H626 V34" />
        <path d="M14 366 V386 H34" />
        <path d="M606 386 H626 V366" />
      </g>
      <circle cx={30} cy={28} r={4.5} fill="#ff4d4d" />
      <text x={42} y={32} fontSize={11} fontWeight={600} fill="#fff" fontFamily="monospace">
        {fileName}
      </text>
      <text x={626} y={32} textAnchor="end" fontSize={11} fill="#fff" fontFamily="monospace">
        {stamp}
      </text>
      <text x={30} y={376} fontSize={11} fontWeight={600} fill="#fff" fontFamily="monospace">
        {location}
      </text>
    </svg>
  );
}
