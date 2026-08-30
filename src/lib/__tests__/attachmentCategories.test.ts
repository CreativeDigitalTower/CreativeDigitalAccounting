import { describe, it, expect } from "vitest";
import { validateAttachmentUpload, sanitizeAttachmentFilename, isAttachmentCategory, extensionOf, ATTACHMENT_CATEGORIES, MAX_ATTACHMENT_BYTES } from "@/lib/logistics/attachmentCategories";

describe("attachment categories (8)", () => {
  it("has the required categories incl. extensible 'other'", () => {
    for (const c of ["customs", "dispatch_note", "quality_spec", "quality_cert", "origin_cert", "weight_note", "transport_doc", "extra_invoice", "other"]) {
      expect(ATTACHMENT_CATEGORIES).toContain(c);
    }
    expect(isAttachmentCategory("customs")).toBe(true);
    expect(isAttachmentCategory("hacker")).toBe(false);
  });
});

describe("upload validation (10/11/43)", () => {
  it("accepts allowed business formats with matching MIME", () => {
    expect(validateAttachmentUpload({ filename: "doc.pdf", mimeType: "application/pdf", size: 1000 }).ok).toBe(true);
    expect(validateAttachmentUpload({ filename: "img.jpg", mimeType: "image/jpeg", size: 1000 }).ok).toBe(true);
    expect(validateAttachmentUpload({ filename: "s.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 1000 }).ok).toBe(true);
    expect(validateAttachmentUpload({ filename: "d.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1000 }).ok).toBe(true);
  });
  it("rejects executables and unknown extensions", () => {
    expect(validateAttachmentUpload({ filename: "virus.exe", mimeType: "application/octet-stream", size: 10 }).ok).toBe(false);
    expect(validateAttachmentUpload({ filename: "script.sh", mimeType: "text/x-sh", size: 10 }).ok).toBe(false);
  });
  it("rejects MIME/extension mismatch (spoofing)", () => {
    expect(validateAttachmentUpload({ filename: "x.pdf", mimeType: "application/x-msdownload", size: 10 }).ok).toBe(false);
  });
  it("rejects empty and oversize files", () => {
    expect(validateAttachmentUpload({ filename: "x.pdf", mimeType: "application/pdf", size: 0 }).ok).toBe(false);
    expect(validateAttachmentUpload({ filename: "x.pdf", mimeType: "application/pdf", size: MAX_ATTACHMENT_BYTES + 1 }).ok).toBe(false);
  });
});

describe("filename sanitization (43)", () => {
  it("strips path traversal and dangerous chars", () => {
    expect(sanitizeAttachmentFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeAttachmentFilename("C:\\Windows\\evil.pdf")).toBe("evil.pdf");
    expect(sanitizeAttachmentFilename("bad;<>name.pdf")).toBe("bad___name.pdf");
  });
  it("keeps unicode (Macedonian/Cyrillic) letters", () => {
    expect(sanitizeAttachmentFilename("Испратница 9705.pdf")).toBe("Испратница 9705.pdf");
  });
  it("extensionOf lowercases", () => {
    expect(extensionOf("File.PDF")).toBe("pdf");
    expect(extensionOf("noext")).toBe("");
  });
});
