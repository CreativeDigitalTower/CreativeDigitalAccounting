"use client";
import { useT } from "@/components/i18n/I18nProvider";

// Цветова карта за статусите на модел/кройка (консистентни badge-ове).
const COLOR: Record<string, string> = {
  idea: "var(--muted)", development: "#7A6BD8", first_sample: "#C08A2D", fit_sample: "#C08A2D",
  approved: "var(--emerald-dark,#0F8A6A)", ready_for_production: "#2D7DC0", in_production: "#2D7DC0",
  active: "var(--emerald-dark,#0F8A6A)", archived: "var(--muted)",
  draft: "var(--muted)",
};

export function StatusBadge({ status, ns = "status" }: { status: string; ns?: "status" | "patternStatus" }) {
  const t = useT();
  const bg = COLOR[status] ?? "var(--muted)";
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: bg, borderRadius: 10, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {t(`fashion.${ns}.${status}`)}
    </span>
  );
}
