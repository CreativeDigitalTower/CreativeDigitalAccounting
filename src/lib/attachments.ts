/**
 * Валидиране и метаданни за прикачени PDF файлове към фактури/документи.
 * Чисти функции — покрити с unit тестове.
 */

// Максимален размер на един прикачен файл (base64 в БД → пазим го разумен).
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB

// Практичен лимит за общ размер на приложенията в един имейл (SMTP съобразен).
// Повечето SMTP услуги ограничават цялото съобщение ~25 MB; base64 качва размера
// с ~33%, затова пазим сумарния суров размер под ~18 MB.
export const MAX_EMAIL_ATTACHMENTS_BYTES = 18 * 1024 * 1024;

const PDF_MIME = new Set(["application/pdf", "application/x-pdf", "application/acrobat"]);

/** Почиства име на файл: маха път/traversal и опасни символи; гарантира .pdf. */
export function sanitizePdfFilename(name: string): string {
  // Взима само базовото име (без директории / traversal)
  let base = (name || "document").split(/[\\/]/).pop() || "document";
  // eslint-disable-next-line no-control-regex
  base = base.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").replace(/\.\.+/g, ".").trim();
  if (!base) base = "document";
  if (!/\.pdf$/i.test(base)) base = base.replace(/\.[^.]*$/, "") + ".pdf";
  // Ограничаваме дължината
  if (base.length > 180) base = base.slice(0, 176) + ".pdf";
  return base;
}

export type PdfUploadInput = {
  filename?: string | null;
  mimeType?: string | null;
  size?: number | null;
  dataUrl?: string | null;
};

/** Валидира качен PDF: MIME + разширение + размер + съответствие на data URL. */
export function validatePdfUpload(input: PdfUploadInput): { ok: true } | { ok: false; error: string } {
  const declaredMime = (input.mimeType ?? "").toLowerCase().split(";")[0].trim();
  const nameOk = /\.pdf$/i.test(input.filename ?? "");
  const dataUrlMime = input.dataUrl?.startsWith("data:")
    ? input.dataUrl.slice(5).split(/[;,]/)[0].toLowerCase().trim()
    : "";

  // MIME (от полето ИЛИ от data URL) трябва да е PDF
  const effectiveMime = declaredMime || dataUrlMime;
  if (!effectiveMime || !PDF_MIME.has(effectiveMime)) {
    return { ok: false, error: "Разрешени са само PDF файлове." };
  }
  // Разширението също трябва да е .pdf
  if (!nameOk) {
    return { ok: false, error: "Файлът трябва да е с разширение .pdf." };
  }
  // Ако data URL съдържа mime, той също трябва да е PDF (без подмяна)
  if (dataUrlMime && !PDF_MIME.has(dataUrlMime)) {
    return { ok: false, error: "Съдържанието на файла не е PDF." };
  }
  // Магически байтове: data URL base64 на PDF започва с "JVBER" (=> "%PDF")
  if (input.dataUrl?.startsWith("data:")) {
    const comma = input.dataUrl.indexOf(",");
    const b64 = comma >= 0 ? input.dataUrl.slice(comma + 1) : "";
    if (b64 && !b64.startsWith("JVBER")) {
      return { ok: false, error: "Файлът не изглежда като валиден PDF." };
    }
  }
  if (typeof input.size === "number" && input.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: "Файлът е твърде голям (макс. 8 MB)." };
  }
  return { ok: true };
}

// ── Валидация на СУРОВИ (binary) байтове — за multipart upload (без base64) ──

/** PDF магически байтове: %PDF (0x25 0x50 0x44 0x46) в началото на файла. */
export function hasPdfMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export type UploadErrorCode = "no_file" | "empty" | "too_large" | "not_pdf_mime" | "not_pdf_ext" | "not_pdf_magic";

/**
 * Валидира качен PDF по СУРОВИТЕ байтове. Разчита на magic bytes като меродавен
 * критерий → приема валиден PDF дори когато Windows/браузър подаде празен или
 * различен MIME (application/octet-stream). Отхвърля само явно не-PDF MIME.
 */
export function validatePdfBinary(input: { filename?: string | null; mimeType?: string | null; bytes: Uint8Array }):
  { ok: true; size: number } | { ok: false; code: UploadErrorCode; error: string } {
  const size = input.bytes.byteLength;
  if (size <= 0) return { ok: false, code: "empty", error: "Файлът е празен." };
  if (size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, code: "too_large", error: `Файлът е ${formatFileSize(size)}, а максимално разрешеният размер е ${formatFileSize(MAX_ATTACHMENT_BYTES)}.` };
  }
  if (!/\.pdf$/i.test(input.filename ?? "")) {
    return { ok: false, code: "not_pdf_ext", error: "Файлът трябва да е с разширение .pdf." };
  }
  const mime = (input.mimeType ?? "").toLowerCase().split(";")[0].trim();
  // Празен / octet-stream MIME е допустим (cross-browser) → решава magic bytes.
  if (mime && mime !== "application/octet-stream" && !PDF_MIME.has(mime)) {
    return { ok: false, code: "not_pdf_mime", error: "Избраният файл не е валиден PDF документ." };
  }
  if (!hasPdfMagic(input.bytes)) {
    return { ok: false, code: "not_pdf_magic", error: "Избраният файл не е валиден PDF документ." };
  }
  return { ok: true, size };
}

/** Изгражда PDF data URL (за съхранение в БД) от сурови байтове. */
export function bytesToPdfDataUrl(bytes: Uint8Array): string {
  return "data:application/pdf;base64," + Buffer.from(bytes).toString("base64");
}

/** Човешки четлив размер (напр. „1.2 MB"). */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
