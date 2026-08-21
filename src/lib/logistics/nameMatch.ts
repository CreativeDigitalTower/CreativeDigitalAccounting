/**
 * Съпоставка на фирмени имена независимо от езика/изписването (кирилица/латиница,
 * леки изкривявания). Ползва се от document presentation resolver-ите (Испратница,
 * фактура), за да покажат точния фирмен текст, без да пипат master данните.
 */
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ѓ: "g", е: "e", ж: "z", з: "z", ѕ: "z", и: "i",
  ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s",
  т: "t", ќ: "k", у: "u", ф: "f", х: "h", ц: "c", ч: "c", џ: "d", ш: "s", щ: "s", ъ: "a",
  ь: "", ю: "u", я: "a", ё: "e", й: "i",
};

/** Нормализиран ключ: транслитерирана кирилица → латиница, само буквено-цифрови, lowercase. */
export function nameKey(name: string | null | undefined): string {
  return (name ?? "").toLowerCase().split("").map((c) => (c in TRANSLIT ? TRANSLIT[c] : c)).join("").replace(/[^a-z0-9]/g, "");
}
