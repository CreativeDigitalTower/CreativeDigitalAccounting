// Server-only: чете multipart/form-data upload на PDF приложение (BINARY, без
// base64 по мрежата) и го валидира. Връща сурови байтове + метаданни или грешка
// с код и HTTP статус. Съхранението в БД остава base64 dataUrl (конвертира се тук).
import { validatePdfBinary, type UploadErrorCode } from "@/lib/attachments";

export type ReadUploadResult =
  | { ok: true; bytes: Uint8Array; size: number; filename: string; mimeType: string; pages: number | null }
  | { ok: false; status: number; code: UploadErrorCode | "no_file" | "bad_request"; error: string };

/** Чете и валидира PDF от multipart заявка. НЕ използва base64 по мрежата. */
export async function readPdfMultipart(req: Request): Promise<ReadUploadResult> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { ok: false, status: 400, code: "bad_request", error: "Неуспешно разчитане на заявката." };
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return { ok: false, status: 400, code: "no_file", error: "Липсва файл в заявката." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const filename = String(form.get("filename") ?? file.name ?? "document.pdf");
  const mimeType = file.type || String(form.get("mimeType") ?? "");
  const pagesRaw = Number(form.get("pages"));
  const pages = Number.isFinite(pagesRaw) && pagesRaw > 0 ? Math.min(100000, Math.floor(pagesRaw)) : null;

  const v = validatePdfBinary({ filename, mimeType, bytes });
  if (!v.ok) {
    // too_large → 413 (семантично коректно); останалите → 400.
    return { ok: false, status: v.code === "too_large" ? 413 : 400, code: v.code, error: v.error };
  }
  return { ok: true, bytes, size: v.size, filename, mimeType, pages };
}
