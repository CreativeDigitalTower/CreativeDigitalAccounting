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

describe("PART B — cross-company open-invoice route (§11–§19/§22)", () => {
  const route = read("src/app/(app)/dashboard/logistics/export/[id]/open-invoice/route.ts");
  const detail = read("src/components/app/logistics/ExportSetDetail.tsx");
  const dossier = read("src/components/app/logistics/ExportDossierExtras.tsx");

  it("1/8/18) резолвва Document (приоритет) и легаси MkInvoice през resolveReceivedInvoice", () => {
    expect(route).toContain("prisma.document.findFirst");
    expect(route).toContain("prisma.mkInvoice.findFirst");
    expect(route).toContain("resolveReceivedInvoice(docInv, legacyMk)");
  });

  it("2/8) redirect target според вида: mk → /mk-sales, document → /documents", () => {
    expect(route).toContain("/dashboard/logistics/mk-sales/${resolved.id}");
    expect(route).toContain("/dashboard/documents/${resolved.id}");
  });

  it("3/4) Super Admin → IMPERSONATE cookie към owner (същия механизъм като admin/impersonate)", () => {
    expect(route).toContain("isSuperAdmin(userId)");
    expect(route).toContain("res.cookies.set(IMPERSONATE_COOKIE, owner");
  });

  it("5) член на owner фирмата → ACTIVE_COMPANY cookie (след проверка за членство)", () => {
    expect(route).toContain("prisma.companyUser.findUnique");
    expect(route).toContain("res.cookies.set(ACTIVE_COMPANY_COOKIE, owner");
  });

  it("6/7) unauthorized → authorized error (back denied), БЕЗ tenant bypass / без leak", () => {
    expect(route).toContain('if (!admin && !member) return back("denied")');
    // Достъпът до доставката минава през exportSetReadRole (group visibility), не global findUnique без scope.
    expect(route).toContain("exportSetReadRole(companyId, set)");
    // Owner-scoped заявки (companyId: owner), не глобални.
    expect(route).toContain("companyId: owner");
  });

  it("12) не сменя ownership / не създава дубликат — само чете и redirect-ва", () => {
    expect(route).not.toContain("prisma.document.update");
    expect(route).not.toContain("prisma.document.create");
    expect(route).not.toContain("prisma.mkInvoice.update");
    expect(route).not.toContain("prisma.mkInvoice.create");
  });

  it("9/10) и двата линка (Отвори фактура + Свързани записи) сочат към canonical route", () => {
    expect(detail).toContain("/dashboard/logistics/export/${s.id}/open-invoice");
    expect(dossier).toContain("/dashboard/logistics/export/${id}/open-invoice");
    // Вече НЕ линкват директно към company-scoped document детайла.
    expect(detail).not.toContain("mkInvoiceHref");
  });
});
