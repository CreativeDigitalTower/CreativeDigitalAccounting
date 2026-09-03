"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { SearchableSelect } from "@/components/app/logistics/SearchableSelect";
import { exceedsPayload, bagsCalc, BAGS_DEFAULTS } from "@/lib/logistics/fleet";
import { parseQuantity, fmtQuantity } from "@/lib/i18n/format";
import { QuantityInput } from "@/components/app/logistics/QuantityInput";
import { DateField } from "@/components/app/logistics/DateField";
import { todayISODate, toISODateLocal } from "@/lib/date/week";
import { useFieldErrors, Req, FieldError, ValidationBanner, ariaProps, errStyle, type FieldErrors } from "@/components/app/logistics/formValidation";
import { PLACE_OF_SHIPMENT_DEFAULT } from "@/lib/logistics/deliveryTerms";
import { isNewVehicleRegistration } from "@/lib/logistics/vehicleQuickCreate";
import { VehicleQuickCreateModal } from "@/components/app/logistics/VehicleQuickCreateModal";

// Дефиниран на модулно ниво, за да НЕ се пресъздава при всеки render — иначе полетата
// вътре remount-ват и губят focus / дата не може да се въвежда с клавиатура. (bug #1/#2)
const LBL: React.CSSProperties = { fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 3 };
function F({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (<div><label style={LBL}>{label}</label>{children}</div>);
}

type Vehicle = { id: string; registration: string; trailerReg: string | null };
type Product = { id: string; canonicalName: string; category?: string | null };
type Route = { id: string; label: string };
type Company = { id: string; name: string };
type Client = { id: string; name: string };
// Начални стойности при РЕДАКЦИЯ (§11/§12) — всички business полета на доставката.
export type ExportSetInitial = {
  id: string; invoiceNumber: string; invoiceDate: string | null; shipmentDate: string | null;
  deliveryTerm: string | null; placeOfShipment: string | null; destination: string | null;
  truckVehicleId: string | null; trailerReg: string | null; logisticsProductId: string | null;
  quantity: number | null; declarationCmrDate: string | null; dispatchNumber: string | null;
  buyerCompanyId: string | null; clientId: string | null;
  mkInvoice?: { id: string; number: string } | null;
};

// Локална (timezone-safe) дата за date input-ите — пази записания календарен ден (§32).
const ymd = (x: string | null | undefined) => (x ? toISODateLocal(new Date(x)) : "");

export function ExportSetForm({ vehicles, products, routes, buyers, clients, destinations = [], initial, initialClientName, mkInvoice }: {
  vehicles: Vehicle[]; products: Product[]; routes: Route[]; buyers: Company[]; clients: Client[]; destinations?: string[];
  initial?: ExportSetInitial; initialClientName?: string | null; mkInvoice?: { id: string; number: string } | null;
}) {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const isEdit = !!initial;
  const [busy, setBusy] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const { errors, banner, register, clearField, fail, setBanner } = useFieldErrors();
  const [f, setF] = useState(initial ? {
    invoiceNumber: initial.invoiceNumber ?? "", invoiceDate: ymd(initial.invoiceDate), shipmentDate: ymd(initial.shipmentDate),
    deliveryTerm: initial.deliveryTerm ?? "", placeOfShipment: initial.placeOfShipment ?? PLACE_OF_SHIPMENT_DEFAULT, destination: initial.destination ?? "", routeId: "",
    truckVehicleId: initial.truckVehicleId ?? "", trailerReg: initial.trailerReg ?? "", logisticsProductId: initial.logisticsProductId ?? "",
    quantity: initial.quantity != null ? fmtQuantity(initial.quantity, locale) : "", declarationCmrDate: ymd(initial.declarationCmrDate),
    dispatchNumber: initial.dispatchNumber ?? "", buyerCompanyId: initial.buyerCompanyId ?? "", clientId: initial.clientId ?? "",
  } : {
    // Create: датите default-ват към ДНЕШНАТА локална дата (§1/§32), но остават editable.
    invoiceNumber: "", invoiceDate: todayISODate(), shipmentDate: todayISODate(), deliveryTerm: "", placeOfShipment: PLACE_OF_SHIPMENT_DEFAULT, destination: "", routeId: "",
    truckVehicleId: "", trailerReg: "", logisticsProductId: "", quantity: "", declarationCmrDate: todayISODate(),
    dispatchNumber: "", buyerCompanyId: buyers[0]?.id ?? "", clientId: "",
  });
  // Автофил от конфигурацията на превозвача (§27): последен шофьор, макс. товар, вид товар.
  // Шофьорът НЕ се заключва — потребителят може да го смени. Товарът се валидира (§28).
  const [cfg, setCfg] = useState<{ maxPayloadTons: number | null; cargoMode: string; driver: string | null } | null>(null);
  // Camion / Ремарке: локален списък (за да се вижда новосъздаден автомобил веднага, §7/§18).
  const [vehicleList, setVehicleList] = useState<Vehicle[]>(vehicles);
  const [vehModal, setVehModal] = useState<string | null>(null); // въведената нова регистрация
  // Краен клиент — списъкът идва от СВЪРЗАНАТА buyer фирма (SEM), не от активната (§1/§2).
  // Инициализира се от подадените (server-side заредени за default buyer) и се презарежда
  // при смяна на buyer.
  const [clientList, setClientList] = useState<Client[]>(clients);
  const [clientBusy, setClientBusy] = useState(false);
  const buyerLoaded = useRef(initial?.buyerCompanyId ?? buyers[0]?.id ?? "");

  // Презареждане на клиентите при смяна на buyer фирмата (cross-company, group-scoped, §2/§3).
  useEffect(() => {
    const bid = f.buyerCompanyId;
    if (!bid || bid === buyerLoaded.current) return;
    buyerLoaded.current = bid;
    fetch(`/api/logistics/buyer-clients?companyId=${encodeURIComponent(bid)}`).then((r) => (r.ok ? r.json() : []))
      .then((list: Client[]) => { if (Array.isArray(list)) { setClientList(list); if (!list.some((c) => c.id === f.clientId)) setF((s) => ({ ...s, clientId: "" })); } })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.buyerCompanyId]);

  // Автоматично предложение на Invoice номер при СЪЗДАВАНЕ (§15) — editable (§16).
  useEffect(() => {
    if (isEdit) return;
    fetch("/api/logistics/export-sets/next-number").then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.number) setF((s) => ({ ...s, invoiceNumber: s.invoiceNumber || j.number })); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Избор/създаване на краен клиент (§4/§6/§7). Съществуващ → clientId; ново име → създава
  // клиент в CRM на BUYER фирмата (SEM), НЕ на активната (§6), group-scoped; без да
  // преименува master запис (§7).
  async function pickClient(v: string) {
    if (!v) { setF((s) => ({ ...s, clientId: "" })); return; }
    if (clientList.some((c) => c.id === v)) { setF((s) => ({ ...s, clientId: v })); return; }
    if (!f.buyerCompanyId) return; // няма buyer → няма къде да се създаде клиент
    setClientBusy(true);
    try {
      const r = await fetch("/api/logistics/buyer-clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: f.buyerCompanyId, name: v.trim() }) });
      if (r.ok) { const c = await r.json(); setClientList((l) => [...l.filter((x) => x.id !== c.id), { id: c.id, name: c.name }]); setF((s) => ({ ...s, clientId: c.id })); }
    } finally { setClientBusy(false); }
  }

  // Избор от полето „Камион / Ремарке": ако е id на съществуващ автомобил → autofill;
  // ако е ВЪВЕДЕНА нова регистрация (creatable) → отваряме quick-create modal (§2/§6).
  function onTruckChange(value: string) {
    if (isNewVehicleRegistration(value, vehicleList.map((v) => v.id))) { setVehModal(value.trim()); return; }
    void selectExistingVehicle(value);
  }

  // Избор на съществуващ автомобил + autofill от VehicleConfiguration (§1/§26/§27).
  async function selectExistingVehicle(id: string) {
    const v = vehicleList.find((x) => x.id === id);
    clearField("truckVehicleId");
    setF((s) => ({ ...s, truckVehicleId: id, trailerReg: v?.trailerReg ?? s.trailerReg }));
    setCfg(null);
    if (!v) return;
    try {
      const r = await fetch(`/api/logistics/vehicle-configs?truck=${encodeURIComponent(v.registration)}&active=1`);
      const j = await r.json().catch(() => []);
      const row = Array.isArray(j) ? j[0] : null;
      if (!row) return; // нов автомобил без конфигурация → полетата остават празни (§27)
      setCfg({ maxPayloadTons: row.maxPayloadTons ?? null, cargoMode: row.cargoMode ?? "", driver: row.driver ?? null });
      setF((s) => ({
        ...s,
        trailerReg: s.trailerReg || row.trailer || "",
        // BAGS: подразбиращо се количество 23,800 t (17 палета × 56 торби × 25 kg), ако е празно.
        quantity: s.quantity || (row.cargoMode === "bags" ? fmtQuantity(bagsCalc(BAGS_DEFAULTS.pallets).totalTons, locale) : s.quantity),
      }));
    } catch { /* автофилът е best-effort — не блокира формата */ }
  }

  // Резултат от quick-create/dedup → добавя автомобила в списъка и го избира (§7/§23).
  function adoptVehicle(v: { id: string; registration: string; trailerReg?: string | null }) {
    setVehicleList((l) => (l.some((x) => x.id === v.id) ? l : [...l, { id: v.id, registration: v.registration, trailerReg: v.trailerReg ?? null }]));
    clearField("truckVehicleId");
    setF((s) => ({ ...s, truckVehicleId: v.id, trailerReg: s.trailerReg || v.trailerReg || "" }));
  }
  function pickRoute(id: string) {
    const r = routes.find((x) => x.id === id);
    setF((s) => ({ ...s, routeId: id, destination: r ? r.label : s.destination }));
  }
  // Условия на доставка (§4): FCA/CPT е само Incoterm — НЕ задава дестинация/Враца.
  // placeOfShipment и destination остават независими.
  function setDeliveryTerm(term: string) {
    clearField("deliveryTerm");
    setF((s) => ({ ...s, deliveryTerm: term }));
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!f.truckVehicleId) e.truckVehicleId = t("logistics.validation.vehicle");
    if (!f.deliveryTerm) e.deliveryTerm = t("logistics.validation.deliveryTerm");
    if (!f.destination.trim()) e.destination = t("logistics.validation.destination"); // §5/§20 — и за FCA, и за CPT
    if (!f.placeOfShipment.trim()) e.placeOfShipment = t("logistics.validation.placeOfShipment");
    if (!f.invoiceDate) e.invoiceDate = t("logistics.validation.date");
    if (!f.shipmentDate) e.shipmentDate = t("logistics.validation.date");
    if (!f.logisticsProductId) e.logisticsProductId = t("logistics.validation.product");
    const q = parseQuantity(f.quantity);
    if (f.quantity.trim() === "") e.quantity = t("logistics.validation.quantity");
    else if (q == null) e.quantity = t("logistics.validation.quantityInvalid");
    else if (!(q > 0)) e.quantity = t("logistics.validation.quantityPositive");
    return e;
  }

  async function submit() {
    const e = validate();
    if (Object.keys(e).length) { fail(e, t("logistics.validation.banner")); return; }
    setBanner(""); setOkMsg(""); setBusy(true);
    const body = {
      invoiceNumber: f.invoiceNumber || null, invoiceDate: f.invoiceDate ? new Date(f.invoiceDate).toISOString() : null,
      shipmentDate: f.shipmentDate ? new Date(f.shipmentDate).toISOString() : null,
      deliveryTerm: f.deliveryTerm || null, placeOfShipment: f.placeOfShipment || null,
      destination: f.destination || null, routeId: f.routeId || null,
      truckVehicleId: f.truckVehicleId, trailerReg: f.trailerReg || null,
      logisticsProductId: f.logisticsProductId, quantity: parseQuantity(f.quantity),
      declarationCmrDate: f.declarationCmrDate ? new Date(f.declarationCmrDate).toISOString() : null,
      dispatchNumber: f.dispatchNumber || null, buyerCompanyId: f.buyerCompanyId || null, clientId: f.clientId || null,
    };
    const r = await fetch(isEdit ? `/api/logistics/export-sets/${initial!.id}` : "/api/logistics/export-sets", {
      method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      // Структуриран validation отговор от сървъра → маркирай полетата.
      if (j?.error === "VALIDATION_ERROR" && j.fields) fail(j.fields, t("logistics.validation.banner"));
      else setBanner(j.error ?? t("logistics.common.err"));
      return;
    }
    if (isEdit) { setOkMsg(t("logistics.export.savedChanges")); router.refresh(); setTimeout(() => router.push(`/dashboard/logistics/export/${initial!.id}`), 700); }
    else router.push(`/dashboard/logistics/export/${j.id}`);
  }

  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const qErr = parseQuantity(f.quantity);

  // Продуктови опции, групирани по вид (§9): Насипен → Пакетиран → без категория.
  const catOrder = (c: string | null | undefined) => (c === "bulk" ? 0 : c === "packaged" ? 1 : 2);
  const catGroup = (c: string | null | undefined) => c === "bulk" ? t("logistics.products.categoryBulk") : c === "packaged" ? t("logistics.products.categoryPackaged") : t("logistics.products.categoryNone");
  const productOptions = [...products]
    .sort((a, b) => catOrder(a.category) - catOrder(b.category) || a.canonicalName.localeCompare(b.canonicalName))
    .map((p) => ({ value: p.id, label: p.canonicalName, group: catGroup(p.category) }));

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <Link href={isEdit ? `/dashboard/logistics/export/${initial!.id}` : "/dashboard/logistics/export"} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {isEdit ? initial!.invoiceNumber : t("logistics.export.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{isEdit ? t("logistics.export.editHeading") : t("logistics.export.heading")}</h1>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>{isEdit ? t("logistics.export.editIntro") : t("logistics.export.intro")}</p>
      {mkInvoice && (
        <div style={{ background: "var(--brass-soft)", border: "1px solid var(--brass)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, marginBottom: 12 }}>
          {t("logistics.export.mkInvoiceWarn").replace("{number}", mkInvoice.number)}{" "}
          <Link href={`/dashboard/logistics/mk-sales/${mkInvoice.id}`} style={{ fontWeight: 600 }}>{t("logistics.export.openMkInvoice")} →</Link>
        </div>
      )}
      {okMsg && <div style={{ background: "rgba(15,138,106,.12)", border: "1px solid var(--emerald,#0f8a6a)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{okMsg}</div>}
      <ValidationBanner message={banner} />

      <div className="glass panel" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        <F label={`${t("logistics.export.invoiceNumber")} ${t("logistics.export.invoiceAuto")}`}><input style={inp} value={f.invoiceNumber} onChange={(e) => setF({ ...f, invoiceNumber: e.target.value })} placeholder="0000009617" /></F>
        <F label={t("logistics.export.issueDate")}><DateField value={f.invoiceDate} onChange={(v) => setF({ ...f, invoiceDate: v })} style={inp} /></F>
        <F label={t("logistics.export.shipmentDate")}><DateField value={f.shipmentDate} onChange={(v) => setF({ ...f, shipmentDate: v })} style={inp} /></F>
        {/* Условия на доставка (§1) — задължително. Incoterm; НЕ определя дестинацията (§4). */}
        <div ref={register("deliveryTerm")}>
          <F label={<>{t("logistics.export.deliveryTerm")}<Req /></>}>
            <div {...ariaProps("deliveryTerm", errors)}>
              <SearchableSelect options={[{ value: "FCA", label: "FCA" }, { value: "CPT", label: "CPT" }]} value={f.deliveryTerm} onChange={setDeliveryTerm} allowEmpty={false} placeholder={t("logistics.export.selectPlaceholder")} />
            </div>
            <FieldError id="err-deliveryTerm" message={errors.deliveryTerm} />
          </F>
        </div>
        {/* Място на натоварване — default BELI IZVOR, отделно от дестинацията (§2/§7) */}
        <div ref={register("placeOfShipment")}>
          <F label={<>{t("logistics.export.placeOfShipment")}<Req /></>}>
            <input style={{ ...inp, ...errStyle("placeOfShipment", errors) }} value={f.placeOfShipment} onChange={(e) => { clearField("placeOfShipment"); setF({ ...f, placeOfShipment: e.target.value }); }} placeholder="BELI IZVOR" />
            <FieldError id="err-placeOfShipment" message={errors.placeOfShipment} />
          </F>
        </div>
        {/* Дестинация — ЕДНО creatable combobox поле (§1): избор/търсене/нова стойност.
            Една canonical стойност; важи еднакво за FCA и CPT (§9). */}
        <div ref={register("destination")}>
          <F label={<>{t("logistics.export.destination")}<Req /></>}>
            <div {...ariaProps("destination", errors)}>
              <SearchableSelect
                options={destinations.map((d) => ({ value: d, label: d }))}
                value={f.destination}
                onChange={(v) => { clearField("destination"); setF({ ...f, destination: v }); }}
                allowCreate allowEmpty={false}
                placeholder={t("logistics.export.selectPlaceholder")}
                createLabel={(q) => `${t("logistics.export.addDestination")} „${q}"`}
              />
            </div>
            <FieldError id="err-destination" message={errors.destination} />
          </F>
        </div>
        <div ref={register("truckVehicleId")}>
          <F label={<>{t("logistics.export.truck")}<Req /></>}>
            <div style={errStyle("truckVehicleId", errors)} {...ariaProps("truckVehicleId", errors)}>
              <SearchableSelect options={vehicleList.map((v) => ({ value: v.id, label: `${v.registration}${v.trailerReg ? ` / ${v.trailerReg}` : ""}` }))} value={f.truckVehicleId} onChange={onTruckChange} allowCreate allowEmpty={false} placeholder="SK501TO / SK5022AE" createLabel={(q) => `${t("logistics.vehicleCreate.addNew")} „${q}"`} />
            </div>
            <FieldError id="err-truckVehicleId" message={errors.truckVehicleId} />
          </F>
        </div>
        <F label={t("logistics.export.trailer")}><input style={inp} value={f.trailerReg} onChange={(e) => setF({ ...f, trailerReg: e.target.value })} /></F>
        <div ref={register("logisticsProductId")}>
          <F label={<>{t("logistics.export.product")}<Req /></>}>
            <div style={errStyle("logisticsProductId", errors)} {...ariaProps("logisticsProductId", errors)}>
              <SearchableSelect options={productOptions} value={f.logisticsProductId} onChange={(v) => { clearField("logisticsProductId"); setF({ ...f, logisticsProductId: v }); }} allowEmpty={false} />
            </div>
            <FieldError id="err-logisticsProductId" message={errors.logisticsProductId} />
          </F>
        </div>
        <div ref={register("quantity")}>
          <F label={<>{t("logistics.export.quantity")}<Req /></>}>
            <QuantityInput value={f.quantity} onChange={(v) => { clearField("quantity"); setF({ ...f, quantity: v }); }} error={!!errors.quantity} describedById="err-quantity" style={inp} placeholder="26,040" />
            <FieldError id="err-quantity" message={errors.quantity} />
            {cfg && cfg.cargoMode !== "bags" && qErr != null && exceedsPayload(qErr, cfg.maxPayloadTons) && (
              <div style={{ color: "var(--brick)", fontSize: 11.5, marginTop: 4 }}>
                ⚠ {t("logistics.validation.payload").replace("{max}", fmtQuantity(cfg.maxPayloadTons ?? 0, locale))}
              </div>
            )}
          </F>
        </div>
        <F label={t("logistics.export.cmrDate")}><DateField value={f.declarationCmrDate} onChange={(v) => setF({ ...f, declarationCmrDate: v })} style={inp} /></F>
        <F label={`${t("logistics.export.dispatch")} ${t("logistics.export.dispatchAuto")}`}><input style={inp} value={f.dispatchNumber} onChange={(e) => setF({ ...f, dispatchNumber: e.target.value })} placeholder="9617" /></F>
        <F label={t("logistics.export.buyer")}>
          <SearchableSelect options={buyers.map((b) => ({ value: b.id, label: b.name }))} value={f.buyerCompanyId} onChange={(v) => setF({ ...f, buyerCompanyId: v })} emptyLabel="—" />
        </F>
        <F label={t("logistics.export.client")}>
          <SearchableSelect
            options={(() => {
              const opts = clientList.map((c) => ({ value: c.id, label: c.name }));
              // Пази избрания (вкл. legacy) клиент видим, дори да не е в текущия SEM списък (§5).
              if (f.clientId && !opts.some((o) => o.value === f.clientId)) opts.unshift({ value: f.clientId, label: initialClientName || f.clientId });
              return opts;
            })()}
            value={f.clientId} onChange={pickClient} allowCreate emptyLabel={clientBusy ? "…" : "—"} createLabel={(q) => `${t("logistics.export.addClient")} „${q}"`} />
        </F>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "…" : isEdit ? t("logistics.export.saveChanges") : t("logistics.export.create")}</button>
        {isEdit && <Link href={`/dashboard/logistics/export/${initial!.id}`} className="btn btn-ghost">{t("logistics.common.cancel")}</Link>}
      </div>

      {vehModal !== null && (
        <VehicleQuickCreateModal
          registration={vehModal}
          onClose={() => setVehModal(null)}
          onDone={(v) => { adoptVehicle(v); setVehModal(null); }}
        />
      )}
    </div>
  );
}
