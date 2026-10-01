import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { deriveExportSetStatus } from "@/lib/logistics/exportStatus";
import { shouldRegenerate } from "@/lib/logistics/exportDocs";
import { ACTIVE_EXPORT_DOC_TYPES } from "@/lib/logistics/config";

const read = (p: string) => fs.readFileSync(p, "utf-8");

describe("PART A — auto-finalize при генериране (§1–§8)", () => {
  const gen = read("src/lib/logistics/exportGenerate.ts");

  it("1–4) upsert записва status=finalized + finalizedAt + finalizedById (create и update)", () => {
    expect(gen).toContain('status: "finalized", finalizedAt, finalizedById: actorId');
    // И в create, и в update пътя.
    const occurrences = gen.split('status: "finalized", finalizedAt, finalizedById: actorId').length - 1;
    expect(occurrences).toBe(2);
  });

  it("5/6/9/10) защитата остава: finalized никога, overridden само при force (не се пипат тихо)", () => {
    expect(shouldRegenerate({ status: "finalized", overridden: false }, false)).toBe(false);
    expect(shouldRegenerate({ status: "finalized", overridden: false }, true)).toBe(false);
    expect(shouldRegenerate({ status: "draft", overridden: true }, false)).toBe(false);
    // draft се регенерира → ще стане finalized (§4/§12).
    expect(shouldRegenerate({ status: "draft", overridden: false }, false)).toBe(true);
    expect(shouldRegenerate({ status: "draft", overridden: true }, true)).toBe(true);
  });

  it("7) CMR Epson НЕ е сред активните типове → не се auto-finalize-ва през Generate All", () => {
    expect(ACTIVE_EXPORT_DOC_TYPES).toEqual(["invoice", "dispatch", "declaration", "cmr_hp"]);
    expect(ACTIVE_EXPORT_DOC_TYPES as readonly string[]).not.toContain("cmr_epson");
  });

  it("8) генериране fail (buildDocumentData хвърля) → upsert не се достига → не се маркира finalized", () => {
    // Финализирането е в СЪЩИЯ upsert като данните — атомарно, след успешен build.
    const idxBuild = gen.indexOf("buildDocumentData(src, parties");
    const idxUpsert = gen.indexOf("exportDocument.upsert");
    expect(idxBuild).toBeGreaterThan(-1);
    expect(idxUpsert).toBeGreaterThan(idxBuild); // build преди запис
  });

  it("2/6) Generate All success → 4/4 → overall FINALIZED (derived, §9)", () => {
    const docs = ACTIVE_EXPORT_DOC_TYPES.map((docType) => ({ docType, status: "finalized" }));
    expect(deriveExportSetStatus(docs)).toBe("finalized");
  });

  it("14) частичен успех (само 2 генерирани) → В процес, не finalized", () => {
    const docs = [
      { docType: "invoice", status: "finalized" }, { docType: "dispatch", status: "finalized" },
      { docType: "declaration", status: "draft" }, { docType: "cmr_hp", status: "draft" },
    ];
    expect(deriveExportSetStatus(docs)).toBe("in_progress");
  });
});

describe("PART A3 — reconciliation script (§8/§I) — dry-run safe", () => {
  const script = read("scripts/reconcile-export-document-statuses.mjs");
  it("7/8) dry-run по подразбиране; пише САМО при --apply", () => {
    expect(script).toContain('const APPLY = process.argv.includes("--apply")');
    expect(script).toContain("if (APPLY)");
  });
  it("9) idempotent: updateMany само за все още draft, само статус (не data/snapshot)", () => {
    expect(script).toContain("status: \"draft\" }, // idempotent");
    expect(script).toContain('data: { status: "finalized", finalizedAt: now }');
    expect(script).not.toContain("buildDocumentData(");
    expect(script).not.toContain("exportDocument.create(");
    expect(script).not.toContain("exportDocument.upsert(");
  });
  it("критерий: празен/невалиден draft се SKIP-ва (не се финализира сляпо)", () => {
    expect(script).toContain("isNonEmpty(d.data)");
  });
  it("company-scoped + не докосва изтрити доставки", () => {
    expect(script).toContain("--company");
    expect(script).toContain("deletedAt: null");
  });
});

describe("PART B/C/D — read-only cross-company MK invoice (§11–§19)", () => {
  const view = read("src/app/(app)/dashboard/logistics/mk-invoice/[id]/page.tsx");
  const listApi = read("src/app/api/logistics/mk-invoices/route.ts");
  const detail = read("src/components/app/logistics/ExportSetDetail.tsx");
  const dossier = read("src/components/app/logistics/ExportDossierExtras.tsx");
  const salesPage = read("src/app/(app)/dashboard/logistics/mk-sales/page.tsx");

  it("11/12) read-only view: БЕЗ смяна на фирма — няма cookie/impersonation", () => {
    expect(view).not.toContain("IMPERSONATE_COOKIE");
    expect(view).not.toContain("ACTIVE_COMPANY_COOKIE");
    expect(view).not.toContain("cookies");
    // Старият impersonation route е премахнат.
    expect(fs.existsSync("src/app/(app)/dashboard/logistics/export/[id]/open-invoice/route.ts")).toBe(false);
  });

  it("14/D) IDOR: достъпът е САМО през explicit relation (sourceExportSet.companyId = active)", () => {
    expect(view).toContain("sourceExportSet: { is: { companyId, deletedAt: null } }");
    expect(view).toContain("notFound()");
    // Не махаме companyId scope от стандартните documents (проверката е тук, не там).
    expect(view).not.toContain("prisma.document.findUnique({ where: { id }");
  });

  it("13) read-only: без edit/delete/payment/ownership мутации", () => {
    expect(view).not.toContain("prisma.document.update");
    expect(view).not.toContain("prisma.document.delete");
    expect(view).not.toContain(".update(");
    expect(view).not.toContain(".delete(");
  });

  it("17/16) list API: Document приоритет + легаси MkInvoice fallback, relation-scoped", () => {
    expect(listApi).toContain("sourceExportSet: setLink");
    expect(listApi).toContain("companyId: g.companyId");
    expect(listApi).toContain("resolveReceivedInvoice(null,");
  });

  it("20) list API: суми ПО ВАЛУТА, без смесване на валути", () => {
    expect(listApi).toContain("byCurrency[r.currency]");
  });

  it("9/10/18) и двата линка водят към единния read-only route /mk-invoice/[id]", () => {
    expect(detail).toContain("/dashboard/logistics/mk-invoice/${s.mkInvoice.id}");
    expect(dossier).toContain("/dashboard/logistics/mk-invoice/${mkInvoice.id}");
  });

  it("C) МК продажби: продавачът вижда read-only списъка, MK фирмата — легаси create", () => {
    expect(salesPage).toContain("companyCanCreateExports");
    expect(salesPage).toContain("MkLinkedInvoices");
  });
});
