"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

type Client = { id: string; name: string; eik: string | null; address: string | null; city: string | null; mol: string | null; contactPerson: string | null };

export function ProtocolForm() {
  const t = useT();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cp, setCp] = useState({ counterpartyId: "", counterpartyName: "", counterpartyEik: "", counterpartyAddress: "", counterpartyMol: "" });

  useEffect(() => { fetch("/api/clients").then((r) => r.json()).then((d) => setClients(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  function pickClient(id: string) {
    const c = clients.find((x) => x.id === id);
    if (!c) { setCp({ counterpartyId: "", counterpartyName: "", counterpartyEik: "", counterpartyAddress: "", counterpartyMol: "" }); return; }
    setCp({
      counterpartyId: c.id, counterpartyName: c.name, counterpartyEik: c.eik ?? "",
      counterpartyAddress: [c.address, c.city].filter(Boolean).join(", "), counterpartyMol: c.mol ?? c.contactPerson ?? "",
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/handover-protocols", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: fd.get("number") || undefined,
        date: fd.get("date"),
        place: fd.get("place") || null,
        counterpartyId: cp.counterpartyId || null,
        counterpartyName: cp.counterpartyName || null,
        counterpartyEik: cp.counterpartyEik || null,
        counterpartyAddress: cp.counterpartyAddress || null,
        counterpartyMol: cp.counterpartyMol || null,
        items: fd.get("items") || null,
        handedBy: fd.get("handedBy") || null,
        receivedBy: fd.get("receivedBy") || null,
        description: fd.get("description") || null,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/documents/protocols");
    else setError((await res.json()).error ?? t("subdocs.prot.form.errSave"));
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/documents/protocols" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("subdocs.prot.form.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("subdocs.prot.form.heading")}</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Основни данни */}
        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{t("subdocs.prot.form.basicTitle")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 14 }}>
            <div><label>{t("subdocs.prot.form.number")}</label><input type="text" name="number" placeholder={t("subdocs.prot.form.numberPh")} /></div>
            <div><label>{t("subdocs.prot.form.date")}</label><input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
            <div><label>{t("subdocs.prot.form.place")}</label><input type="text" name="place" placeholder={t("subdocs.prot.form.placePh")} /></div>
          </div>
        </div>

        {/* Приемаща страна */}
        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{t("subdocs.prot.form.receiverTitle")}</h3>
          <div style={{ marginBottom: 12 }}>
            <label>{t("subdocs.prot.form.pickClient")}</label>
            <select value={cp.counterpartyId} onChange={(e) => pickClient(e.target.value)}>
              <option value="">{t("subdocs.prot.form.manual")}</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("subdocs.prot.form.name")}</label><input type="text" required value={cp.counterpartyName} onChange={(e) => setCp({ ...cp, counterpartyName: e.target.value, counterpartyId: "" })} placeholder={t("subdocs.prot.form.namePh")} /></div>
            <div><label>{t("subdocs.prot.form.eik")}</label><input type="text" value={cp.counterpartyEik} onChange={(e) => setCp({ ...cp, counterpartyEik: e.target.value })} /></div>
            <div><label>{t("subdocs.prot.form.mol")}</label><input type="text" value={cp.counterpartyMol} onChange={(e) => setCp({ ...cp, counterpartyMol: e.target.value })} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("subdocs.prot.form.address")}</label><input type="text" value={cp.counterpartyAddress} onChange={(e) => setCp({ ...cp, counterpartyAddress: e.target.value })} /></div>
          </div>
        </div>

        {/* Предмет */}
        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{t("subdocs.prot.form.subjectTitle")}</h3>
          <div><label>{t("subdocs.prot.form.items")}</label><textarea name="items" rows={5} required placeholder={t("subdocs.prot.form.itemsPh")} /></div>
          <div style={{ marginTop: 12 }}><label>{t("subdocs.prot.form.notes")}</label><textarea name="description" rows={3} placeholder={t("subdocs.prot.form.notesPh")} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
            <div><label>{t("subdocs.prot.form.handedBy")}</label><input type="text" name="handedBy" placeholder={t("subdocs.prot.form.personPh")} /></div>
            <div><label>{t("subdocs.prot.form.receivedBy")}</label><input type="text" name="receivedBy" placeholder={t("subdocs.prot.form.personPh")} /></div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/documents/protocols" className="btn btn-ghost">{t("subdocs.prot.form.cancel")}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t("subdocs.prot.form.saving") : t("subdocs.prot.form.submit")}</button>
        </div>
      </form>
    </>
  );
}
