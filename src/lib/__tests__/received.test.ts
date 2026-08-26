import { describe, it, expect } from "vitest";
import { receivedInvoiceStatus, buildReceivedView, mkInvoiceMissingFields, type ReceivedSetInput } from "@/lib/logistics/received";
import { normalizeCompanyName } from "@/lib/logistics/normalize";

const set = (o: Partial<ReceivedSetInput> = {}): ReceivedSetInput => ({
  id: o.id ?? "s1", invoiceNumber: o.invoiceNumber ?? "0000009617", invoiceDate: o.invoiceDate ?? "2026-08-22T00:00:00.000Z",
  destination: o.destination ?? "TETOVO", deliveryTerm: o.deliveryTerm ?? "FCA", truckRegSnapshot: o.truckRegSnapshot ?? "SK501TO",
  trailerReg: o.trailerReg ?? "SK5022AE", productSnapshot: o.productSnapshot ?? "CEM II A-LL 42.5 R",
  quantity: o.quantity ?? 26.04, unit: o.unit ?? "t", status: o.status ?? "finalized",
  sellerName: o.sellerName ?? "METAL TRADE KUSTENDIL 2005", clientName: o.clientName ?? "JJU BAU DOOEL",
});

describe("received — invoice status derived from relation (19/20)", () => {
  it("no MK invoice -> uninvoiced", () => { expect(receivedInvoiceStatus(null)).toBe("uninvoiced"); });
  it("has MK invoice -> invoiced", () => { expect(receivedInvoiceStatus({ id: "i1", number: "MK-1" })).toBe("invoiced"); });
});

describe("received — buildReceivedView KPIs + rows", () => {
  const none = () => null;
  it("counts received/uninvoiced/invoiced and total quantity (3 decimals)", () => {
    const { kpi } = buildReceivedView(
      [set({ id: "a", quantity: 26.04 }), set({ id: "b", quantity: 23.8 }), set({ id: "c", quantity: 30 })],
      new Map([["b", { id: "i", number: "MK-000123" }]]),
      none,
    );
    expect(kpi.received).toBe(3);
    expect(kpi.invoiced).toBe(1);
    expect(kpi.uninvoiced).toBe(2);
    expect(kpi.totalQuantity).toBe(79.84);
  });
  it("row carries mkInvoice + invoiceStatus", () => {
    const { rows } = buildReceivedView([set({ id: "a" })], new Map([["a", { id: "i", number: "MK-1" }]]), none);
    expect(rows[0].invoiceStatus).toBe("invoiced");
    expect(rows[0].mkInvoice).toEqual({ id: "i", number: "MK-1" });
  });
  it("uninvoiced row has null mkInvoice", () => {
    const { rows } = buildReceivedView([set({ id: "a" })], new Map(), none);
    expect(rows[0].mkInvoice).toBeNull();
    expect(rows[0].invoiceStatus).toBe("uninvoiced");
  });
  it("final-client suggestion matches normalized client name (13)", () => {
    const mkClients = new Map([[normalizeCompanyName("JJU BAU DOOEL"), "cli-42"]]);
    const { rows } = buildReceivedView([set({ clientName: "jju bau  dooel" })], new Map(),
      (s) => (s.clientName ? mkClients.get(normalizeCompanyName(s.clientName)) ?? null : null));
    expect(rows[0].suggestedClientId).toBe("cli-42");
  });
  it("no BG client -> no suggestion", () => {
    const { rows } = buildReceivedView([set({ clientName: null })], new Map(), () => null);
    expect(rows[0].suggestedClientId).toBeNull();
  });
});

describe("received — prerequisites before invoicing (27)", () => {
  it("flags missing client/quantity/product", () => {
    expect(mkInvoiceMissingFields({ clientId: null, quantity: 0, product: "" }).sort()).toEqual(["client", "product", "quantity"]);
  });
  it("passes when all present", () => {
    expect(mkInvoiceMissingFields({ clientId: "c", quantity: 26.04, product: "CEM" })).toEqual([]);
  });
  it("zero or negative quantity is missing", () => {
    expect(mkInvoiceMissingFields({ clientId: "c", quantity: -1, product: "CEM" })).toContain("quantity");
  });
});
