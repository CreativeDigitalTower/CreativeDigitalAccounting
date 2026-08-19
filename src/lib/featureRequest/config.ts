/**
 * „Заяви индивидуален безплатен модул" — чиста доменна логика (без DB, тестируемо).
 * Заявяването е безплатно; одобрените индивидуални разработки се реализират без
 * допълнително заплащане (без обещание за автоматично изпълнение).
 */

/** Видове заявки (§4). */
export const REQUEST_TYPES = [
  "module", "feature", "document", "report", "automation", "integration", "improvement", "other",
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

/** Статуси на заявката (§8). */
export const REQUEST_STATUSES = [
  "new", "reviewing", "need_info", "approved", "planned", "in_development", "delivered", "declined", "archived",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Приоритети. */
export const REQUEST_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

/** Обхват на заявката (§23): за собствената фирма или за клиентска фирма. */
export const REQUEST_SCOPES = ["company", "firm"] as const;

/** Готови отговори за админ комуникация (§11). */
export const QUICK_REPLIES = ["need_info", "approved", "in_development", "delivered"] as const;

/** Разрешени файлови типове за прикачване (§4, §19). */
export const ALLOWED_ATTACHMENT_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg", "image/png",
];
export const MAX_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_TITLE_LEN = 160;
export const MAX_DESC_LEN = 5000;

/** Anti-spam: макс. заявки за фирма в прозорец. */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 час
export const RATE_LIMIT_MAX = 5;
/** Дедупликация: еднаква заявка (по заглавие) в кратък прозорец. */
export const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 мин

/** Валидира прикачен файл (тип + размер). Връща null при валиден. */
export function validateAttachment(mime: string, size: number): string | null {
  if (!ALLOWED_ATTACHMENT_MIME.includes(mime)) return "type";
  if (size > MAX_ATTACHMENT_BYTES) return "size";
  return null;
}

/** Секторно-специфичен подсказващ пример (§16). null → без специфика. */
export function sectorHintKey(sector: string | null | undefined): string {
  switch ((sector || "").toLowerCase()) {
    case "production":
    case "manufacturing": return "production";
    case "restaurant":
    case "food": return "restaurant";
    case "services":
    case "service": return "services";
    case "trade":
    case "retail": return "trade";
    default: return "generic";
  }
}

/** Известява ли се клиентът при този статус (§20). */
export function notifiesClient(status: RequestStatus): boolean {
  return status === "delivered";
}
