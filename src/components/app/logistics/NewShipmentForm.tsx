"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { SearchableSelect } from "@/components/app/logistics/SearchableSelect";
import { computeNet } from "@/lib/logistics/shipmentCalc";
import { normalizeRegistration } from "@/lib/logistics/normalize";
import { exceedsPayload, pickVehicleConfig } from "@/lib/logistics/fleet";
import { parseQuantity, fmtQuantity } from "@/lib/i18n/format";
import { QuantityInput } from "@/components/app/logistics/QuantityInput";
import { useFieldErrors, Req, FieldError, ValidationBanner, ariaProps, errStyle, type FieldErrors } from "@/components/app/logistics/formValidation";

type ConfigRow = { id: string; truck: string; trailer: string | null; carrierId: string | null; carrierName: string | null; driver: string | null; cargoMode: string; maxPayloadTons: number | null; active: boolean };
type Vehicle = { id: string; registration: string; trailerReg: string | null; carrierId: string | null; driver: string | null };
type Product = { id: string; canonicalName: string; materialCode: string | null; unit: string };
type Carrier = { id: string; name: string };
type Supplier = { id: string; name: string };

export function NewShipmentForm({ vehicles, products, carriers, suppliers }: {
  vehicles: Vehicle[]; products: Product[]; carriers: Carrier[]; suppliers: Supplier[];
}) {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { errors, banner, register, clearField, fail, setBanner } = useFieldErrors();
  const [f, setF] = useState({
    dispatchNoteNumber: "", dispatchDate: new Date().toISOString().slice(0, 10), supplierId: suppliers[0]?.id ?? "",
    vehicleId: "", trailerReg: "", carrierId: "", driver: "",
    productId: "", materialCode: "", unit: "t",
    gross: "", tara: "", net: "",
    contract: "", clientNumber: "", factory: "", loadingPlace: "", incoterm: "", destination: "", recipient: "", note: "",
  });
  // Конфигурации на автопарка (§27): филтър по превозвач → само неговите автомобили;
  // изборът на автомобил snapshot-ва влекач/ремарке/последен шофьор/капацитет/вид товар.
  // Шофьорът остава редактируем (§35). Капацитетът се валидира (§28).
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [carrierFilter, setCarrierFilter] = useState("");
  const [cfg, setCfg] = useState<{ maxPayloadTons: number | null; cargoMode: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/logistics/vehicle-configs?active=1");
      if (r.ok) setConfigs(await r.json());
    })();
  }, []);

  // Влекач(рег.) → конфигурации, съпоставени по нормализиран рег. номер към vehicles.
  const configsByVehicleId = useMemo(() => {
    const byNorm = new Map<string, ConfigRow[]>();
    for (const c of configs) {
      const k = normalizeRegistration(c.truck);
      (byNorm.get(k) ?? byNorm.set(k, []).get(k)!).push(c);
    }
    const m = new Map<string, ConfigRow[]>();
    for (const v of vehicles) { const rows = byNorm.get(normalizeRegistration(v.registration)); if (rows) m.set(v.id, rows); }
    return m;
  }, [configs, vehicles]);

  // Превозвачи, които реално имат автомобили в конфигурациите.
  const carrierOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of configs) if (c.carrierId && c.carrierName) seen.set(c.carrierId, c.carrierName);
    const known = [...seen.entries()].map(([id, name]) => ({ value: id, label: name }));
    return known.length ? known : carriers.map((c) => ({ value: c.id, label: c.name }));
  }, [configs, carriers]);

  // Автомобили, филтрирани по избрания превозвач (§27).
  const vehicleOptions = useMemo(() => {
    const list = carrierFilter
      ? vehicles.filter((v) => (configsByVehicleId.get(v.id) ?? []).some((c) => c.carrierId === carrierFilter))
      : vehicles;
    return list.map((v) => ({ value: v.id, label: v.registration }));
  }, [vehicles, carrierFilter, configsByVehicleId]);

  // Автоматично попълване от конфигурацията (или досието на автомобила като fallback).
  function pickVehicle(id: string) {
    clearField("vehicleId");
    const v = vehicles.find((x) => x.id === id);
    const rows = configsByVehicleId.get(id) ?? [];
    const c = pickVehicleConfig(rows, carrierFilter);
    setCfg(c ? { maxPayloadTons: c.maxPayloadTons, cargoMode: c.cargoMode } : null);
    setF((s) => ({
      ...s,
      vehicleId: id,
      trailerReg: c?.trailer ?? v?.trailerReg ?? s.trailerReg,
      carrierId: c?.carrierId ?? v?.carrierId ?? s.carrierId,
      driver: c?.driver ?? v?.driver ?? s.driver,
    }));
  }
  // Автоматично попълване от продукта (material code + мерна единица).
  function pickProduct(id: string) {
    clearField("productId");
    const p = products.find((x) => x.id === id);
    setF((s) => ({ ...s, productId: id, materialCode: p?.materialCode ?? "", unit: p?.unit ?? s.unit }));
  }

  // Количествата приемат точка ИЛИ запетая (parseQuantity). computeNet ползва реалните
  // стойности, не форматирания string.
  const net = useMemo(() => {
    return computeNet(parseQuantity(f.gross), parseQuantity(f.tara), parseQuantity(f.net));
  }, [f.gross, f.tara, f.net]);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!f.vehicleId) e.vehicleId = t("logistics.validation.vehicle");
    if (!f.productId) e.productId = t("logistics.validation.product");
    if (!f.dispatchDate) e.dispatchDate = t("logistics.validation.date");
    // Нето: изисква се и трябва да е > 0. Ако е въведено ръчно и е невалидно → съобщение.
    if (f.net.trim() !== "" && parseQuantity(f.net) == null) e.net = t("logistics.validation.quantityInvalid");
    else if (net == null) e.net = t("logistics.validation.quantity");
    else if (!(net > 0)) e.net = t("logistics.validation.quantityPositive");
    return e;
  }

  async function submit() {
    const e = validate();
    if (Object.keys(e).length) { fail(e, t("logistics.validation.banner")); return; }
    setBanner(""); setBusy(true);
    const body = {
      dispatchNoteNumber: f.dispatchNoteNumber || null,
      dispatchDate: new Date(f.dispatchDate).toISOString(),
      supplierId: f.supplierId || null,
      vehicleId: f.vehicleId, trailerReg: f.trailerReg || null, carrierId: f.carrierId || null, driver: f.driver || null,
      productId: f.productId,
      grossWeight: parseQuantity(f.gross), tara: parseQuantity(f.tara), netQuantity: parseQuantity(f.net) ?? net,
      unit: f.unit,
      contract: f.contract || null, clientNumber: f.clientNumber || null, factory: f.factory || null,
      loadingPlace: f.loadingPlace || null, incoterm: f.incoterm || null, destination: f.destination || null,
      recipient: f.recipient || null, note: f.note || null,
    };
    const r = await fetch("/api/logistics/shipments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      if (j?.error === "VALIDATION_ERROR" && j.fields) fail(j.fields, t("logistics.validation.banner"));
      else setBanner(j.error ?? t("logistics.common.err"));
      return;
    }
    router.push(`/dashboard/logistics/shipments/${j.id}`);
  }

  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 3 } as const;
  const Field = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (<div><label style={lbl}>{label}</label>{children}</div>);

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics/shipments" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.shipments.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.shipNew.heading")}</h1>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>{t("logistics.shipNew.autofillHint")}</p>
      <ValidationBanner message={banner} />

      <div className="glass panel" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        <Field label={t("logistics.shipNew.dispatchNote")}><input style={inp} value={f.dispatchNoteNumber} onChange={(e) => setF({ ...f, dispatchNoteNumber: e.target.value })} placeholder="B0000313802" /></Field>
        <div ref={register("dispatchDate")}>
          <Field label={<>{t("logistics.shipNew.dispatchDate")}<Req /></>}>
            <input type="date" style={{ ...inp, ...errStyle("dispatchDate", errors) }} {...ariaProps("dispatchDate", errors)} value={f.dispatchDate} onChange={(e) => { clearField("dispatchDate"); setF({ ...f, dispatchDate: e.target.value }); }} />
            <FieldError id="err-dispatchDate" message={errors.dispatchDate} />
          </Field>
        </div>
        <Field label={t("logistics.shipNew.supplier")}>
          <SearchableSelect options={suppliers.map((s) => ({ value: s.id, label: s.name }))} value={f.supplierId} onChange={(v) => setF({ ...f, supplierId: v })} emptyLabel="—" />
        </Field>

        <Field label={t("logistics.shipNew.carrierFilter")}>
          <SearchableSelect options={carrierOptions} value={carrierFilter} onChange={(v) => { setCarrierFilter(v); setF((s) => ({ ...s, vehicleId: "" })); setCfg(null); }} emptyLabel={t("logistics.shipNew.allCarriers")} />
        </Field>
        <div ref={register("vehicleId")}>
          <Field label={<>{t("logistics.shipNew.vehicle")}<Req /></>}>
            <div style={errStyle("vehicleId", errors)} {...ariaProps("vehicleId", errors)}>
              <SearchableSelect options={vehicleOptions} value={f.vehicleId} onChange={pickVehicle} placeholder={t("logistics.shipNew.selectVehicle")} allowEmpty={false} />
            </div>
            <FieldError id="err-vehicleId" message={errors.vehicleId} />
            {cfg && (cfg.cargoMode === "bulk" || cfg.cargoMode === "bags") && (
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {cfg.cargoMode === "bulk" ? t("logistics.fleet.bulk") : t("logistics.fleet.bags")}{cfg.maxPayloadTons != null ? ` · ${t("logistics.fleet.maxLoad")} ${fmtQuantity(cfg.maxPayloadTons, locale)} t` : ""}
              </div>
            )}
          </Field>
        </div>
        <Field label={t("logistics.shipNew.trailer")}><input style={inp} value={f.trailerReg} onChange={(e) => setF({ ...f, trailerReg: e.target.value })} /></Field>
        <Field label={t("logistics.shipNew.carrier")}>
          <SearchableSelect options={carriers.map((c) => ({ value: c.id, label: c.name }))} value={f.carrierId} onChange={(v) => setF({ ...f, carrierId: v })} emptyLabel="—" />
        </Field>
        <Field label={t("logistics.shipNew.driver")}><input style={inp} value={f.driver} onChange={(e) => setF({ ...f, driver: e.target.value })} /></Field>

        <div ref={register("productId")}>
          <Field label={<>{t("logistics.shipNew.product")}<Req /></>}>
            <div style={errStyle("productId", errors)} {...ariaProps("productId", errors)}>
              <SearchableSelect options={products.map((p) => ({ value: p.id, label: p.canonicalName, keywords: p.materialCode ?? "" }))} value={f.productId} onChange={pickProduct} placeholder={t("logistics.shipNew.selectProduct")} allowEmpty={false} />
            </div>
            <FieldError id="err-productId" message={errors.productId} />
          </Field>
        </div>
        <Field label={t("logistics.shipNew.materialCode")}><input style={{ ...inp, background: "rgba(0,0,0,.03)" }} value={f.materialCode} readOnly /></Field>
        <Field label={t("logistics.shipNew.unit")}><input style={inp} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>

        <Field label={t("logistics.shipNew.gross")}><QuantityInput value={f.gross} onChange={(v) => setF({ ...f, gross: v })} style={inp} placeholder="39,120" /></Field>
        <Field label={t("logistics.shipNew.tara")}><QuantityInput value={f.tara} onChange={(v) => setF({ ...f, tara: v })} style={inp} placeholder="12,980" /></Field>
        <div ref={register("net")}>
          <Field label={<>{t("logistics.shipNew.net")}<Req /></>}>
            <QuantityInput value={f.net} onChange={(v) => { clearField("net"); setF({ ...f, net: v }); }} error={!!errors.net} describedById="err-net" style={{ ...inp, fontWeight: 700 }} placeholder={net != null ? fmtQuantity(net, locale) : "26,140"} />
            <FieldError id="err-net" message={errors.net} />
            {f.net === "" && net != null && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>= {fmtQuantity(net, locale)} {f.unit}</div>}
            {cfg && cfg.cargoMode !== "bags" && net != null && exceedsPayload(net, cfg.maxPayloadTons) && (
              <div style={{ color: "var(--brick)", fontSize: 11, marginTop: 3 }}>⚠ {t("logistics.validation.payload").replace("{max}", fmtQuantity(cfg.maxPayloadTons ?? 0, locale))}</div>
            )}
          </Field>
        </div>

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
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? t("logistics.shipNew.creating") : t("logistics.shipNew.create")}</button>
      </div>
    </div>
  );
}
