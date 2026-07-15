"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validateEik } from "@/lib/validation/eik";
import { useT } from "@/components/i18n/I18nProvider";
import { ClientEmailsEditor, type EmailRow } from "@/components/app/ClientEmailsEditor";

type Form = { name: string; eik: string; vatNumber: string; contactPerson: string; mol: string; address: string; city: string; contactEmail: string; phone: string };
const EMPTY: Form = { name: "", eik: "", vatNumber: "", contactPerson: "", mol: "", address: "", city: "", contactEmail: "", phone: "" };

export default function NewClientPage() {
  const t = useT();
  const router = useRouter();
  const [f, setF] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [match, setMatch] = useState<{ name: string; eik: string; vatNumber: string | null; address: string | null; city: string | null; mol: string | null } | null>(null);
  const [eikErr, setEikErr] = useState("");
  const [emails, setEmails] = useState<EmailRow[]>([]);

  function set<K extends keyof Form>(k: K, v: string) { setF((p) => ({ ...p, [k]: v })); }

  async function lookupEik() {
    const eik = f.eik.trim();
    setMatch(null);
    if (!eik) { setEikErr(""); return; }
    // Валидация на формат + контролна цифра (ЕИК не е задължителен за клиент)
    const v = validateEik(eik, { required: false });
    setEikErr(v.isValid ? "" : (v.error ?? t("clients.err.eik")));
    if (!v.isValid) return;
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
    if (f.eik.trim()) {
      const v = validateEik(f.eik, { required: false });
      if (!v.isValid) { setEikErr(v.error ?? t("clients.err.eik")); setError(v.error ?? t("clients.err.eik")); return; }
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/clients", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name, eik: f.eik || undefined, vatNumber: f.vatNumber || undefined,
        contactPerson: f.contactPerson || undefined, mol: f.mol || undefined, address: f.address || undefined,
        city: f.city || undefined, contactEmail: f.contactEmail || undefined, phone: f.phone || undefined,
        ...(emails.filter((e) => e.email.trim()).length ? { emails: emails.filter((e) => e.email.trim()) } : {}),
      }),
    });
    setSaving(false);
    if (!res.ok) setError((await res.json()).error ?? t("clients.err.save"));
    else router.push("/dashboard/clients");
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/clients" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("clients.new.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("clients.new.heading")}</h1>
      </div>

      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {match && (
        <div style={{ background: "var(--emerald-soft, rgba(15,138,106,.1))", border: "1px solid var(--emerald)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13 }}>
            {t("clients.new.matchInfo", { name: match.name })}
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={applyMatch}>{t("clients.new.matchFill")}</button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: "28px", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 18px" }}>{t("clients.new.section")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("clients.new.f.name")}</label><input value={f.name} onChange={(e) => set("name", e.target.value)} required placeholder={t("clients.new.f.namePh")} /></div>
            <div>
              <label>{t("clients.new.f.eik")}</label>
              <input value={f.eik} onChange={(e) => { set("eik", e.target.value); if (eikErr) setEikErr(""); }} onBlur={lookupEik} placeholder="123456789" style={eikErr ? { borderColor: "var(--brick)" } : undefined} />
              {eikErr && <div style={{ color: "var(--brick)", fontSize: 11.5, marginTop: 3 }}>{eikErr}</div>}
            </div>
            <div><label>{t("clients.new.f.vat")}</label><input value={f.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} placeholder="BG123456789" /></div>
            <div><label>{t("clients.new.f.contactPerson")}</label><input value={f.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} placeholder={t("clients.new.f.person")} /></div>
            <div><label>{t("clients.new.f.mol")}</label><input value={f.mol} onChange={(e) => set("mol", e.target.value)} placeholder={t("clients.new.f.person")} /></div>
            <div><label>{t("clients.new.f.address")}</label><input value={f.address} onChange={(e) => set("address", e.target.value)} placeholder={t("clients.new.f.addressPh")} /></div>
            <div><label>{t("clients.new.f.city")}</label><input value={f.city} onChange={(e) => set("city", e.target.value)} placeholder={t("clients.new.f.cityPh")} /></div>
            <div><label>{t("clients.new.f.email")}</label><input type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder={t("clients.new.f.emailPh")} /></div>
            <div><label>{t("clients.new.f.phone")}</label><input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+359 2 123 4567" /></div>
          </div>
        </div>

        <ClientEmailsEditor value={emails} onChange={setEmails} defaultOpen={false} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/clients" className="btn btn-ghost">{t("clients.new.cancel")}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t("clients.new.saving") : t("clients.new.save")}</button>
        </div>
      </form>
    </>
  );
}
