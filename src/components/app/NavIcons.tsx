import type { SVGProps } from "react";

/**
 * Централен набор от линейни SVG пиктограми за навигацията и UI бутоните.
 * Всички са монохромни (currentColor), без емоджита. Приемат стандартни SVG props.
 */
const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 18, height: 18, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  ...p,
});

export const NavIcon: Record<string, (p?: SVGProps<SVGSVGElement>) => React.ReactElement> = {
  dashboard: (p = {}) => <svg {...base(p)}><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></svg>,
  invoice: (p = {}) => <svg {...base(p)}><path d="M6 2.5h9l3 3V21l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21V2.5Z" /><path d="M8.5 7.5h7M8.5 11h7M8.5 14.5h4" /></svg>,
  document: (p = {}) => <svg {...base(p)}><path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V2.5Z" /><path d="M14 2.5v4h4M9 12h6M9 15.5h6" /></svg>,
  clients: (p = {}) => <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 20a5.3 5.3 0 0 0-3-4.8" /></svg>,
  inbox: (p = {}) => <svg {...base(p)}><path d="M3 13.5 5.5 5A2 2 0 0 1 7.4 3.5h9.2A2 2 0 0 1 18.5 5L21 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19v-5.5Z" /><path d="M3 13.5h5l1.5 2.5h5L16 13.5h5" /></svg>,
  suppliers: (p = {}) => <svg {...base(p)}><path d="M2.5 6.5h10v9h-10z" /><path d="M12.5 9.5h4l3 3v3h-7z" /><circle cx="6" cy="17.5" r="1.8" /><circle cx="16.5" cy="17.5" r="1.8" /></svg>,
  warehouse: (p = {}) => <svg {...base(p)}><path d="M12 3 3 7v13h18V7l-9-4Z" /><path d="M8 20v-6h8v6M8 14h8" /></svg>,
  production: (p = {}) => <svg {...base(p)}><path d="M3 20V9l6 4V9l6 4V6l3 2v12H3Z" /><path d="M6.5 20v-3M12 20v-3M17 20v-3" /></svg>,
  employees: (p = {}) => <svg {...base(p)}><circle cx="12" cy="7.5" r="3.3" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>,
  haccp: (p = {}) => <svg {...base(p)}><path d="M12 3a9 9 0 1 0 9 9" /><path d="M21 5.5 12 14.5l-3-3" /></svg>,
  businessDocs: (p = {}) => <svg {...base(p)}><path d="M7 2.5h7l4 4V21a.5.5 0 0 1-.5.5H7A.5.5 0 0 1 6.5 21V3a.5.5 0 0 1 .5-.5Z" /><path d="M14 2.5v4h4M9.5 12h5M9.5 15.5h5" /></svg>,
  cash: (p = {}) => <svg {...base(p)}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v5M18 9.5v5" /></svg>,
  expenses: (p = {}) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v9M14.5 9.3c-.5-.9-1.5-1.4-2.6-1.4-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.6.8 2.6 2.1-1.2 2-2.6 2c-1.2 0-2.2-.5-2.7-1.5" /></svg>,
  contracts: (p = {}) => <svg {...base(p)}><path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V2.5Z" /><path d="M14 2.5v4h4M9 12.5h6M9 16h4" /><circle cx="15.5" cy="16.5" r="2.2" /></svg>,
  projects: (p = {}) => <svg {...base(p)}><path d="M3 21V8l6-5 6 5" /><path d="M9 21V13h4v8" /><path d="M15 21h6V11l-4-3" /></svg>,
  archive: (p = {}) => <svg {...base(p)}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" /><path d="M9.5 12h5" /></svg>,
  assets: (p = {}) => <svg {...base(p)}><path d="M4 20V10l8-6 8 6v10" /><rect x="9" y="13" width="6" height="7" /><path d="M4 20h16" /></svg>,
  analytics: (p = {}) => <svg {...base(p)}><path d="M4 4v16h16" /><rect x="7" y="11" width="2.6" height="6" /><rect x="12" y="7" width="2.6" height="10" /><rect x="17" y="13" width="2.6" height="4" /></svg>,
  calendar: (p = {}) => <svg {...base(p)}><rect x="3.5" y="4.5" width="17" height="16" rx="2" /><path d="M3.5 9h17M8 2.5v4M16 2.5v4" /></svg>,
  tools: (p = {}) => <svg {...base(p)}><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 7.5h8M8 11h8M8 14.5h5" /></svg>,
  training: (p = {}) => <svg {...base(p)}><path d="M12 4 2.5 8.5 12 13l9.5-4.5L12 4Z" /><path d="M6.5 10.5V15c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4.5M21.5 8.5v5" /></svg>,
  users: (p = {}) => <svg {...base(p)}><circle cx="12" cy="8" r="3.3" /><path d="M6 19a6 6 0 0 1 12 0" /></svg>,
  audit: (p = {}) => <svg {...base(p)}><path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V2.5Z" /><path d="M14 2.5v4h4M9 11h6M9 14.5h6M9 18h3" /></svg>,
  settings: (p = {}) => <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6" /></svg>,
  subscription: (p = {}) => <svg {...base(p)}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 15h4" /></svg>,
};

/** Малки UI пиктограми за бутони и състояния (без емоджита). */
export const UiIcon: Record<string, (p?: SVGProps<SVGSVGElement>) => React.ReactElement> = {
  search: (p = {}) => <svg {...base({ width: 16, height: 16, ...p })}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>,
  bell: (p = {}) => <svg {...base({ width: 16, height: 16, ...p })}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  edit: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  trash: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="M4 7h16M9 7V4.5h6V7M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" /></svg>,
  print: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" /><rect x="7" y="15" width="10" height="6" /></svg>,
  save: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="M5 3h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M8 3v5h7M8 14h8v6H8z" /></svg>,
  star: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="m12 3 2.7 5.5 6 .9-4.35 4.2 1 6-5.35-2.8-5.35 2.8 1-6L3.3 9.4l6-.9L12 3Z" /></svg>,
  starFill: (p = {}) => <svg {...base({ width: 15, height: 15, fill: "currentColor", ...p })}><path d="m12 3 2.7 5.5 6 .9-4.35 4.2 1 6-5.35-2.8-5.35 2.8 1-6L3.3 9.4l6-.9L12 3Z" /></svg>,
  pin: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z" /><path d="M12 14v6" /></svg>,
  warning: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="M12 3 1.5 21h21L12 3Z" /><path d="M12 10v5M12 18h.01" /></svg>,
  doc: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V2.5Z" /><path d="M14 2.5v4h4M9 12h6M9 15.5h6" /></svg>,
  people: (p = {}) => <svg {...base({ width: 22, height: 22, ...p })}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 20a5.3 5.3 0 0 0-3-4.8" /></svg>,
  party: (p = {}) => <svg {...base({ width: 16, height: 16, ...p })}><path d="M3 21 8 8l8 8-13 5Z" /><path d="M14 4c1.5 0 2 1 3 1M18 8c0 1.5 1 2 1 3M13.5 2.5l.5 2M20.5 9.5l-2 .5M21 4l-1.5 1.5" /></svg>,
  check: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="m5 12 4.5 4.5L19 7" /></svg>,
  dot: (p = {}) => <svg {...base({ width: 12, height: 12, fill: "currentColor", stroke: "none", ...p })}><circle cx="12" cy="12" r="6" /></svg>,
  truck: (p = {}) => <svg {...base({ width: 26, height: 26, ...p })}><path d="M2.5 6.5h10v9h-10z" /><path d="M12.5 9.5h4l3 3v3h-7z" /><circle cx="6" cy="17.5" r="1.8" /><circle cx="16.5" cy="17.5" r="1.8" /></svg>,
  phone: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="M6.5 3h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z" /></svg>,
  mail: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3 6 9 6 9-6" /></svg>,
  handshake: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="m11 6 3 3 3-3 4 3v5l-5 5-3-3-3 3-2-2 4-4-2-2-3 1-2-2 4-4Z" /></svg>,
  download: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16" /></svg>,
  lock: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  eye: (p = {}) => <svg {...base({ width: 15, height: 15, ...p })}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>,
};

/** Пиктограма за категория бизнес документи (по id), без емоджита. */
export function docCategoryIcon(id: string, size = 26): React.ReactElement {
  const p = { width: size, height: size };
  const map: Record<string, (q?: SVGProps<SVGSVGElement>) => React.ReactElement> = {
    company: NavIcon.dashboard, contracts: NavIcon.contracts, hr: UiIcon.people, finance: NavIcon.expenses,
    clients: UiIcon.handshake, suppliers: UiIcon.truck, gdpr: UiIcon.lock, inventory: NavIcon.warehouse,
    vehicles: UiIcon.truck, construction: NavIcon.projects, production: NavIcon.production, projects: NavIcon.projects,
    marketing: UiIcon.bell, bank: NavIcon.cash, policies: NavIcon.audit, analysis: NavIcon.analytics,
    protocols: UiIcon.doc, forms: UiIcon.doc, declarations: NavIcon.document, correspondence: UiIcon.mail,
  };
  return (map[id] ?? UiIcon.doc)(p);
}
