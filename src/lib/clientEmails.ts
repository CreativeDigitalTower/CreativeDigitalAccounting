/**
 * Помощни функции за структурираните имейл адреси на клиента.
 * Чисти (pure) функции — покрити с unit тестове; използват се от API и UI.
 */

export type EmailPurpose = "invoice" | "reminder" | "offer" | "general";

export interface ClientEmailInput {
  id?: string;
  email: string;
  contactName?: string | null;
  type?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
  receivesInvoices?: boolean;
  receivesReminders?: boolean;
  receivesOffers?: boolean;
  receivesGeneral?: boolean;
}

export interface ClientEmailRow {
  id?: string;
  email: string;
  contactName: string | null;
  type: string;
  isActive: boolean;
  isPrimary: boolean;
  receivesInvoices: boolean;
  receivesReminders: boolean;
  receivesOffers: boolean;
  receivesGeneral: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Нормализира имейл: trim + lowercase (за сравнение и изпращане). */
export function normalizeEmail(e: string): string {
  return (e ?? "").trim().toLowerCase();
}

export function isValidEmail(e: string): boolean {
  return EMAIL_RE.test(normalizeEmail(e));
}

/** Уникален, нормализиран, case-insensitive списък получатели (пази реда). */
export function dedupeRecipients(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const e = normalizeEmail(raw);
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

/**
 * Валидира и почиства входните адреси на клиент преди запис:
 *  - нормализира имейлите;
 *  - маха дубликати (case-insensitive) в рамките на клиента;
 *  - валидира формата;
 *  - гарантира точно един primary (ако има поне един адрес).
 * Хвърля { error } при проблем.
 */
export function prepareClientEmails(input: ClientEmailInput[]): {
  emails: ClientEmailRow[];
  primaryEmail: string | null;
} {
  const rows: ClientEmailRow[] = [];
  const seen = new Set<string>();
  for (const raw of input ?? []) {
    const email = normalizeEmail(raw.email);
    if (!email) continue;
    if (!isValidEmail(email)) {
      throw Object.assign(new Error(`Невалиден имейл адрес: ${raw.email}`), { code: "INVALID_EMAIL", email: raw.email });
    }
    if (seen.has(email)) {
      throw Object.assign(new Error(`Дублиран имейл адрес: ${email}`), { code: "DUPLICATE_EMAIL", email });
    }
    seen.add(email);
    rows.push({
      id: raw.id,
      email,
      contactName: raw.contactName?.trim() || null,
      type: raw.type?.trim() || "other",
      isPrimary: !!raw.isPrimary,
      isActive: raw.isActive !== false,
      receivesInvoices: raw.receivesInvoices !== false,
      receivesReminders: raw.receivesReminders !== false,
      receivesOffers: raw.receivesOffers !== false,
      receivesGeneral: raw.receivesGeneral !== false,
    });
  }

  if (rows.length === 0) return { emails: [], primaryEmail: null };

  // Точно един primary: ако няма нито един — първият активен (или първият) става primary;
  // ако има няколко — пази само първия.
  let primaryIdx = rows.findIndex((r) => r.isPrimary);
  if (primaryIdx === -1) {
    primaryIdx = rows.findIndex((r) => r.isActive);
    if (primaryIdx === -1) primaryIdx = 0;
  }
  rows.forEach((r, i) => { r.isPrimary = i === primaryIdx; });
  // primary адресът винаги е активен
  rows[primaryIdx].isActive = true;

  return { emails: rows, primaryEmail: rows[primaryIdx].email };
}

const PURPOSE_FLAG: Record<EmailPurpose, keyof ClientEmailRow> = {
  invoice: "receivesInvoices",
  reminder: "receivesReminders",
  offer: "receivesOffers",
  general: "receivesGeneral",
};

/**
 * Подразбиращи се получатели за дадено действие (фактура/напомняне/оферта/общо).
 * Взима активните адреси с включен съответния флаг; primary е първи.
 * Ако никой няма флага, връща primary (или всички активни) като резерв.
 * `fallbackEmail` (Client.contactEmail) се ползва, ако няма структурирани адреси.
 */
export function defaultRecipients(
  emails: ClientEmailRow[] | undefined | null,
  purpose: EmailPurpose,
  fallbackEmail?: string | null,
): string[] {
  const active = (emails ?? []).filter((e) => e.isActive);
  if (active.length === 0) {
    const fb = normalizeEmail(fallbackEmail ?? "");
    return fb && isValidEmail(fb) ? [fb] : [];
  }
  const flag = PURPOSE_FLAG[purpose];
  const sorted = [...active].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const flagged = sorted.filter((e) => e[flag]);
  const chosen = flagged.length > 0 ? flagged : sorted.filter((e) => e.isPrimary);
  const finalList = chosen.length > 0 ? chosen : sorted;
  return dedupeRecipients(finalList.map((e) => e.email));
}

/** Всички активни адреси (primary първи) — за списъка с чекбоксове при изпращане. */
export function selectableRecipients(emails: ClientEmailRow[] | undefined | null, fallbackEmail?: string | null): ClientEmailRow[] {
  const active = (emails ?? []).filter((e) => e.isActive);
  if (active.length === 0 && fallbackEmail && isValidEmail(fallbackEmail)) {
    return [{
      email: normalizeEmail(fallbackEmail), contactName: null, type: "primary",
      isPrimary: true, isActive: true, receivesInvoices: true, receivesReminders: true,
      receivesOffers: true, receivesGeneral: true,
    }];
  }
  return [...active].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}
