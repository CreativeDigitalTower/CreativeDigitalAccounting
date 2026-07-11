import type { CSSProperties } from "react";

// Единен набор от фини монохромни икони за BI системата.
const PATHS: Record<string, React.ReactNode> = {
  "trending-up": <><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></>,
  "trending-down": <><path d="M3 7l6 6 4-4 8 8" /><path d="M17 17h4v-4" /></>,
  alert: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
  bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3Z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  forecast: <><path d="M3 3v18h18" /><path d="M7 14l3-3 3 2 4-5" /><circle cx="7" cy="14" r="1" /><circle cx="17" cy="8" r="1" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  spark: <><path d="M12 2v6M12 16v6M2 12h6M16 12h6" /></>,
};

export function BiIcon({ name, size = 16, style, className }: { name: string; size?: number; style?: CSSProperties; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
      {PATHS[name] ?? PATHS.check}
    </svg>
  );
}
