"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import { ClientEmailsEditor, type EmailRow } from "@/components/app/ClientEmailsEditor";

type Client = {
  id: string; name: string; eik: string | null; vatNumber: string | null;
  mol: string | null; contactPerson: string | null; city: string | null;
  address: string | null; contactEmail: string | null; phone: string | null;
};

export function ClientInfoCard({ client, totalInvoiced, initialEmails = [] }: { client: Client; totalInvoiced: number; initialEmails?: EmailRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(client);
  const [emails, setEmails] = useState<EmailRow[]>(initialEmails);

  const set = (k: keyof Client, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true); setError("");
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, emails: emails.filter((e) => e.email.trim()) }),
    });
    setSaving(false);
    if (res.ok) { setEditing(false); router.refresh(); }
    else setError((await res.json()).error ?? "Грешка при запис.");
  }

  const rows: [string, keyof Client][] = [
    ["Наименование", "name"], ["ЕИК / Булстат", "eik"], ["ДДС №", "vatNumber"],
    ["Контактно лице", "contactPerson"], ["МОЛ", "mol"], ["Град", "city"],
    ["Адрес", "address"], ["Имейл", "contactEmail"], ["Телефон", "phone"],
  ];

  if (editing) {
    return (
      <div className="glass panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>Редакция на данни</h3>
        </div>
        {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 10px", fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map(([label, key]) => (
            <div key={key}>
              <label style={{ fontSize: 12 }}>{label}{key === "name" ? " *" : ""}</label>
              <input value={(form[key] as string) ?? ""} onChange={(e) => set(key, e.target.value)} style={{ padding: "7px 10px", fontSize: 13 }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <ClientEmailsEditor value={emails} onChange={setEmails} defaultOpen={emails.length > 0} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setForm(client); setEmails(initialEmails); setEditing(false); }} disabled={saving}>Отказ</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? "Записване…" : "Запази"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>Данни</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>✎ Редактирай</button>
      </div>
      <dl style={{ margin: 0, fontSize: 13, display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 12px" }}>
        {([
          ["ЕИК", client.eik], ["ДДС №", client.vatNumber], ["Контактно лице", client.contactPerson],
          ["МОЛ", client.mol], ["Град", client.city], ["Адрес", client.address],
          ["Имейл", client.contactEmail], ["Телефон", client.phone],
        ] as [string, string | null][]).filter(([, v]) => v).map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt style={{ color: "var(--muted)" }}>{k}</dt>
            <dd style={{ margin: 0, fontWeight: 500 }}>{v}</dd>
          </div>
        ))}
      </dl>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Общо фактурирано</div>
        <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(totalInvoiced)}</div>
      </div>
    </div>
  );
}
