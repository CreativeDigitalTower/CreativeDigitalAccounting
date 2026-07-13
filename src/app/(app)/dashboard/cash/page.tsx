"use client";

import { useEffect, useState } from "react";
import { CURRENCIES, formatCurrency } from "@/lib/constants";
import { NavIcon, UiIcon } from "@/components/app/NavIcons";
import { useT } from "@/components/i18n/I18nProvider";

type Register = { id: string; name: string; currency: string; balance: number };

export default function CashPage() {
  const t = useT();
  const [registers, setRegisters] = useState<Register[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newCurrency, setNewCurrency] = useState("EUR");
  const [creating, setCreating] = useState(false);

  async function load() {
    const data = await fetch("/api/cash").then((r) => r.json());
    setRegisters(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createRegister() {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, currency: newCurrency }),
    });
    setNewName("");
    setCreating(false);
    load();
  }

  // Обща каса по валути
  const totalsByCurrency = registers.reduce((acc, r) => {
    acc[r.currency] = (acc[r.currency] ?? 0) + r.balance;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <div style={{ color: "var(--muted)", padding: 40 }}>{t("modules.cash.loading")}</div>;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("modules.cash.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("modules.cash.subtitle", { n: registers.length })}</div>
        </div>
      </div>

      {/* Обща КАСА */}
      <div className="glass panel" style={{ padding: "20px 24px", marginBottom: 18, borderLeft: "4px solid var(--emerald)" }}>
        <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{t("modules.cash.totalTitle")}</div>
        {Object.keys(totalsByCurrency).length === 0 ? (
          <div className="num" style={{ fontSize: 26, fontWeight: 700 }}>{formatCurrency(0)}</div>
        ) : (
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {Object.entries(totalsByCurrency).map(([cur, sum]) => (
              <div key={cur} className="num" style={{ fontSize: 26, fontWeight: 700 }}>{formatCurrency(sum, cur)}</div>
            ))}
          </div>
        )}
      </div>

      {/* Списък каси */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 18 }}>
        {registers.map((r) => (
          <CashCard key={r.id} register={r} onChange={load} t={t} />
        ))}
      </div>

      {/* Нова каса */}
      <div className="glass panel" style={{ padding: "18px 22px" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>{t("modules.cash.newTitle")}</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label>{t("modules.cash.nameLabel")}</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("modules.cash.namePh")} />
          </div>
          <div style={{ width: 160 }}>
            <label>{t("modules.cash.currency")}</label>
            <select value={newCurrency} onChange={(e) => setNewCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
          <button onClick={createRegister} className="btn btn-primary" disabled={creating || !newName.trim()}>
            {t("modules.cash.create")}
          </button>
        </div>
      </div>
    </>
  );
}

function CashCard({ register, onChange, t }: { register: Register; onChange: () => void; t: (k: string, v?: Record<string, string | number>) => string }) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(register.name);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balance, setBalance] = useState(String(register.balance));

  async function saveName() {
    await fetch(`/api/cash/${register.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setEditingName(false);
    onChange();
  }
  async function saveBalance() {
    await fetch(`/api/cash/${register.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance: parseFloat(balance) || 0 }),
    });
    setEditingBalance(false);
    onChange();
  }
  async function remove() {
    if (!confirm(t("modules.cash.confirmDelete", { name: register.name }))) return;
    await fetch(`/api/cash/${register.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="glass panel" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 8 }}>
        {editingName ? (
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ fontSize: 13 }} />
            <button onClick={saveName} className="btn btn-primary btn-sm">✓</button>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              <NavIcon.cash width={16} height={16} /> {register.name}
              <button onClick={() => setEditingName(true)} title={t("modules.cash.rename")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "inline-flex", alignItems: "center" }}><UiIcon.edit width={13} height={13} /></button>
            </div>
            <button onClick={remove} title={t("modules.cash.delete")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brick)", display: "inline-flex", alignItems: "center" }}><UiIcon.trash width={15} height={15} /></button>
          </>
        )}
      </div>

      {editingBalance ? (
        <div style={{ display: "flex", gap: 6 }}>
          <input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} style={{ fontSize: 15, fontFamily: "'IBM Plex Mono', monospace" }} />
          <button onClick={saveBalance} className="btn btn-primary btn-sm">{t("modules.cash.save")}</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{formatCurrency(register.balance, register.currency)}</div>
          <button onClick={() => { setBalance(String(register.balance)); setEditingBalance(true); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--navy)", fontWeight: 600 }}>
            {t("modules.cash.edit")}
          </button>
        </div>
      )}
    </div>
  );
}
