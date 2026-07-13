"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";
import { useI18n } from "@/components/i18n/I18nProvider";

export const ASSET_STATUSES = [
  { id: "in_use", color: "var(--emerald)" },
  { id: "maintenance", color: "var(--brass)" },
  { id: "sold", color: "var(--navy)" },
  { id: "scrapped", color: "var(--brick)" },
  { id: "written_off", color: "var(--muted)" },
];

type Asset = {
  id: string; name: string; category: string; acquiredDate: string; value: number;
  annualDepreciation: number; bookValue: number; warrantyUntil: string | null; insuranceUntil: string | null;
  status: string; notes: string | null;
};

export function AssetDetail({ asset, children }: { asset: Asset; children?: React.ReactNode }) {
  const { t, locale } = useI18n();
  const catLabel = (v: string) => { const l = t(`assets.categories.${v}`); return l.startsWith("assets.") ? v : l; };
  const router = useRouter();
  const [a, setA] = useState(asset);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);

  const st = ASSET_STATUSES.find((s) => s.id === a.status) ?? ASSET_STATUSES[0];

  async function save(patch: Partial<Asset>) {
    const next = { ...a, ...patch };
    setA(next); setBusy(true);
    await fetch(`/api/assets/${a.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: next.name, category: next.category, acquiredDate: next.acquiredDate, value: next.value,
        annualDepreciation: next.annualDepreciation, warrantyUntil: next.warrantyUntil, insuranceUntil: next.insuranceUntil,
        status: next.status, notes: next.notes,
      }),
    });
    setBusy(false); router.refresh();
  }

  async function remove() {
    if (!(await confirmDelete(t("assets.detail.confirmDelete", { name: a.name })))) return;
    setBusy(true);
    const res = await fetch(`/api/assets/${a.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/dashboard/assets");
    else alert((await res.json().catch(() => ({}))).error ?? t("assets.errDelete"));
  }

  const F = ({ label, k, type = "text" }: { label: string; k: keyof Asset; type?: string }) => (
    <div><label style={{ fontSize: 12 }}>{label}</label>
      <input type={type} value={type === "date" ? ((a[k] as string)?.slice(0, 10) ?? "") : ((a[k] as string | number) ?? "")}
        onChange={(e) => setA({ ...a, [k]: type === "number" ? Number(e.target.value) : e.target.value })}
        onBlur={() => save({})} style={{ padding: "6px 9px", fontSize: 13 }} />
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/dashboard/assets" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("assets.detail.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{a.name}</h1>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", background: st.color, borderRadius: 14, padding: "3px 11px" }}>{t(`assets.status.${st.id}`)}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ margin: 0, fontSize: 12.5, display: "flex", gap: 6, alignItems: "center" }}>{t("assets.detail.statusLabel")}
            <select value={a.status} onChange={(e) => save({ status: e.target.value })} disabled={busy} style={{ width: "auto", padding: "4px 8px", fontSize: 12.5 }}>
              {ASSET_STATUSES.map((s) => <option key={s.id} value={s.id}>{t(`assets.status.${s.id}`)}</option>)}
            </select>
          </label>
          <button className="btn btn-ghost btn-sm" onClick={() => setEdit(!edit)} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{edit ? t("assets.detail.close") : <><UiIcon.edit /> {t("assets.detail.edit")}</>}</button>
          <button className="btn btn-ghost btn-sm" onClick={remove} disabled={busy} title={t("assets.detail.delTitle")} style={{ color: "var(--brick)", borderColor: "var(--brick)", display: "inline-flex", alignItems: "center" }}><UiIcon.trash /></button>
        </div>
      </div>

      {edit && (
        <div className="glass panel" style={{ padding: 20, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <F label={t("assets.detail.f.name")} k="name" />
          <F label={t("assets.detail.f.category")} k="category" />
          <F label={t("assets.detail.f.acquired")} k="acquiredDate" type="date" />
          <F label={t("assets.detail.f.value")} k="value" type="number" />
          <F label={t("assets.detail.f.depreciation")} k="annualDepreciation" type="number" />
          <F label={t("assets.detail.f.bookValue")} k="bookValue" type="number" />
          <F label={t("assets.detail.f.warranty")} k="warrantyUntil" type="date" />
          <F label={t("assets.detail.f.insurance")} k="insuranceUntil" type="date" />
          <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>{t("assets.detail.f.notes")}</label><textarea value={a.notes ?? ""} onChange={(e) => setA({ ...a, notes: e.target.value })} onBlur={() => save({})} rows={2} style={{ width: "100%" }} /></div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 14, marginBottom: 18 }}>
        {[
          { l: t("assets.detail.kpi.category"), v: catLabel(a.category) },
          { l: t("assets.detail.kpi.acquired"), v: new Date(a.acquiredDate).toLocaleDateString(locale) },
          { l: t("assets.detail.kpi.value"), v: formatCurrency(a.value) },
          { l: t("assets.detail.kpi.depreciation"), v: formatCurrency(a.annualDepreciation) },
          { l: t("assets.detail.kpi.bookValue"), v: formatCurrency(a.bookValue) },
          { l: t("assets.detail.kpi.warranty"), v: a.warrantyUntil ? new Date(a.warrantyUntil).toLocaleDateString(locale) : "—" },
          { l: t("assets.detail.kpi.insurance"), v: a.insuranceUntil ? new Date(a.insuranceUntil).toLocaleDateString(locale) : "—" },
        ].map((k) => (
          <div key={k.l} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{k.l}</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>{k.v}</div>
          </div>
        ))}
      </div>
      {a.notes && !edit && <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 16, whiteSpace: "pre-wrap" }}>{a.notes}</p>}
      {children}
    </>
  );
}
