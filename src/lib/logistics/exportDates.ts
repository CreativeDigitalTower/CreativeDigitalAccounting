/**
 * Централни форматери за датите в експортните документи (§17). Двете правила са РАЗЛИЧНИ
 * (§19) и не бива да се смесват:
 *   - Invoice date / Испратница „Денес"  → DD.MM.YYYY  (точка, водещи нули)  (§14/§30)
 *   - Declaration date в Invoice          → YYYY.MM.DD  (§18/§20)
 * Никакво ad-hoc string manipulation по компонентите.
 */

function parts(input: string | Date | null | undefined): { y: number; m: number; d: number } | null {
  if (!input) return null;
  const dt = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(dt.getTime())) return null;
  // Локални компоненти на календарния ден (виж exportDates за timezone бележката).
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** DD.MM.YYYY — Invoice date, Испратница „Денес" (§14/§30). */
export function formatInvoiceDate(input: string | Date | null | undefined): string {
  const p = parts(input);
  return p ? `${pad(p.d)}.${pad(p.m)}.${p.y}` : "";
}

/** YYYY.MM.DD — Declaration date в Invoice (§18/§20). */
export function formatDeclarationDate(input: string | Date | null | undefined): string {
  const p = parts(input);
  return p ? `${p.y}.${pad(p.m)}.${pad(p.d)}` : "";
}
