/**
 * „Испратница" е локален (МК) документ и трябва да показва издателя на кирилица,
 * ТОЧНО както е в оригиналния фирмен шаблон — дори когато master данните на фирмата
 * са въведени на английски (за фактури/CMR). Това е presentation mapping само за
 * Испратницата: НЕ променя master данните, нито другите документи (§3, §9).
 *
 * Company-scoped за индивидуалния модул (както cementFleet.data.ts). Мапингът е по
 * толерантен ключ на името, за да хване и латиница, и кирилица, и леко изкривени
 * варианти (напр. „SEM INERNAIONAL JOUEL").
 */
// Достатъчно широк тип, за да приема и exportDocs.Party, и локалния Party на шаблона.
type IssuerLike = { name?: string | null; address?: string | null; city?: string | null; [k: string]: unknown };

// Пълна транслитерация кирилица (BG/MK) → латиница, за да съпоставяме имена, въведени
// на кирилица ИЛИ латиница към един и същ ключ.
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ѓ: "g", е: "e", ж: "z", з: "z", ѕ: "z", и: "i",
  ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s",
  т: "t", ќ: "k", у: "u", ф: "f", х: "h", ц: "c", ч: "c", џ: "d", ш: "s", щ: "s", ъ: "a",
  ь: "", ю: "u", я: "a", ё: "e", й: "i",
};
function translit(s: string): string {
  return s.toLowerCase().split("").map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch)).join("");
}

type NativeIdentity = { name: string; address: string | null; city: string | null };

/** Нормализира име за съпоставка: транслитерира кирилица → латиница, само буквено-цифрови. */
function nameKey(name: string | null | undefined): string {
  return translit(name ?? "").replace(/[^a-z0-9]/g, "");
}

// Регистър на локалните (кирилски) фирмени идентичности за Испратницата.
// Ключ: predicate върху nameKey. Стойност: точният текст за документа.
const NATIVE_ISSUERS: { match: (key: string) => boolean; identity: NativeIdentity }[] = [
  {
    // „Сем Интернационал" ДООЕЛ — Тетово. Хваща seminternacionaldooel и латинските/изкривени варианти (sem…in(t)ernaion…).
    match: (k) => k.startsWith("sem") && (k.includes("internacion") || k.includes("inernaion") || k.includes("internation")),
    identity: {
      name: '"Сем Интернационал" ДООЕЛ',
      address: 'ул. "Маршал Тито" бр.55',
      city: "Тетово",
    },
  },
];

/**
 * Връща издателя на кирилица за Испратницата, ако е разпознат; иначе — оригиналния
 * Party непроменен (native `name` се предпочита, английският е само fallback другаде).
 */
export function resolveDispatchIssuer<T extends IssuerLike>(issuer: T | null | undefined): T {
  if (!issuer) return { name: null } as unknown as T;
  const key = nameKey(issuer.name);
  const hit = NATIVE_ISSUERS.find((n) => n.match(key));
  if (!hit) return issuer;
  return { ...issuer, name: hit.identity.name, address: hit.identity.address, city: hit.identity.city };
}
