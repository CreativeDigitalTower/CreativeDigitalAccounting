import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { deriveExportSetStatus, finalizedActiveCount, derivedStatusFilter, DERIVED_EXPORT_STATUSES } from "@/lib/logistics/exportStatus";
import { ACTIVE_EXPORT_DOC_TYPES } from "@/lib/logistics/config";
import { shouldRegenerate } from "@/lib/logistics/exportDocs";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const d = (docType: string, status = "draft") => ({ docType, status });
// Пълен комплект активни документи с даден статус.
const allActive = (status: string) => ACTIVE_EXPORT_DOC_TYPES.map((t) => d(t, status));

describe("deriveExportSetStatus (§5 derived document status)", () => {
  it("1) доставка без документи → no_docs", () => {
    expect(deriveExportSetStatus([])).toBe("no_docs");
  });
  it("2) всички документи draft → draft", () => {
    expect(deriveExportSetStatus(allActive("draft"))).toBe("draft");
  });
  it("3) draft + finalized → in_progress", () => {
    const docs = [d("invoice", "finalized"), d("dispatch", "draft"), d("declaration", "draft"), d("cmr_hp", "draft")];
    expect(deriveExportSetStatus(docs)).toBe("in_progress");
  });
  it("4) overridden (draft статус) + finalized → in_progress", () => {
    const docs = [d("invoice", "finalized"), d("dispatch", "draft")];
    expect(deriveExportSetStatus(docs)).toBe("in_progress");
  });
  it("5) всички изисквани активни документи finalized → finalized", () => {
    expect(deriveExportSetStatus(allActive("finalized"))).toBe("finalized");
  });
  it("6) изключеният CMR Epson не се брои и не блокира finalized", () => {
    const docs = [...allActive("finalized"), d("cmr_epson", "draft")];
    expect(deriveExportSetStatus(docs)).toBe("finalized");
  });
  it("6b) само изключени/неактивни типове → no_docs (не участват)", () => {
    expect(deriveExportSetStatus([d("cmr_epson", "finalized"), d("blank", "finalized")])).toBe("no_docs");
  });
  it("7) частично генерирани но всички налични finalized → пак in_progress (липсва тип)", () => {
    // Само 3 от 4 изисквани типа, всички finalized → не е пълна финализация.
    const docs = [d("invoice", "finalized"), d("dispatch", "finalized"), d("declaration", "finalized")];
    expect(deriveExportSetStatus(docs)).toBe("in_progress");
  });
  it("10) без двойно броене: дубликат тип не фалшифицира finalized", () => {
    const docs = [d("invoice", "finalized"), d("invoice", "finalized"), d("dispatch", "finalized"), d("declaration", "finalized"), d("cmr_hp", "draft")];
    expect(deriveExportSetStatus(docs)).toBe("in_progress");
    expect(finalizedActiveCount(docs)).toBe(3);
  });
  it("finalizedActiveCount брои уникални изисквани финализирани типове", () => {
    expect(finalizedActiveCount(allActive("finalized"))).toBe(ACTIVE_EXPORT_DOC_TYPES.length);
    expect(finalizedActiveCount([])).toBe(0);
  });
});

describe("derivedStatusFilter (§9 filter → Prisma where)", () => {
  it("8) валиден ключ дава where; празен/непознат → undefined", () => {
    expect(derivedStatusFilter("")).toBeUndefined();
    expect(derivedStatusFilter("bogus")).toBeUndefined();
    for (const k of DERIVED_EXPORT_STATUSES) expect(derivedStatusFilter(k)).toBeTruthy();
  });
  it("no_docs → none по активни типове", () => {
    expect(derivedStatusFilter("no_docs")).toEqual({ documents: { none: { docType: { in: [...ACTIVE_EXPORT_DOC_TYPES] } } } });
  });
  it("finalized → AND от some за всеки изискван активен тип", () => {
    const f = derivedStatusFilter("finalized") as { AND: unknown[] };
    expect(f.AND).toHaveLength(ACTIVE_EXPORT_DOC_TYPES.length);
    expect(f.AND).toContainEqual({ documents: { some: { docType: "invoice", status: "finalized" } } });
  });
  it("in_progress → има finalized, но NOT всички finalized", () => {
    const f = derivedStatusFilter("in_progress") as { AND: Array<Record<string, unknown>> };
    expect(f.AND[0]).toHaveProperty("documents");
    expect(f.AND[1]).toHaveProperty("NOT");
  });
});

describe("§13 generated-document protection остава непокътната", () => {
  it("11/12) finalized документ никога не се регенерира тихо (дори при force)", () => {
    expect(shouldRegenerate({ status: "finalized", overridden: false }, false)).toBe(false);
    expect(shouldRegenerate({ status: "finalized", overridden: false }, true)).toBe(false);
  });
  it("overridden се пази без force, презаписва се само при force", () => {
    expect(shouldRegenerate({ status: "draft", overridden: true }, false)).toBe(false);
    expect(shouldRegenerate({ status: "draft", overridden: true }, true)).toBe(true);
  });
});

describe("§9 source: списъкът ползва derived статус, не статичното set.status", () => {
  const list = read("src/components/app/logistics/ExportSetsList.tsx");
  it("колоната/филтърът минават през deriveExportSetStatus/DERIVED_EXPORT_STATUSES", () => {
    expect(list).toContain("deriveExportSetStatus(r.documents)");
    expect(list).toContain("DERIVED_EXPORT_STATUSES.map");
    // Вече НЕ показва статичното set.status като „Готов/Чернова".
    expect(list).not.toContain('r.status === "finalized" ? t("logistics.export.stReady")');
  });
  it("API филтърът ползва derivedStatusFilter, не суровото set.status", () => {
    const api = read("src/app/api/logistics/export-sets/route.ts");
    expect(api).toContain("derivedStatusFilter(status)");
    expect(api).not.toContain("...(status ? { status } : {})");
  });
});

describe("§B MK фактура: detail резолвва И Document, И легаси MkInvoice", () => {
  const api = read("src/app/api/logistics/export-sets/[id]/route.ts");
  const detail = read("src/components/app/logistics/ExportSetDetail.tsx");
  it("detail GET чете стандартна фактура (Document) освен легаси MkInvoice", () => {
    expect(api).toContain("prisma.document.findFirst");
    expect(api).toContain('type: "invoice"');
    expect(api).toContain("sourceExportSetId: set.id");
    expect(api).toContain("resolveReceivedInvoice(");
  });
  it("detail отваря фактурата през read-only cross-company изглед (без смяна на фирма)", () => {
    expect(detail).toContain("/dashboard/logistics/mk-invoice/${s.mkInvoice.id}");
  });
  it("без фактура → линк към create flow с fromDelivery (не dead UI)", () => {
    expect(detail).toContain("/dashboard/documents/new?fromDelivery=${s.id}");
  });
  it("§11 overall статус НЕ зависи от MK фактурата (derive е само по документите)", () => {
    // deriveExportSetStatus приема само docs; MK invoice не е вход.
    expect(deriveExportSetStatus([{ docType: "invoice", status: "finalized" }, { docType: "dispatch", status: "finalized" }, { docType: "declaration", status: "finalized" }, { docType: "cmr_hp", status: "finalized" }])).toBe("finalized");
  });
});
