"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";

export const ASSET_STATUSES = [
  { id: "in_use", label: "В употреба", color: "var(--emerald)" },
  { id: "maintenance", label: "В сервиз", color: "var(--brass)" },
  { id: "sold", label: "Продаден", color: "var(--navy)" },
  { id: "scrapped", label: "Бракуван", color: "var(--brick)" },
  { id: "written_off", label: "Отписан", color: "var(--muted)" },
];

type Asset = {
  id: string; name: string; category: string; acquiredDate: string; value: number;
  annualDepreciation: number; bookValue: number; warrantyUntil: string | null; insuranceUntil: string | null;
  status: string; notes: string | null;
};

export function AssetDetail({ asset, children }: { asset: Asset; children?: React.ReactNode }) {
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
    if (!(await confirmDelete(`актива „${a.name}"`))) return;
    setBusy(true);
    const res = await fetch(`/api/assets/${a.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/dashboard/assets");
    else alert((await res.json().catch(() => ({}))).error ?? "Грешка при изтриване.");
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
        <Link href="/dashboard/assets" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Активи</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{a.name}</h1>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", background: st.color, borderRadius: 14, padding: "3px 11px" }}>{st.label}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ margin: 0, fontSize: 12.5, display: "flex", gap: 6, alignItems: "center" }}>Статус:
            <select value={a.status} onChange={(e) => save({ status: e.target.value })} disabled={busy} style={{ width: "auto", padding: "4px 8px", fontSize: 12.5 }}>
              {ASSET_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <button className="btn btn-ghost btn-sm" onClick={() => setEdit(!edit)} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{edit ? "Затвори" : <><UiIcon.edit /> Редактирай</>}</button>
          <button className="btn btn-ghost btn-sm" onClick={remove} disabled={busy} title="Изтрий актив" style={{ color: "var(--brick)", borderColor: "var(--brick)", display: "inline-flex", alignItems: "center" }}><UiIcon.trash /></button>
        </div>
      </div>

      {edit && (
        <div className="glass panel" style={{ padding: 20, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <F label="Наименование" k="name" />
          <F label="Категория" k="category" />
          <F label="Придобит" k="acquiredDate" type="date" />
          <F label="Стойност (€)" k="value" type="number" />
          <F label="Год. амортизация (€)" k="annualDepreciation" type="number" />
          <F label="Балансова стойност (€)" k="bookValue" type="number" />
          <F label="Гаранция до" k="warrantyUntil" type="date" />
          <F label="Застраховка до" k="insuranceUntil" type="date" />
          <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>Бележки</label><textarea value={a.notes ?? ""} onChange={(e) => setA({ ...a, notes: e.target.value })} onBlur={() => save({})} rows={2} style={{ width: "100%" }} /></div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 14, marginBottom: 18 }}>
        {[
          { l: "Категория", v: a.category },
          { l: "Придобит", v: new Date(a.acquiredDate).toLocaleDateString("bg-BG") },
          { l: "Стойност", v: formatCurrency(a.value) },
          { l: "Год. амортизация", v: formatCurrency(a.annualDepreciation) },
          { l: "Балансова стойност", v: formatCurrency(a.bookValue) },
          { l: "Гаранция до", v: a.warrantyUntil ? new Date(a.warrantyUntil).toLocaleDateString("bg-BG") : "—" },
          { l: "Застраховка до", v: a.insuranceUntil ? new Date(a.insuranceUntil).toLocaleDateString("bg-BG") : "—" },
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
