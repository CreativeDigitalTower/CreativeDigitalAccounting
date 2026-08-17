"use client";
import { useT } from "@/components/i18n/I18nProvider";

const COLOR: Record<string, string> = {
  cut: "#C08A2D", sewing: "#2D7DC0", finishing: "#7A6BD8", qc: "#C08A2D",
  ready: "var(--emerald-dark,#0F8A6A)", on_hold: "var(--muted)", rework: "var(--brick)", cancelled: "var(--muted)",
};

export function ProductionStatusBadge({ status }: { status: string }) {
  const t = useT();
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: COLOR[status] ?? "var(--muted)", borderRadius: 10, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {t(`fashion.prod.st_${status}`)}
    </span>
  );
}
