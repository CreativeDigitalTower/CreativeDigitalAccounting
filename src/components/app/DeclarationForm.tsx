"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
type Product = { name: string; kg: string; batch: string; bestBefore: string };
type Lab = { indicator: string; method: string; result: string };
type Client = { id: string; name: string; eik: string | null; vatNumber: string | null; address: string | null; city: string | null; mol: string | null };

export function DeclarationForm() {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [client, setClient] = useState({ clientName: "", clientEik: "", clientAddress: "", clientMol: "" });
  const [products, setProducts] = useState<Product[]>([{ name: "", kg: "", batch: "", bestBefore: "" }]);
  const [labs, setLabs] = useState<Lab[]>([{ indicator: "", method: "", result: "" }]);
  const [declarationText, setDeclarationText] = useState(t("subdocs.decl.form.defaultText"));
  const [storageNote, setStorageNote] = useState(t("subdocs.decl.form.defaultStorage"));
  const [signedBy, setSignedBy] = useState("");

  useEffect(() => { fetch("/api/clients").then((r) => r.ok ? r.json() : []).then((d) => setClients(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  function pickClient(id: string) {
    const c = clients.find((x) => x.id === id);
    if (!c) { setClient({ clientName: "", clientEik: "", clientAddress: "", clientMol: "" }); return; }
    setClient({ clientName: c.name, clientEik: c.eik ?? c.vatNumber ?? "", clientAddress: [c.address, c.city].filter(Boolean).join(", "), clientMol: c.mol ?? "" });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/declarations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: number || undefined, date, ...client,
        products: products.filter((p) => p.name.trim()),
        labResults: labs.filter((l) => l.indicator.trim()),
        declarationText, storageNote, signedBy,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/documents/declarations");
    else setError((await res.json()).error ?? t("subdocs.decl.form.errSave"));
  }

  const setP = (i: number, k: keyof Product, v: string) => setProducts(products.map((p, idx) => idx === i ? { ...p, [k]: v } : p));
  const setL = (i: number, k: keyof Lab, v: string) => setLabs(labs.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/documents/declarations" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("subdocs.decl.form.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("subdocs.decl.form.heading")}</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={submit}>
        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 12 }}>
            <div><label>{t("subdocs.decl.form.number")}</label><input value={number} onChange={(e) => setNumber(e.target.value)} placeholder={t("subdocs.decl.form.numberPh")} /></div>
            <div><label>{t("subdocs.decl.form.date")}</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>{t("subdocs.decl.form.supplierNote")}</p>
        </div>

        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>{t("subdocs.decl.form.clientTitle")}</h3>
          {clients.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label>{t("subdocs.decl.form.pickClient")}</label>
              <select onChange={(e) => pickClient(e.target.value)} defaultValue=""><option value="">{t("subdocs.decl.form.manual")}</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("subdocs.decl.form.name")}</label><input value={client.clientName} onChange={(e) => setClient({ ...client, clientName: e.target.value })} required /></div>
            <div><label>{t("subdocs.decl.form.eikVat")}</label><input value={client.clientEik} onChange={(e) => setClient({ ...client, clientEik: e.target.value })} /></div>
            <div><label>{t("subdocs.decl.form.mol")}</label><input value={client.clientMol} onChange={(e) => setClient({ ...client, clientMol: e.target.value })} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("subdocs.decl.form.address")}</label><input value={client.clientAddress} onChange={(e) => setClient({ ...client, clientAddress: e.target.value })} /></div>
          </div>
        </div>

        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 6px" }}>{t("subdocs.decl.form.productsTitle")}</h3>
          <table>
            <thead><tr><th>{t("subdocs.decl.form.pName")}</th><th>{t("subdocs.decl.form.pKg")}</th><th>{t("subdocs.decl.form.pBatch")}</th><th>{t("subdocs.decl.form.pBest")}</th><th></th></tr></thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i}>
                  <td><input value={p.name} onChange={(e) => setP(i, "name", e.target.value)} style={{ padding: "6px 8px", fontSize: 13 }} /></td>
                  <td><input value={p.kg} onChange={(e) => setP(i, "kg", e.target.value)} style={{ padding: "6px 8px", fontSize: 13, maxWidth: 90 }} /></td>
                  <td><input value={p.batch} onChange={(e) => setP(i, "batch", e.target.value)} style={{ padding: "6px 8px", fontSize: 13, maxWidth: 140 }} /></td>
                  <td><input value={p.bestBefore} onChange={(e) => setP(i, "bestBefore", e.target.value)} placeholder={t("subdocs.decl.form.bestPh")} style={{ padding: "6px 8px", fontSize: 13, maxWidth: 130 }} /></td>
                  <td>{products.length > 1 && <button type="button" onClick={() => setProducts(products.filter((_, x) => x !== i))} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 16 }}>×</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => setProducts([...products, { name: "", kg: "", batch: "", bestBefore: "" }])} style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: "var(--navy)", background: "none", border: "1px dashed var(--border)", padding: "7px 12px", borderRadius: 6, cursor: "pointer" }}>{t("subdocs.decl.form.addProduct")}</button>
        </div>

        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <div><label>{t("subdocs.decl.form.declText")}</label><textarea rows={3} value={declarationText} onChange={(e) => setDeclarationText(e.target.value)} /></div>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "16px 0 6px" }}>{t("subdocs.decl.form.labTitle")}</h3>
          <table>
            <thead><tr><th>{t("subdocs.decl.form.lIndicator")}</th><th>{t("subdocs.decl.form.lMethod")}</th><th>{t("subdocs.decl.form.lResult")}</th><th></th></tr></thead>
            <tbody>
              {labs.map((l, i) => (
                <tr key={i}>
                  <td><input value={l.indicator} onChange={(e) => setL(i, "indicator", e.target.value)} style={{ padding: "6px 8px", fontSize: 13 }} /></td>
                  <td><input value={l.method} onChange={(e) => setL(i, "method", e.target.value)} placeholder={t("subdocs.decl.form.methodPh")} style={{ padding: "6px 8px", fontSize: 13 }} /></td>
                  <td><input value={l.result} onChange={(e) => setL(i, "result", e.target.value)} style={{ padding: "6px 8px", fontSize: 13, maxWidth: 120 }} /></td>
                  <td>{labs.length > 1 && <button type="button" onClick={() => setLabs(labs.filter((_, x) => x !== i))} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 16 }}>×</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => setLabs([...labs, { indicator: "", method: "", result: "" }])} style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: "var(--navy)", background: "none", border: "1px dashed var(--border)", padding: "7px 12px", borderRadius: 6, cursor: "pointer" }}>{t("subdocs.decl.form.addLab")}</button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <div><label>{t("subdocs.decl.form.storage")}</label><input value={storageNote} onChange={(e) => setStorageNote(e.target.value)} /></div>
            <div><label>{t("subdocs.decl.form.signedBy")}</label><input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} /></div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/documents/declarations" className="btn btn-ghost">{t("subdocs.decl.form.cancel")}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t("subdocs.decl.form.saving") : t("subdocs.decl.form.submit")}</button>
        </div>
      </form>
    </>
  );
}
