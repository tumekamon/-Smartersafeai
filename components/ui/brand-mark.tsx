/**
 * The SmartSafe "proof tick": a hi-vis square with a navy tick. It stands for the
 * moment a fix is seen, proved and signed off (design canvas, Brand board).
 */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="brand-mark inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.26) }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    </span>
  );
}

/** Mark + serif wordmark, e.g. in the top bar and on sign-in. */
export function BrandLockup({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      <span className="disp text-[22px] leading-none">SmartSafe</span>
    </span>
  );
}
