"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

type Party = { id: string; name: string };

export default function NewContractPage() {
  const t = useT();
  const router = useRouter();
  const [type, setType] = useState<"client" | "supplier">("client");
  const [clients, setClients] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients).catch(() => {});
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/contracts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        counterpartyType: type,
        clientId: type === "client" ? fd.get("partyId") || null : null,
        supplierId: type === "supplier" ? fd.get("partyId") || null : null,
        startDate: fd.get("startDate"),
        endDate: fd.get("endDate") || null,
        autoRenew: fd.get("autoRenew") === "on",
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/contracts");
    else setError((await res.json()).error ?? t("contracts.errSave"));
  }

  const parties = type === "client" ? clients : suppliers;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/contracts" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("contracts.new.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("contracts.new.heading")}</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("contracts.new.f.title")}</label><input type="text" name="title" required placeholder={t("contracts.new.f.titlePh")} /></div>
            <div><label>{t("contracts.new.f.party")}</label>
              <select value={type} onChange={(e) => setType(e.target.value as "client" | "supplier")}>
                <option value="client">{t("contracts.partyType.client")}</option><option value="supplier">{t("contracts.partyType.supplier")}</option>
              </select>
            </div>
            <div><label>{t(`contracts.partyType.${type}`)}</label>
              <select name="partyId"><option value="">—</option>{parties.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </div>
            <div><label>{t("contracts.new.f.start")}</label><input type="date" name="startDate" required defaultValue={new Date().toISOString().slice(0,10)} /></div>
            <div><label>{t("contracts.new.f.end")}</label><input type="date" name="endDate" /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input type="checkbox" name="autoRenew" id="ar" style={{ width: "auto" }} />
              <label htmlFor="ar" style={{ margin: 0 }}>{t("contracts.new.f.autoRenew")}</label>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/contracts" className="btn btn-ghost">{t("contracts.new.cancel")}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t("contracts.new.saving") : t("contracts.new.save")}</button>
        </div>
      </form>
    </>
  );
}
