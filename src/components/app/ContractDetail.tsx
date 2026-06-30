"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AttachmentCell } from "@/components/app/AttachmentCell";
import { formatCurrency } from "@/lib/constants";

const STATUS: Record<string, string> = { active: "Активен", expired: "Изтекъл", cancelled: "Анулиран" };

type Contract = {
  id: string; title: string; party: string; startDate: string; endDate: string | null;
  autoRenew: boolean; status: string; value: number | null; notes: string | null; hasFile: boolean;
};

export function ContractDetail({ contract }: { contract: Contract }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState(contract);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/contracts/${contract.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: f.title, startDate: f.startDate, endDate: f.endDate || null,
        autoRenew: f.autoRenew, status: f.status, value: f.value, notes: f.notes,
      }),
    });
    setBusy(false);
    if (res.ok) { setEdit(false); router.refresh(); }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/dashboard/contracts" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Договори</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{f.title}</h1>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} disabled={busy} onClick={() => (edit ? save() : setEdit(true))}>
          {edit ? (busy ? "Запазване…" : "Запази") : "✎ Редактирай"}
        </button>
      </div>

      <div className="glass panel" style={{ maxWidth: 620 }}>
        {edit ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>Заглавие</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div><label style={{ fontSize: 12 }}>Начало</label><input type="date" value={f.startDate?.slice(0, 10) ?? ""} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></div>
            <div><label style={{ fontSize: 12 }}>Край</label><input type="date" value={f.endDate?.slice(0, 10) ?? ""} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></div>
            <div><label style={{ fontSize: 12 }}>Стойност (€)</label><input type="number" value={f.value ?? ""} onChange={(e) => setF({ ...f, value: e.target.value ? Number(e.target.value) : null })} /></div>
            <div><label style={{ fontSize: 12 }}>Статус</label>
              <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <label style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center", fontSize: 13, margin: 0 }}>
              <input type="checkbox" checked={f.autoRenew} onChange={(e) => setF({ ...f, autoRenew: e.target.checked })} style={{ width: "auto" }} /> Автоматично подновяване
            </label>
            <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>Бележки</label><textarea rows={4} value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} style={{ width: "100%" }} /></div>
          </div>
        ) : (
          <>
            <dl style={{ margin: 0, fontSize: 13.5, display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 14px" }}>
              {[
                ["Страна", f.party],
                ["Начало", new Date(f.startDate).toLocaleDateString("bg-BG")],
                ["Край", f.endDate ? new Date(f.endDate).toLocaleDateString("bg-BG") : "—"],
                ["Стойност", f.value != null ? formatCurrency(f.value) : "—"],
                ["Авт. подновяване", f.autoRenew ? "Да" : "Не"],
                ["Статус", STATUS[f.status]],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}><dt style={{ color: "var(--muted)" }}>{k}</dt><dd style={{ margin: 0, fontWeight: 500 }}>{v}</dd></div>
              ))}
            </dl>
            {f.notes && <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 12, whiteSpace: "pre-wrap" }}>{f.notes}</p>}
          </>
        )}

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Файл на договора (PDF/DOCX/снимка)</div>
          <AttachmentCell endpoint={`/api/contracts/${contract.id}`} hasFile={contract.hasFile} maxMB={8} />
        </div>
      </div>
    </>
  );
}
