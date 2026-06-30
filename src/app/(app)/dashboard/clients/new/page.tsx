"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Form = { name: string; eik: string; vatNumber: string; contactPerson: string; mol: string; address: string; city: string; contactEmail: string; phone: string };
const EMPTY: Form = { name: "", eik: "", vatNumber: "", contactPerson: "", mol: "", address: "", city: "", contactEmail: "", phone: "" };

export default function NewClientPage() {
  const router = useRouter();
  const [f, setF] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [match, setMatch] = useState<{ name: string; eik: string; vatNumber: string | null; address: string | null; city: string | null; mol: string | null } | null>(null);

  function set<K extends keyof Form>(k: K, v: string) { setF((p) => ({ ...p, [k]: v })); }

  async function lookupEik() {
    const eik = f.eik.trim();
    setMatch(null);
    if (eik.length < 5) return;
    try {
      const res = await fetch(`/api/companies/lookup?eik=${encodeURIComponent(eik)}`);
      const d = await res.json();
      if (d.found && d.registered) setMatch(d.company);
    } catch {}
  }

  function applyMatch() {
    if (!match) return;
    setF((p) => ({
      ...p,
      name: match.name || p.name,
      vatNumber: match.vatNumber || p.vatNumber,
      address: match.address || p.address,
      city: match.city || p.city,
      mol: match.mol || p.mol,
    }));
    setMatch(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/clients", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name, eik: f.eik || undefined, vatNumber: f.vatNumber || undefined,
        contactPerson: f.contactPerson || undefined, mol: f.mol || undefined, address: f.address || undefined,
        city: f.city || undefined, contactEmail: f.contactEmail || undefined, phone: f.phone || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) setError((await res.json()).error ?? "Грешка при запис.");
    else router.push("/dashboard/clients");
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/clients" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Клиенти</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Нов клиент</h1>
      </div>

      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {match && (
        <div style={{ background: "var(--emerald-soft, rgba(15,138,106,.1))", border: "1px solid var(--emerald)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13 }}>
            🔎 Тази фирма е регистрирана в платформата: <strong>{match.name}</strong>. Документите към нея ще се доставят автоматично в профила ѝ.
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={applyMatch}>Попълни данните автоматично</button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: "28px", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 18px" }}>Основни данни</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>Наименование / Пълно име *</label><input value={f.name} onChange={(e) => set("name", e.target.value)} required placeholder="ЕООД Примерна" /></div>
            <div><label>ЕИК / Булстат</label><input value={f.eik} onChange={(e) => set("eik", e.target.value)} onBlur={lookupEik} placeholder="123456789" /></div>
            <div><label>ДДС номер</label><input value={f.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} placeholder="BG123456789" /></div>
            <div><label>Контактно лице</label><input value={f.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} placeholder="Иван Иванов" /></div>
            <div><label>МОЛ</label><input value={f.mol} onChange={(e) => set("mol", e.target.value)} placeholder="Иван Иванов" /></div>
            <div><label>Адрес</label><input value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="ул. Витоша 1" /></div>
            <div><label>Град</label><input value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="София" /></div>
            <div><label>Имейл за контакт</label><input type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="office@firma.bg" /></div>
            <div><label>Телефон</label><input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+359 2 123 4567" /></div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/clients" className="btn btn-ghost">Отказ</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Записване…" : "Запази клиент"}</button>
        </div>
      </form>
    </>
  );
}
