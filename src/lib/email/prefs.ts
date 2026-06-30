// Email-automation preference categories a company can toggle on/off.
// Transactional/critical mails (password reset, security) are NOT toggleable.

export interface PrefDef {
  key: string;
  label: string;
  description: string;
  /** category names of EmailLog that this preference controls */
  category: string;
  default: boolean;
}

export const EMAIL_PREFS: PrefDef[] = [
  { key: "subscription", category: "subscription", label: "Абонамент и плащания", description: "Потвърждения за избор/подновяване на план, фактури за абонамента.", default: true },
  { key: "reminders", category: "reminder", label: "Напомняния", description: "Изтичащ абонамент, неплатени фактури, наближаващи падежи, изтичащи договори.", default: true },
  { key: "documents", category: "document", label: "Копия на документи", description: "Копие на имейла при издаване на фактура, проформа, оферта, договор, протокол.", default: true },
  { key: "client_decision", category: "client_decision", label: "Решения на клиенти", description: "Известие, когато клиент приеме или отхвърли изпратена фактура/оферта.", default: true },
  { key: "product", category: "product", label: "Новини за продукта", description: "Нови функции, съвети и обучения.", default: false },
];

const DEFAULTS: Record<string, boolean> = Object.fromEntries(EMAIL_PREFS.map((p) => [p.category, p.default]));

/** Always-on categories that ignore preferences. */
const CRITICAL = new Set(["account", "system", "admin"]);

export function parsePrefs(json: string | null | undefined): Record<string, boolean> {
  if (!json) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...(JSON.parse(json) as Record<string, boolean>) };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Whether an email of the given category may be sent to a company with these prefs. */
export function allowsCategory(prefsJson: string | null | undefined, category: string): boolean {
  if (CRITICAL.has(category)) return true;
  const prefs = parsePrefs(prefsJson);
  return prefs[category] !== false;
}
