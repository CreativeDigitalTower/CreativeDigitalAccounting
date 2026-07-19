"use client";
import { NumberField } from "@/components/i18n/NumberField";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import { AttachmentCell } from "@/components/app/AttachmentCell";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";
import { useI18n } from "@/components/i18n/I18nProvider";

export type ExpenseRow = {
  id: string; description: string; category: string; categoryId: string; supplier: string | null; supplierId: string | null;
  date: string; amount: number; vatAmount: number; source: string; isRecurring: boolean; hasFile: boolean;
};
type Cat = { id: string; name: string };
type Sup = { id: string; name: string };

export function ExpensesList({ expenses, categories, suppliers, dual, toBGNRate }: {
  expenses: ExpenseRow[]; categories: Cat[]; suppliers: Sup[]; dual: boolean; toBGNRate: number;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "recurring" | "single">("all");
  const [edit, setEdit] = useState<ExpenseRow | null>(null);

  async function remove(e: ExpenseRow) {
    if (!(await confirmDelete(t("expenses.confirmDelete", { name: e.description })))) return;
    const res = await fetch(`/api/expenses/${e.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert((await res.json().catch(() => ({}))).error ?? t("expenses.errDelete"));
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return expenses.filter((e) => {
      if (filter === "recurring" && !e.isRecurring) return false;
      if (filter === "single" && e.isRecurring) return false;
      if (!term) return true;
      return [e.description, e.category, e.supplier].filter(Boolean).some((v) => v!.toLowerCase().includes(term));
    });
  }, [expenses, q, filter, ]);

  // Групиране по година → месец
  const groups = useMemo(() => {
    const map = new Map<string, ExpenseRow[]>();
    for (const e of filtered) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const recurringCount = expenses.filter((e) => e.isRecurring).length;

  return (
    <>
      <div className="glass panel" style={{ padding: "12px 16px", marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder={t("expenses.search")} value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 260px", minWidth: 200, padding: "8px 12px" }} />
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <button className={`filter-tab${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>{t("expenses.filter.all")} ({expenses.length})</button>
          <button className={`filter-tab${filter === "recurring" ? " active" : ""}`} onClick={() => setFilter("recurring")}>{t("expenses.filter.recurring")} ({recurringCount})</button>
          <button className={`filter-tab${filter === "single" ? " active" : ""}`} onClick={() => setFilter("single")}>{t("expenses.filter.single")} ({expenses.length - recurringCount})</button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>{t("expenses.empty.filtered")}</div>
      ) : groups.map(([key, rows]) => {
        const [y, m] = key.split("-");
        const sum = rows.reduce((s, e) => s + e.amount, 0);
        return (
          <div key={key} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 0 8px" }}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{new Date(Number(y), Number(m), 1).toLocaleDateString(locale, { month: "long", year: "numeric" })}</h3>
              <span className="num" style={{ fontSize: 13, color: "var(--muted)" }}>{t("expenses.monthTotal")} <strong>{formatCurrency(sum)}</strong></span>
            </div>
            <div className="glass panel" style={{ padding: "8px 0" }}>
              <table>
                <thead><tr><th>{t("expenses.th.description")}</th><th>{t("expenses.th.category")}</th><th>{t("expenses.th.type")}</th><th>{t("expenses.th.supplier")}</th><th>{t("expenses.th.date")}</th><th className="num">{t("expenses.th.gross")}</th><th>{t("expenses.th.file")}</th><th></th></tr></thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.description}</td>
                      <td><span style={{ background: "var(--navy-soft)", color: "var(--navy)", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{e.category}</span></td>
                      <td>{e.isRecurring
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--brass)", borderRadius: 12, padding: "2px 9px" }}>{t("expenses.type.monthly")}</span>
                        : <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("expenses.type.single")}</span>}</td>
                      <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{e.supplier ?? "—"}</td>
                      <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(e.date).toLocaleDateString(locale)}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(e.amount)}{dual && <div style={{ fontSize: 10.5, color: "var(--muted)" }}>≈ {formatCurrency(e.amount * toBGNRate, "BGN")}</div>}</td>
                      <td><AttachmentCell endpoint={`/api/expenses/${e.id}`} hasFile={e.hasFile} maxMB={3} /></td>
                      <td style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" title={t("expenses.row.edit")} onClick={() => setEdit(e)} style={{ display: "inline-flex", alignItems: "center" }}><UiIcon.edit /></button>
                        <button className="btn btn-ghost btn-sm" title={t("expenses.row.delete")} onClick={() => remove(e)} style={{ color: "var(--brick)", borderColor: "var(--brick)", display: "inline-flex", alignItems: "center" }}><UiIcon.trash /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {edit && <EditModal expense={edit} categories={categories} suppliers={suppliers} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); router.refresh(); }} />}
    </>
  );
}

function EditModal({ expense, categories, suppliers, onClose, onSaved }: {
  expense: ExpenseRow; categories: Cat[]; suppliers: Sup[]; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useI18n();
  const [f, setF] = useState({
    description: expense.description, amount: String(expense.amount), vatAmount: String(expense.vatAmount),
    date: expense.date.slice(0, 10), categoryId: expense.categoryId, supplierId: expense.supplierId ?? "", isRecurring: expense.isRecurring,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true); setError("");
    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: f.description, amount: Number(f.amount), vatAmount: Number(f.vatAmount) || 0,
        date: f.date, categoryId: f.categoryId, supplierId: f.supplierId || null, isRecurring: f.isRecurring,
      }),
    });
    setBusy(false);
    if (res.ok) onSaved(); else setError((await res.json()).error ?? t("expenses.errSave"));
  }
  async function del() {
    if (!confirm(t("expenses.editModal.confirmDelete"))) return;
    setBusy(true);
    const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) onSaved();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: 460, maxWidth: "100%", padding: 24, borderRadius: 14, maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 14px" }}>{t("expenses.editModal.title")}</h3>
        {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>{t("expenses.editModal.description")}</label><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div><label style={{ fontSize: 12 }}>{t("expenses.editModal.gross")}</label><NumberField value={f.amount} onChange={(v) => setF({ ...f, amount: v })} /></div>
          <div><label style={{ fontSize: 12 }}>{t("expenses.editModal.vat")}</label><NumberField value={f.vatAmount} onChange={(v) => setF({ ...f, vatAmount: v })} /></div>
          <div><label style={{ fontSize: 12 }}>{t("expenses.editModal.date")}</label><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div><label style={{ fontSize: 12 }}>{t("expenses.editModal.category")}</label><select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label style={{ fontSize: 12 }}>{t("expenses.editModal.supplier")}</label><select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}><option value="">{t("expenses.editModal.noSupplier")}</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <label style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 400 }}>
            <input type="checkbox" checked={f.isRecurring} onChange={(e) => setF({ ...f, isRecurring: e.target.checked })} style={{ width: "auto" }} /> {t("expenses.editModal.recurring")}
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} disabled={busy} onClick={del}>{t("expenses.editModal.delete")}</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("expenses.editModal.cancel")}</button>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? t("expenses.editModal.saving") : t("expenses.editModal.save")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
