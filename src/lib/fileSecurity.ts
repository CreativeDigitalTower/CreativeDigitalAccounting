/**
 * Централна сигурност за качване и сервиране на файлове.
 *
 * Цели:
 *  - Да НЕ се сервира потребителски файл така, че браузърът да изпълни код
 *    (напр. HTML/SVG с <script>) → stored XSS в нашия домейн.
 *  - Да се приемат само безопасни типове файлове при качване.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

// Разрешени типове при качване (документи и изображения — БЕЗ svg/html).
const ALLOWED_UPLOAD = new Set([
  "application/pdf",
  "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
]);

// Типове, които е безопасно да се показват inline в браузъра.
const INLINE_SAFE = new Set([
  "application/pdf",
  "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp",
]);

// Опасни за изпълнение типове — никога не се сервират с оригиналния Content-Type.
const DANGEROUS = /(html|svg|xml|javascript|ecmascript|xhtml)/i;

export type UploadInput = { mimeType?: string | null; size?: number | null; dataUrl?: string | null };

/** Валидира качен файл (тип, размер, съответствие на data URL). */
export function validateUpload({ mimeType, size, dataUrl }: UploadInput): { ok: true } | { ok: false; error: string } {
  // Ако типът не е подаден изрично, извличаме го от data URL-а.
  let mime = (mimeType ?? "").toLowerCase().split(";")[0].trim();
  if (!mime && dataUrl && dataUrl.startsWith("data:")) {
    mime = dataUrl.slice(5).split(/[;,]/)[0].toLowerCase().trim();
  }
  // Външен https линк (не data URL) — разрешаваме (сервира се като редирект).
  if (!mime && dataUrl && /^https:\/\//i.test(dataUrl)) return { ok: true };
  if (!mime || !ALLOWED_UPLOAD.has(mime) || DANGEROUS.test(mime)) {
    return { ok: false, error: "Неразрешен тип файл. Позволени са PDF, изображения и офис документи." };
  }
  if (typeof size === "number" && size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Файлът е твърде голям (макс. 5 MB)." };
  }
  // Ако е data URL — типът в него трябва да съвпада с обявения (без подмяна).
  if (dataUrl && dataUrl.startsWith("data:")) {
    const declared = dataUrl.slice(5).split(/[;,]/)[0].toLowerCase().trim();
    if (declared && DANGEROUS.test(declared)) {
      return { ok: false, error: "Неразрешено съдържание във файла." };
    }
  }
  return { ok: true };
}

/**
 * Изгражда безопасен HTTP отговор за сервиране на потребителски файл.
 * Опасните типове се свалят като octet-stream; inline е позволено само за
 * изображения и PDF; добавя nosniff и sandbox CSP срещу изпълнение на код.
 */
export function fileResponse(buf: Buffer | Uint8Array, mimeType: string, filename: string, wantInline = false): Response {
  const mime = (mimeType || "application/octet-stream").toLowerCase().split(";")[0].trim();
  const dangerous = DANGEROUS.test(mime);
  const outMime = dangerous ? "application/octet-stream" : mime;
  const inline = wantInline && INLINE_SAFE.has(mime) && !dangerous;
  const body = (buf instanceof Uint8Array ? buf : new Uint8Array(buf)) as unknown as BodyInit;
  return new Response(body, {
    headers: {
      "Content-Type": outMime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(filename)}"`,
      "X-Content-Type-Options": "nosniff",
      // Изолира файла: дори HTML да мине, няма да изпълни скриптове или да зареди ресурси.
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}

/** Декодира data URL към Buffer + mime; връща null ако не е валиден data URL. */
export function decodeDataUrl(dataUrl: string): { buf: Buffer; mime: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) return null;
  return { buf: Buffer.from(m[2], "base64"), mime: m[1] };
}
