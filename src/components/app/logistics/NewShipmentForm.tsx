"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { SearchableSelect } from "@/components/app/logistics/SearchableSelect";
import { computeNet } from "@/lib/logistics/shipmentCalc";

type Vehicle = { id: string; registration: string; trailerReg: string | null; carrierId: string | null; driver: string | null };
type Product = { id: string; canonicalName: string; materialCode: string | null; unit: string };
type Carrier = { id: string; name: string };
type Supplier = { id: string; name: string };

export function NewShipmentForm({ vehicles, products, carriers, suppliers }: {
  vehicles: Vehicle[]; products: Product[]; carriers: Carrier[]; suppliers: Supplier[];
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    dispatchNoteNumber: "", dispatchDate: new Date().toISOString().slice(0, 10), supplierId: suppliers[0]?.id ?? "",
    vehicleId: "", trailerReg: "", carrierId: "", driver: "",
    productId: "", materialCode: "", unit: "t",
    gross: "", tara: "", net: "",
    contract: "", clientNumber: "", factory: "", loadingPlace: "", incoterm: "", destination: "", recipient: "", note: "",
  });

  // Автоматично попълване от досието на автомобила (ремарке/превозвач/шофьор).
  function pickVehicle(id: string) {
    const v = vehicles.find((x) => x.id === id);
    setF((s) => ({ ...s, vehicleId: id, trailerReg: v?.trailerReg ?? s.trailerReg, carrierId: v?.carrierId ?? s.carrierId, driver: v?.driver ?? s.driver }));
  }
  // Автоматично попълване от продукта (material code + мерна единица).
  function pickProduct(id: string) {
    const p = products.find((x) => x.id === id);
    setF((s) => ({ ...s, productId: id, materialCode: p?.materialCode ?? "", unit: p?.unit ?? s.unit }));
  }

  const net = useMemo(() => {
    const explicit = f.net ? Number(f.net) : null;
    return computeNet(f.gross ? Number(f.gross) : null, f.tara ? Number(f.tara) : null, explicit);
  }, [f.gross, f.tara, f.net]);

  async function submit() {
    setErr(""); setBusy(true);
    const body = {
      dispatchNoteNumber: f.dispatchNoteNumber || null,
      dispatchDate: new Date(f.dispatchDate).toISOString(),
      supplierId: f.supplierId || null,
      vehicleId: f.vehicleId, trailerReg: f.trailerReg || null, carrierId: f.carrierId || null, driver: f.driver || null,
      productId: f.productId,
      grossWeight: f.gross ? Number(f.gross) : null, tara: f.tara ? Number(f.tara) : null, netQuantity: f.net ? Number(f.net) : null,
      unit: f.unit,
      contract: f.contract || null, clientNumber: f.clientNumber || null, factory: f.factory || null,
      loadingPlace: f.loadingPlace || null, incoterm: f.incoterm || null, destination: f.destination || null,
      recipient: f.recipient || null, note: f.note || null,
    };
    const r = await fetch("/api/logistics/shipments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    router.push(`/dashboard/logistics/shipments/${j.id}`);
  }

  const canSubmit = f.vehicleId && f.productId && f.dispatchDate && net != null && net > 0;
  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 3 } as const;
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (<div><label style={lbl}>{label}</label>{children}</div>);

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics/shipments" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.shipments.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.shipNew.heading")}</h1>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>{t("logistics.shipNew.autofillHint")}</p>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      <div className="glass panel" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        <Field label={t("logistics.shipNew.dispatchNote")}><input style={inp} value={f.dispatchNoteNumber} onChange={(e) => setF({ ...f, dispatchNoteNumber: e.target.value })} placeholder="B0000313802" /></Field>
        <Field label={t("logistics.shipNew.dispatchDate")}><input type="date" style={inp} value={f.dispatchDate} onChange={(e) => setF({ ...f, dispatchDate: e.target.value })} /></Field>
        <Field label={t("logistics.shipNew.supplier")}>
          <SearchableSelect options={suppliers.map((s) => ({ value: s.id, label: s.name }))} value={f.supplierId} onChange={(v) => setF({ ...f, supplierId: v })} emptyLabel="—" />
        </Field>

        <Field label={t("logistics.shipNew.vehicle")}>
          <SearchableSelect options={vehicles.map((v) => ({ value: v.id, label: v.registration }))} value={f.vehicleId} onChange={pickVehicle} placeholder={t("logistics.shipNew.selectVehicle")} allowEmpty={false} />
        </Field>
        <Field label={t("logistics.shipNew.trailer")}><input style={inp} value={f.trailerReg} onChange={(e) => setF({ ...f, trailerReg: e.target.value })} /></Field>
        <Field label={t("logistics.shipNew.carrier")}>
          <SearchableSelect options={carriers.map((c) => ({ value: c.id, label: c.name }))} value={f.carrierId} onChange={(v) => setF({ ...f, carrierId: v })} emptyLabel="—" />
        </Field>
        <Field label={t("logistics.shipNew.driver")}><input style={inp} value={f.driver} onChange={(e) => setF({ ...f, driver: e.target.value })} /></Field>

        <Field label={t("logistics.shipNew.product")}>
          <SearchableSelect options={products.map((p) => ({ value: p.id, label: p.canonicalName, keywords: p.materialCode ?? "" }))} value={f.productId} onChange={pickProduct} placeholder={t("logistics.shipNew.selectProduct")} allowEmpty={false} />
        </Field>
        <Field label={t("logistics.shipNew.materialCode")}><input style={{ ...inp, background: "rgba(0,0,0,.03)" }} value={f.materialCode} readOnly /></Field>
        <Field label={t("logistics.shipNew.unit")}><input style={inp} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>

        <Field label={t("logistics.shipNew.gross")}><input type="number" step="0.001" style={inp} value={f.gross} onChange={(e) => setF({ ...f, gross: e.target.value })} placeholder="39.12" /></Field>
        <Field label={t("logistics.shipNew.tara")}><input type="number" step="0.001" style={inp} value={f.tara} onChange={(e) => setF({ ...f, tara: e.target.value })} placeholder="12.98" /></Field>
        <Field label={t("logistics.shipNew.net")}>
          <input type="number" step="0.001" style={{ ...inp, fontWeight: 700 }} value={f.net} onChange={(e) => setF({ ...f, net: e.target.value })} placeholder={net != null ? String(net) : "26.14"} />
          {f.net === "" && net != null && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>= {net} {f.unit}</div>}
        </Field>

        <Field label={t("logistics.shipNew.contract")}><input style={inp} value={f.contract} onChange={(e) => setF({ ...f, contract: e.target.value })} /></Field>
        <Field label={t("logistics.shipNew.clientNumber")}><input style={inp} value={f.clientNumber} onChange={(e) => setF({ ...f, clientNumber: e.target.value })} /></Field>
        <Field label={t("logistics.shipNew.factory")}><input style={inp} value={f.factory} onChange={(e) => setF({ ...f, factory: e.target.value })} /></Field>
        <Field label={t("logistics.shipNew.loadingPlace")}><input style={inp} value={f.loadingPlace} onChange={(e) => setF({ ...f, loadingPlace: e.target.value })} /></Field>
        <Field label={t("logistics.shipNew.incoterm")}><input style={inp} value={f.incoterm} onChange={(e) => setF({ ...f, incoterm: e.target.value })} placeholder="CPT / FCA / EXW" /></Field>
        <Field label={t("logistics.shipNew.destination")}><input style={inp} value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} placeholder="Скопие" /></Field>
        <Field label={t("logistics.shipNew.recipient")}><input style={inp} value={f.recipient} onChange={(e) => setF({ ...f, recipient: e.target.value })} /></Field>
        <div style={{ gridColumn: "1 / -1" }}><Field label={t("logistics.shipNew.note")}><textarea style={{ ...inp, minHeight: 44 }} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field></div>
      </div>

      <div style={{ marginTop: 14 }}>
        <button className="btn btn-primary" disabled={busy || !canSubmit} onClick={submit}>{busy ? t("logistics.shipNew.creating") : t("logistics.shipNew.create")}</button>
      </div>
    </div>
  );
}
