import { describe, it, expect } from "vitest";
import {
  normalizeDocType, normalizeReminderDays, daysUntil, validityStatus,
  isReminderDue, validateAssetUpload, canAssetDoc, assetDocCaps, ASSET_DOC_TYPES,
} from "@/lib/assetDocuments";

const iso = (daysFromNow: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
};

describe("normalizeDocType", () => {
  it("приема познати типове", () => {
    for (const t of ASSET_DOC_TYPES) expect(normalizeDocType(t)).toBe(t);
  });
  it("непознат/липсващ → other", () => {
    expect(normalizeDocType("banana")).toBe("other");
    expect(normalizeDocType(null)).toBe("other");
    expect(normalizeDocType(undefined)).toBe("other");
  });
});

describe("normalizeReminderDays", () => {
  it("допуска само валидните опции", () => {
    expect(normalizeReminderDays(30)).toBe(30);
    expect(normalizeReminderDays(45)).toBe(null);
    expect(normalizeReminderDays(null)).toBe(null);
  });
});

describe("daysUntil / validityStatus", () => {
  it("няма крайна дата → none / null", () => {
    expect(daysUntil(null)).toBe(null);
    expect(validityStatus(null)).toBe("none");
  });
  it("бъдеща далечна дата → active", () => {
    expect(validityStatus(iso(120))).toBe("active");
  });
  it("до 30 дни → expiring", () => {
    expect(validityStatus(iso(10))).toBe("expiring");
  });
  it("минала дата → expired", () => {
    expect(validityStatus(iso(-3))).toBe("expired");
    expect(daysUntil(iso(-3))).toBe(-3);
  });
});

describe("isReminderDue", () => {
  it("без reminderDays → false", () => {
    expect(isReminderDue({ validTo: iso(5), reminderDays: null, reminderSentAt: null })).toBe(false);
  });
  it("в прозореца и неизпратено → true", () => {
    expect(isReminderDue({ validTo: iso(20), reminderDays: 30, reminderSentAt: null })).toBe(true);
  });
  it("извън прозореца (твърде рано) → false", () => {
    expect(isReminderDue({ validTo: iso(60), reminderDays: 30, reminderSentAt: null })).toBe(false);
  });
  it("вече изтекъл (дни < 0) → false", () => {
    expect(isReminderDue({ validTo: iso(-1), reminderDays: 30, reminderSentAt: null })).toBe(false);
  });
  it("скоро изпратено → false (без дублиране)", () => {
    expect(isReminderDue({ validTo: iso(10), reminderDays: 30, reminderSentAt: new Date().toISOString() })).toBe(false);
  });
  it("изтрит документ → false", () => {
    expect(isReminderDue({ validTo: iso(10), reminderDays: 30, reminderSentAt: null, deletedAt: iso(-1) })).toBe(false);
  });
});

describe("validateAssetUpload (безопасност)", () => {
  it("PDF е разрешен", () => {
    expect(validateAssetUpload({ mimeType: "application/pdf", size: 1000 }).ok).toBe(true);
  });
  it("PNG/JPEG са разрешени", () => {
    expect(validateAssetUpload({ mimeType: "image/png", size: 1000 }).ok).toBe(true);
    expect(validateAssetUpload({ mimeType: "image/jpeg", size: 1000 }).ok).toBe(true);
  });
  it("DOC е разрешен", () => {
    expect(validateAssetUpload({ mimeType: "application/msword", size: 1000 }).ok).toBe(true);
  });
  it("DOCX е блокиран от общия филтър заради xml в MIME (реално ограничение)", () => {
    // Споделеният fileSecurity третира всеки MIME с „xml" като опасен (SVG/XHTML).
    // Office .docx MIME съдържа „openXMLformats" → отхвърля се навсякъде в платформата.
    expect(validateAssetUpload({ mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1000 }).ok).toBe(false);
  });
  it("изпълними/HTML/SVG са забранени", () => {
    expect(validateAssetUpload({ mimeType: "text/html", size: 10 }).ok).toBe(false);
    expect(validateAssetUpload({ mimeType: "image/svg+xml", size: 10 }).ok).toBe(false);
    expect(validateAssetUpload({ mimeType: "application/x-msdownload", size: 10 }).ok).toBe(false);
  });
  it("твърде голям файл → грешка", () => {
    expect(validateAssetUpload({ mimeType: "application/pdf", size: 50 * 1024 * 1024 }).ok).toBe(false);
  });
});

describe("права по роля", () => {
  it("собственик има всичко", () => {
    const c = assetDocCaps("owner");
    expect(c).toEqual({ canView: true, canUpload: true, canEdit: true, canDelete: true });
  });
  it("viewer само преглед", () => {
    expect(assetDocCaps("viewer")).toEqual({ canView: true, canUpload: false, canEdit: false, canDelete: false });
  });
  it("warehouse качва но не трие", () => {
    expect(canAssetDoc("warehouse", "upload")).toBe(true);
    expect(canAssetDoc("warehouse", "delete")).toBe(false);
  });
  it("employee/непозната роля няма достъп", () => {
    expect(canAssetDoc("employee", "view")).toBe(false);
    expect(canAssetDoc(null, "view")).toBe(false);
  });
});
