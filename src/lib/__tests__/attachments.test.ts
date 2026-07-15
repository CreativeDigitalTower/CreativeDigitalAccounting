import { describe, it, expect } from "vitest";
import { validatePdfUpload, sanitizePdfFilename, formatFileSize, MAX_ATTACHMENT_BYTES } from "@/lib/attachments";

// Малко валидно PDF base64 (започва с %PDF → "JVBERi0...")
const PDF_DATAURL = "data:application/pdf;base64,JVBERi0xLjQKJŃ"; // започва с JVBER
const REAL_PDF = "data:application/pdf;base64,JVBERi0xLjQ=";

describe("validatePdfUpload", () => {
  it("test 9: accepts a valid PDF", () => {
    expect(validatePdfUpload({ filename: "protocol.pdf", mimeType: "application/pdf", size: 1000, dataUrl: REAL_PDF }).ok).toBe(true);
  });
  it("test 10: rejects a non-PDF mime", () => {
    const r = validatePdfUpload({ filename: "img.png", mimeType: "image/png", size: 1000, dataUrl: "data:image/png;base64,iVBOR" });
    expect(r.ok).toBe(false);
  });
  it("rejects a non-.pdf extension even with pdf mime", () => {
    expect(validatePdfUpload({ filename: "report.exe", mimeType: "application/pdf", size: 10, dataUrl: REAL_PDF }).ok).toBe(false);
  });
  it("rejects mime/extension mismatch (png disguised)", () => {
    const r = validatePdfUpload({ filename: "x.pdf", mimeType: "application/pdf", size: 10, dataUrl: "data:image/png;base64,iVBOR" });
    expect(r.ok).toBe(false);
  });
  it("rejects content that is not a real PDF (bad magic bytes)", () => {
    const r = validatePdfUpload({ filename: "x.pdf", mimeType: "application/pdf", size: 10, dataUrl: "data:application/pdf;base64,SGVsbG8=" });
    expect(r.ok).toBe(false);
  });
  it("test 11: rejects a file that is too large", () => {
    const r = validatePdfUpload({ filename: "big.pdf", mimeType: "application/pdf", size: MAX_ATTACHMENT_BYTES + 1, dataUrl: REAL_PDF });
    expect(r.ok).toBe(false);
  });
  void PDF_DATAURL;
});

describe("sanitizePdfFilename (path traversal / dangerous names)", () => {
  it("strips directories and traversal", () => {
    expect(sanitizePdfFilename("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizePdfFilename("..\\..\\win\\secret.pdf")).toBe("secret.pdf");
  });
  it("removes dangerous characters", () => {
    expect(sanitizePdfFilename('a:b*c?"<>|.pdf')).toBe("abc.pdf");
  });
  it("forces a .pdf extension", () => {
    expect(sanitizePdfFilename("report")).toBe("report.pdf");
    expect(sanitizePdfFilename("report.txt")).toBe("report.pdf");
  });
  it("keeps unicode names and digits", () => {
    expect(sanitizePdfFilename("Протокол-2026.pdf")).toBe("Протокол-2026.pdf");
  });
  it("never returns an empty name", () => {
    expect(sanitizePdfFilename("")).toBe("document.pdf");
  });
});

describe("formatFileSize", () => {
  it("formats bytes/KB/MB", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(8 * 1024 * 1024)).toBe("8.0 MB");
  });
});
