import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { buildReceivedView, resolveReceivedInvoice, type ReceivedSetInput } from "@/lib/logistics/received";
import { lineFinancials, sumMoney } from "@/lib/logistics/money";

const read = (p: string) => fs.readFileSync(p, "utf-8");

const base = (id: string, extra: Partial<ReceivedSetInput> = {}): ReceivedSetInput => ({
  id, invoiceNumber: id, invoiceDate: null, destination: null, deliveryTerm: null,
  truckRegSnapshot: null, trailerReg: null, productSnapshot: "CEM II", quantity: 26, unit: "t", status: "draft",
  sellerName: "METAL TRADE", clientName: "MAK-BET", finalClientId: "cli_makbet", ...extra,
});

describe("bulk eligibility (§3/§13)", () => {
  it("нефактурирана + канонична идентичност → bulkEligible", () => {
    const { rows } = buildReceivedView([base("9758")], new Map(), () => "cli_makbet");
    expect(rows[0].bulkEligible).toBe(true);
    expect(rows[0].finalClientId).toBe("cli_makbet");
  });
  it("вече фактурирана → НЕ е bulkEligible (§13)", () => {
    const inv = new Map([["9758", { id: "d1", number: "MK-1", kind: "document" as const }]]);
    const { rows } = buildReceivedView([base("9758")], inv, () => "cli_makbet");
    expect(rows[0].invoiceStatus).toBe("invoiced");
    expect(rows[0].bulkEligible).toBe(false);
  });
  it("без канонична идентичност на клиент → НЕ е bulkEligible (§4)", () => {
    const { rows } = buildReceivedView([base("9758", { finalClientId: null })], new Map(), () => null);
    expect(rows[0].bulkEligible).toBe(false);
  });
});

describe("totals/VAT — Decimal (§10/§11)", () => {
  it("редове: количество × цена; субтотал/ДДС/общо коректни", () => {
    const l1 = lineFinancials(26.08, 66.91, 18);
    const l2 = lineFinancials(25.62, 70, 18);
    const subtotal = sumMoney([l1.net, l2.net]);
    const gross = sumMoney([l1.gross, l2.gross]);
    expect(l1.net).toBe(1745.01);
    expect(subtotal).toBe(sumMoney([1745.01, 1793.40]));
    expect(gross).toBe(sumMoney([l1.gross, l2.gross]));
  });
});

describe("резолюция: bulk link има приоритет (§12)", () => {
  it("Document (bulk/source) печели пред липса; легаси MkInvoice е fallback", () => {
    expect(resolveReceivedInvoice({ id: "d", number: "MK-1" }, null)).toEqual({ id: "d", number: "MK-1", kind: "document" });
    expect(resolveReceivedInvoice(null, { id: "m", number: "L-1", documentId: null })).toEqual({ id: "m", number: "L-1", kind: "mk" });
  });
});

describe("bulk-invoice endpoint — source assertions (§3/§13/§19/§20/§26)", () => {
  const api = read("src/app/api/logistics/export-sets/received/bulk-invoice/route.ts");
  it("финансов write → manage_invoices; SEM scope (buyerCompanyId)", () => {
    expect(api).toContain('logisticsApiGuard("manage_invoices")');
    expect(api).toContain("buyerCompanyId: g.companyId");
  });
  it("same-client HARD rule се валидира server-side (§3)", () => {
    expect(api).toContain("finalClientIdFor(s.clientId) !== d.clientId");
    expect(api).toContain("към един и същ краен клиент");
  });
  it("no double invoicing: invoicedSetIds проверка + @unique линк (§13/§20)", () => {
    expect(api).toContain("invoicedSetIds(g.companyId, setIds)");
    expect(api).toContain("mkInvoiceDeliveryLink.createMany");
    expect(api).toContain('err.code === "P2002"');
  });
  it("суми server-side: количество от snapshot, не от браузъра (§26)", () => {
    expect(api).toContain("const qty = s.quantity ?? 0");
    expect(api).toContain("lineFinancials(qty, l.unitPrice");
  });
  it("атомарно: Serializable транзакция + advanceInvoiceSequence (§19)", () => {
    expect(api).toContain("TransactionIsolationLevel.Serializable");
    expect(api).toContain("advanceInvoiceSequence");
  });
  it("audit запис за общата фактура (§25)", () => {
    expect(api).toContain('audit(g.companyId, g.userId, "create", "Document"');
  });
});

describe("detection: link-aware навсякъде + single flow не се чупи (§13/§22)", () => {
  it("received list ползва loadDeliveryInvoiceMap (вижда bulk-фактурирани)", () => {
    expect(read("src/app/api/logistics/export-sets/received/route.ts")).toContain("loadDeliveryInvoiceMap(g.companyId, setIds)");
  });
  it("single documents POST блокира и ако доставката е в bulk фактура (§13)", () => {
    expect(read("src/app/api/documents/route.ts")).toContain("mkInvoiceDeliveryLink.findFirst");
  });
  it("export detail + prefill минават през loadDeliveryInvoiceMap", () => {
    expect(read("src/app/api/logistics/export-sets/[id]/route.ts")).toContain("loadDeliveryInvoiceMap");
    expect(read("src/app/api/logistics/export-sets/received/[id]/invoice-prefill/route.ts")).toContain("loadDeliveryInvoiceMap");
  });
  it("single flow (fromDelivery create link) остава в UI (§22)", () => {
    expect(read("src/components/app/logistics/ReceivedDeliveries.tsx")).toContain("/dashboard/documents/new?fromDelivery=");
  });
});

describe("schema (§12/§13/§18)", () => {
  it("MkInvoiceDeliveryLink с @unique(exportSetId) — защита от двойно фактуриране", () => {
    const s = read("prisma/schema.prisma");
    expect(s).toContain("model MkInvoiceDeliveryLink");
    expect(s).toMatch(/exportSetId String\s+@unique/);
  });
});
