import { describe, it, expect } from "vitest";
import { validatePdfBinary, hasPdfMagic, bytesToPdfDataUrl, sanitizePdfFilename, MAX_ATTACHMENT_BYTES, formatFileSize } from "@/lib/attachments";
import { readPdfMultipart } from "@/lib/attachmentUpload";

// Изгражда байтове, започващи с %PDF, с даден общ размер.
function pdfBytes(size: number): Uint8Array {
  const b = new Uint8Array(Math.max(5, size));
  b[0] = 0x25; b[1] = 0x50; b[2] = 0x44; b[3] = 0x46; b[4] = 0x2d; // %PDF-
  return b;
}

describe("validatePdfBinary — размери", () => {
  it("REGRESSION: 900 888 байта валиден PDF се приема", () => {
    const r = validatePdfBinary({ filename: "Protokol_14.pdf", mimeType: "application/pdf", bytes: pdfBytes(900888) });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.size).toBe(900888);
  });
  it("под 1 MB, 2 MB, 5 MB, 7.9 MB — приемат се", () => {
    for (const s of [900 * 1024, 2 * 1024 * 1024, 5 * 1024 * 1024, Math.floor(7.9 * 1024 * 1024)]) {
      expect(validatePdfBinary({ filename: "a.pdf", mimeType: "application/pdf", bytes: pdfBytes(s) }).ok).toBe(true);
    }
  });
  it("точно на лимита (8 MB) — приема се", () => {
    expect(validatePdfBinary({ filename: "a.pdf", mimeType: "application/pdf", bytes: pdfBytes(MAX_ATTACHMENT_BYTES) }).ok).toBe(true);
  });
  it("над лимита — отхвърля се с точен размер", () => {
    const r = validatePdfBinary({ filename: "a.pdf", mimeType: "application/pdf", bytes: pdfBytes(MAX_ATTACHMENT_BYTES + 1) });
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.code).toBe("too_large"); expect(r.error).toContain(formatFileSize(MAX_ATTACHMENT_BYTES)); }
  });
  it("празен файл — отхвърля се", () => {
    const r = validatePdfBinary({ filename: "a.pdf", mimeType: "application/pdf", bytes: new Uint8Array(0) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("empty");
  });
});

describe("validatePdfBinary — тип/съдържание", () => {
  it("невалиден MIME (image) — отхвърля се", () => {
    const r = validatePdfBinary({ filename: "a.pdf", mimeType: "image/png", bytes: pdfBytes(1000) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("not_pdf_mime");
  });
  it("Windows особеност: празен/octet-stream MIME + валиден PDF → приема се", () => {
    expect(validatePdfBinary({ filename: "Протокол.pdf", mimeType: "", bytes: pdfBytes(1000) }).ok).toBe(true);
    expect(validatePdfBinary({ filename: "Протокол.pdf", mimeType: "application/octet-stream", bytes: pdfBytes(1000) }).ok).toBe(true);
  });
  it("повреден/не-PDF (липсват magic bytes) — отхвърля се", () => {
    const bad = new Uint8Array(1000); bad[0] = 0x00;
    const r = validatePdfBinary({ filename: "a.pdf", mimeType: "application/pdf", bytes: bad });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("not_pdf_magic");
  });
  it("грешно разширение — отхвърля се", () => {
    const r = validatePdfBinary({ filename: "a.txt", mimeType: "application/pdf", bytes: pdfBytes(1000) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("not_pdf_ext");
  });
  it("hasPdfMagic разпознава %PDF", () => {
    expect(hasPdfMagic(pdfBytes(10))).toBe(true);
    expect(hasPdfMagic(new Uint8Array([1, 2, 3, 4, 5]))).toBe(false);
  });
});

describe("bytesToPdfDataUrl", () => {
  it("изгражда коректен PDF data URL", () => {
    const url = bytesToPdfDataUrl(pdfBytes(10));
    expect(url.startsWith("data:application/pdf;base64,")).toBe(true);
    expect(url.split(",")[1].startsWith("JVBER")).toBe(true); // %PDF → JVBER
  });
});

describe("sanitizePdfFilename — имена на файлове", () => {
  it("кирилица/интервали/тирета се запазват безопасно", () => {
    expect(sanitizePdfFilename("Протокол 14.pdf")).toBe("Протокол 14.pdf");
    expect(sanitizePdfFilename("Protokol_14.pdf")).toBe("Protokol_14.pdf");
  });
  it("path traversal се премахва", () => {
    expect(sanitizePdfFilename("../../etc/passwd.pdf")).not.toContain("/");
    expect(sanitizePdfFilename("../../etc/passwd.pdf")).toMatch(/\.pdf$/);
  });
  it("гарантира .pdf разширение", () => {
    expect(sanitizePdfFilename("doc")).toMatch(/\.pdf$/);
  });
});

describe("readPdfMultipart — multipart разчитане (binary, без base64)", () => {
  async function makeReq(bytes: Uint8Array, name = "Protokol_14.pdf", type = "application/pdf") {
    const fd = new FormData();
    fd.append("file", new File([bytes as unknown as BlobPart], name, { type }));
    fd.append("filename", name);
    fd.append("pages", "3");
    return new Request("http://x/api", { method: "POST", body: fd });
  }
  it("приема валиден PDF от multipart и връща сурови байтове + размер", async () => {
    const r = await readPdfMultipart(await makeReq(pdfBytes(900888)));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.size).toBe(900888); expect(r.pages).toBe(3); expect(r.filename).toBe("Protokol_14.pdf"); }
  });
  it("липсващ файл → 400 no_file", async () => {
    const req = new Request("http://x/api", { method: "POST", body: new FormData() });
    const r = await readPdfMultipart(req);
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.status).toBe(400); expect(r.code).toBe("no_file"); }
  });
  it("над лимита → статус 413", async () => {
    const r = await readPdfMultipart(await makeReq(pdfBytes(MAX_ATTACHMENT_BYTES + 1)));
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.status).toBe(413); expect(r.code).toBe("too_large"); }
  });
});
