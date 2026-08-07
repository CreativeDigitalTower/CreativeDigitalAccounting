/**
 * Чисти помощни функции за документи към актив (тип, статус на валидност,
 * права по роля, напомняния). Без странични ефекти — покрити с unit тестове.
 */
import { validateUpload, type UploadInput } from "@/lib/fileSecurity";

// Видове документи (незадължителни). Ключовете съвпадат с преводните ключове
// assets.docs.types.<id>. „other" е по подразбиране, ако не е избран тип.
export const ASSET_DOC_TYPES = [
  "invoice", // Фактура за покупка
  "receipt", // Касова бележка
  "warranty", // Гаранционна карта
  "insurance", // Застрахователна полица
  "contract", // Договор
  "handover", // Приемо-предавателен протокол
  "certificate", // Сертификат
  "service", // Сервизен документ
  "technical", // Техническа документация
  "photo", // Снимка
  "other", // Друг документ
] as const;
export type AssetDocType = (typeof ASSET_DOC_TYPES)[number];

/** Нормализира типа: непознат/липсващ → „other" (Некатегоризиран). */
export function normalizeDocType(v: string | null | undefined): AssetDocType {
  return (ASSET_DOC_TYPES as readonly string[]).includes(v ?? "") ? (v as AssetDocType) : "other";
}

// Допустими дни за напомняне преди изтичане.
export const REMINDER_DAY_OPTIONS = [7, 14, 30, 60, 90] as const;
export function normalizeReminderDays(v: number | null | undefined): number | null {
  if (v == null) return null;
  return (REMINDER_DAY_OPTIONS as readonly number[]).includes(v) ? v : null;
}

export type ValidityStatus = "none" | "active" | "expiring" | "expired";

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Дни до крайната дата (цели дни, спрямо начало на деня). null → без крайна дата. */
export function daysUntil(validTo: Date | string | null | undefined, now: Date = new Date()): number | null {
  if (!validTo) return null;
  const to = startOfDay(new Date(validTo));
  const today = startOfDay(now);
  return Math.round((to.getTime() - today.getTime()) / DAY);
}

/**
 * Статус на валидност спрямо крайна дата. „expiring" = изтича до `soonDays` дни
 * (по подразбиране 30). Използва се и за гаранция, и за застраховка.
 */
export function validityStatus(
  validTo: Date | string | null | undefined,
  now: Date = new Date(),
  soonDays = 30
): ValidityStatus {
  const d = daysUntil(validTo, now);
  if (d == null) return "none";
  if (d < 0) return "expired";
  if (d <= soonDays) return "expiring";
  return "active";
}

/** Дали документ трябва да получи напомняне ДНЕС (има крайна дата + избрано напомняне). */
export function isReminderDue(doc: {
  validTo: Date | string | null | undefined;
  reminderDays: number | null | undefined;
  reminderSentAt: Date | string | null | undefined;
  deletedAt?: Date | string | null;
}, now: Date = new Date()): boolean {
  if (doc.deletedAt) return false;
  const days = normalizeReminderDays(doc.reminderDays ?? null);
  if (days == null) return false;
  const d = daysUntil(doc.validTo, now);
  if (d == null) return false;
  // В прозореца [0 .. reminderDays] дни до изтичане и още неизпратено напомняне.
  if (d < 0 || d > days) return false;
  if (doc.reminderSentAt) {
    // Вече е пращано в рамките на последните 20 часа → не дублирай.
    const sent = new Date(doc.reminderSentAt);
    if (now.getTime() - sent.getTime() < 20 * 60 * 60 * 1000) return false;
  }
  return true;
}

// Разрешени типове файлове за прикачване към актив — следва общия механизъм
// (fileSecurity.validateUpload): PDF, изображения, офис документи. НЕ изпълними/HTML/SVG.
export function validateAssetUpload(input: UploadInput): { ok: true } | { ok: false; error: string } {
  return validateUpload(input);
}

// ── Права по роля (следва модела на permissions.ts за Кошчето) ──
export type AssetDocPermission = "view" | "upload" | "edit" | "delete";

const ROLE_ASSET_DOC_PERMS: Record<string, AssetDocPermission[]> = {
  owner: ["view", "upload", "edit", "delete"],
  manager: ["view", "upload", "edit", "delete"],
  accountant: ["view", "upload", "edit", "delete"],
  sales: ["view", "upload", "edit"],
  warehouse: ["view", "upload"],
  viewer: ["view"],
  employee: [],
};

/** Дали роля има конкретно право за документите към актив. Собственик → всичко. */
export function canAssetDoc(role: string | null | undefined, perm: AssetDocPermission): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  return (ROLE_ASSET_DOC_PERMS[role] ?? []).includes(perm);
}

export type AssetDocCaps = { canView: boolean; canUpload: boolean; canEdit: boolean; canDelete: boolean };
export function assetDocCaps(role: string | null | undefined): AssetDocCaps {
  return {
    canView: canAssetDoc(role, "view"),
    canUpload: canAssetDoc(role, "upload"),
    canEdit: canAssetDoc(role, "edit"),
    canDelete: canAssetDoc(role, "delete"),
  };
}
