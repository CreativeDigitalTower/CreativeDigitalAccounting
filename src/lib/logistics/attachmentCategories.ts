/**
 * Категории и валидация за допълнителните документи в досието на експортна доставка
 * (§8/§10/§11/§43). Чиста логика — тествана и споделена от API-то и UI-то.
 */

// Разширяем enum от категории (§8). „other" носи потребителски label в `name`.
export const ATTACHMENT_CATEGORIES = [
  "customs", "dispatch_note", "quality_spec", "quality_cert",
  "origin_cert", "weight_note", "transport_doc", "extra_invoice", "other",
] as const;
export type AttachmentCategory = (typeof ATTACHMENT_CATEGORIES)[number];

export function isAttachmentCategory(v: string | null | undefined): v is AttachmentCategory {
  return (ATTACHMENT_CATEGORIES as readonly string[]).includes(v ?? "");
}

// Разрешени формати (§10): PDF, изображения, Office. MIME + разширение се проверяват заедно.
export const ALLOWED_ATTACHMENT_TYPES: { ext: string; mime: string[] }[] = [
  { ext: "pdf", mime: ["application/pdf"] },
  { ext: "jpg", mime: ["image/jpeg"] },
  { ext: "jpeg", mime: ["image/jpeg"] },
  { ext: "png", mime: ["image/png"] },
  { ext: "xls", mime: ["application/vnd.ms-excel"] },
  { ext: "xlsx", mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] },
  { ext: "doc", mime: ["application/msword"] },
  { ext: "docx", mime: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
];

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20 MB (§11)
export const MAX_ATTACHMENTS_PER_SET = 40;

/** Безопасно име за показване/сваляне — без път, без опасни символи (§43). */
export function sanitizeAttachmentFilename(name: string): string {
  const base = (name || "file").split(/[\\/]/).pop() || "file"; // маха всякакъв path
  return base.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 200).trim() || "file";
}

export function extensionOf(filename: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(filename || "");
  return m ? m[1].toLowerCase() : "";
}

export type UploadCheck = { ok: true; ext: string; mime: string } | { ok: false; error: string };

/** Валидира тип/разширение/размер преди запис (§10/§11/§43). Executable-и се отхвърлят. */
export function validateAttachmentUpload(input: { filename: string; mimeType: string; size: number }): UploadCheck {
  const ext = extensionOf(input.filename);
  const entry = ALLOWED_ATTACHMENT_TYPES.find((t) => t.ext === ext);
  if (!entry) return { ok: false, error: "Неразрешен формат на файла." };
  // MIME трябва да пасва на разширението (не се доверяваме само на едното).
  if (!entry.mime.includes(input.mimeType)) return { ok: false, error: "Типът на файла не съответства на разширението." };
  if (input.size <= 0) return { ok: false, error: "Празен файл." };
  if (input.size > MAX_ATTACHMENT_BYTES) return { ok: false, error: "Файлът е твърде голям (макс. 20 MB)." };
  return { ok: true, ext, mime: input.mimeType };
}
