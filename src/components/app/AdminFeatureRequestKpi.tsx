"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

// Компактен KPI блок + CTA на Super Admin таблото (§17).
export function AdminFeatureRequestKpi() {
  const t = useT();
  const [k, setK] = useState<Record<string, number> | null>(null);
  useEffect(() => { fetch("/api/admin/feature-requests").then((r) => r.ok ? r.json() : null).then((j) => j && setK(j.kpi)).catch(() => {}); }, []);
  if (!k) return null;
  const item = (label: string, v: number) => (
    <div style={{ textAlign: "center" }}><div className="num" style={{ fontSize: 18, fontWeight: 700 }}>{v}</div><div style={{ fontSize: 10.5, color: "var(--muted)" }}>{label}</div></div>
  );
  return (
    <div className="glass panel" style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", marginBottom: 18, borderLeft: "3px solid var(--brass)" }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600 }}>{t("featureRequest.admin.title")}</div>
      <div style={{ display: "flex", gap: 20 }}>
        {item(t("featureRequest.status.new"), k.new ?? 0)}
        {item(t("featureRequest.status.reviewing"), k.reviewing ?? 0)}
        {item(t("featureRequest.status.approved"), k.approved ?? 0)}
        {item(t("featureRequest.status.in_development"), k.in_development ?? 0)}
        {item(t("featureRequest.status.delivered"), k.delivered ?? 0)}
      </div>
      <Link href="/dashboard/admin/feature-requests" className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>{t("featureRequest.admin.reviewNew")}</Link>
    </div>
  );
}
