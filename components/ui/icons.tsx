import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconGrid(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconFolder(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 6.5a1.5 1.5 0 0 1 1.5-1.5h4.4l1.6 2h9a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
    </svg>
  );
}

export function IconCheckShield(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 5 6v6c0 4.2 3 7 7 8.5 4-1.5 7-4.3 7-8.5V6z" />
      <path d="M9 12.2 11 14.2 15.2 10" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h6A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 10 18.5V17" />
      <path d="M14 12H4M4 12l3.5-3.5M4 12l3.5 3.5" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

export function IconAlertTriangle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4.5 21 19.5H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.7" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconClipboardCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="4" width="12" height="17" rx="1.5" />
      <path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2V4" />
      <path d="M9 13l2 2 4-4.5" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function IconGauge(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="M12 15 15.5 9" />
      <path d="M4 15h16" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8.2" r="3.2" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}
