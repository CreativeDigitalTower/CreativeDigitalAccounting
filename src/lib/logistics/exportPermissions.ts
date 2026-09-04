/**
 * Чисто правило дали фирма може да СЪЗДАВА експортни доставки (§1) — без DB импорт, за да е
 * тествано изолирано. Default: разрешено; само изричен `false` (MK получател, напр. SEM) забранява.
 */
export function isExportCreateAllowed(flag: boolean | null | undefined): boolean {
  return flag !== false;
}
