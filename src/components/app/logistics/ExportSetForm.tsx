"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { SearchableSelect } from "@/components/app/logistics/SearchableSelect";

// Дефиниран на модулно ниво, за да НЕ се пресъздава при всеки render — иначе полетата
// вътре remount-ват и губят focus / дата не може да се въвежда с клавиатура. (bug #1/#2)
const LBL: React.CSSProperties = { fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 3 };
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label style={LBL}>{label}</label>{children}</div>);
}

type Vehicle = { id: string; registration: string; trailerReg: string | null };
type Product = { id: string; canonicalName: string };
type Route = { id: string; label: string };
type Company = { id: string; name: string };
type Client = { id: string; name: string };

export function ExportSetForm({ vehicles, products, routes, buyers, clients }: {
  vehicles: Vehicle[]; products: Product[]; routes: Route[]; buyers: Company[]; clients: Client[];
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    invoiceNumber: "", invoiceDate: new Date().toISOString().slice(0, 10), destination: "", routeId: "",
    truckVehicleId: "", trailerReg: "", logisticsProductId: "", quantity: "", declarationCmrDate: new Date().toISOString().slice(0, 10),
    dispatchNumber: "", buyerCompanyId: buyers[0]?.id ?? "", clientId: "",
  });

  function pickTruck(id: string) {
    const v = vehicles.find((x) => x.id === id);
    setF((s) => ({ ...s, truckVehicleId: id, trailerReg: v?.trailerReg ?? s.trailerReg }));
  }
  function pickRoute(id: string) {
    const r = routes.find((x) => x.id === id);
    setF((s) => ({ ...s, routeId: id, destination: r ? r.label : s.destination }));
  }

  async function submit() {
    if (!f.truckVehicleId || !f.logisticsProductId || !(Number(f.quantity) > 0)) { setErr(t("logistics.common.err")); return; }
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/export-sets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceNumber: f.invoiceNumber || null, invoiceDate: f.invoiceDate ? new Date(f.invoiceDate).toISOString() : null,
        destination: f.destination || null, routeId: f.routeId || null,
        truckVehicleId: f.truckVehicleId, trailerReg: f.trailerReg || null,
        logisticsProductId: f.logisticsProductId, quantity: Number(f.quantity),
        declarationCmrDate: f.declarationCmrDate ? new Date(f.declarationCmrDate).toISOString() : null,
        dispatchNumber: f.dispatchNumber || null, buyerCompanyId: f.buyerCompanyId || null, clientId: f.clientId || null,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    router.push(`/dashboard/logistics/export/${j.id}`);
  }

  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics/export" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.export.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.export.heading")}</h1>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>{t("logistics.export.intro")}</p>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      <div className="glass panel" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        <F label={`${t("logistics.export.invoiceNumber")} ${t("logistics.export.invoiceAuto")}`}><input style={inp} value={f.invoiceNumber} onChange={(e) => setF({ ...f, invoiceNumber: e.target.value })} placeholder="0000009617" /></F>
        <F label={t("logistics.export.date")}><input type="date" style={inp} value={f.invoiceDate} onChange={(e) => setF({ ...f, invoiceDate: e.target.value })} /></F>
        <F label={t("logistics.export.destination")}>
          <SearchableSelect options={routes.map((r) => ({ value: r.id, label: r.label }))} value={f.routeId} onChange={pickRoute} emptyLabel="—" />
          <input style={{ ...inp, marginTop: 4 }} value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} placeholder="SKOPIE" />
        </F>
        <F label={t("logistics.export.truck")}>
          <SearchableSelect options={vehicles.map((v) => ({ value: v.id, label: `${v.registration}${v.trailerReg ? ` / ${v.trailerReg}` : ""}` }))} value={f.truckVehicleId} onChange={pickTruck} allowEmpty={false} placeholder="SK501TO / SK5022AE" />
        </F>
        <F label={t("logistics.export.trailer")}><input style={inp} value={f.trailerReg} onChange={(e) => setF({ ...f, trailerReg: e.target.value })} /></F>
        <F label={t("logistics.export.product")}>
          <SearchableSelect options={products.map((p) => ({ value: p.id, label: p.canonicalName }))} value={f.logisticsProductId} onChange={(v) => setF({ ...f, logisticsProductId: v })} allowEmpty={false} />
        </F>
        <F label={t("logistics.export.quantity")}><input type="number" step="0.001" style={inp} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} placeholder="26.04" /></F>
        <F label={t("logistics.export.cmrDate")}><input type="date" style={inp} value={f.declarationCmrDate} onChange={(e) => setF({ ...f, declarationCmrDate: e.target.value })} /></F>
        <F label={`${t("logistics.export.dispatch")} ${t("logistics.export.dispatchAuto")}`}><input style={inp} value={f.dispatchNumber} onChange={(e) => setF({ ...f, dispatchNumber: e.target.value })} placeholder="9617" /></F>
        <F label={t("logistics.export.buyer")}>
          <SearchableSelect options={buyers.map((b) => ({ value: b.id, label: b.name }))} value={f.buyerCompanyId} onChange={(v) => setF({ ...f, buyerCompanyId: v })} emptyLabel="—" />
        </F>
        <F label={t("logistics.export.client")}>
          <SearchableSelect options={clients.map((c) => ({ value: c.id, label: c.name }))} value={f.clientId} onChange={(v) => setF({ ...f, clientId: v })} emptyLabel="—" />
        </F>
      </div>

      <div style={{ marginTop: 14 }}>
        <button className="btn btn-primary" disabled={busy || !f.truckVehicleId || !f.logisticsProductId || !(Number(f.quantity) > 0)} onClick={submit}>{busy ? "…" : t("logistics.export.create")}</button>
      </div>
    </div>
  );
}
