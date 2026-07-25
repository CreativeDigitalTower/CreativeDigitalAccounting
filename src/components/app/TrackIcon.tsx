import type { CSSProperties } from "react";

// Линейни пиктограми за Document Tracking (без емоджита — в стила на платформата).
// Приема семантично име (chip: sent/delivered/opened/downloaded/paid/error;
// или тип събитие: smtp_accepted/viewed/printed/link_visited/overdue/bounced/
// failed/invalid_email/reminder_sent) и връща SVG с currentColor.

const P: Record<string, string> = {
  // изпратен — хартиено самолетче
  sent: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>',
  smtp_accepted: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  // доставен — плик с отметка
  delivered: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/><path d="m15.5 15 2 2 3.5-3.5"/>',
  // отворен/прегледан — око
  opened: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.5"/>',
  // свален — стрелка надолу към линия
  downloaded: '<path d="M12 3v12"/><path d="m7 11 5 4 5-4"/><path d="M4 20h16"/>',
  printed: '<path d="M7 9V3h10v6"/><path d="M7 18H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><rect x="7" y="15" width="10" height="6"/>',
  link_visited: '<path d="M9 15 15 9"/><path d="M10.5 6.5 12 5a4 4 0 0 1 6 6l-1.5 1.5"/><path d="M13.5 17.5 12 19a4 4 0 0 1-6-6l1.5-1.5"/>',
  // платен — банкнота
  paid: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  overdue: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  // върнат (bounce) — стрелка обратно
  bounced: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 5 5v3"/>',
  // грешка — кръг с X
  error: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  invalid_email: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
  reminder_sent: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
};
// синоними към горните
const ALIAS: Record<string, string> = {
  email_opened: "opened", viewed: "opened", failed: "error", invalid_email: "invalid_email",
};

export function TrackIcon({ name, size = 14, style }: { name: string; size?: number; style?: CSSProperties }) {
  const key = P[name] ? name : (ALIAS[name] ?? "");
  const path = P[key];
  if (!path) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      style={{ verticalAlign: "-2px", ...style }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: path }} />
  );
}
