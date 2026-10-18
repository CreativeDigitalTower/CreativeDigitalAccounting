// Безопасно разпознаване на град от адрес за клиентски досиета (логистика).
// Чист модул (без DB/зависимости) → ползва се И от reconciliation скрипта, И от тестовете
// (един source of truth). Поддържа кирилица и латиница; не ползва външни API.
//
// Принцип (§4/§5): НЕ приема сляпо, че последният елемент е град. Използва курирана листа от
// познати населени места (МК) + консервативни правила. Връща { city, confidence, reason }.

// Курирана листа македонски градове (кирилица + често срещани латински варианти). Разширима.
const KNOWN_CITIES = [
  "Скопје", "Куманово", "Битола", "Прилеп", "Тетово", "Велес", "Штип", "Охрид", "Гостивар",
  "Струмица", "Кавадарци", "Кочани", "Кичево", "Гевгелија", "Струга", "Радовиш", "Виница",
  "Крива Паланка", "Свети Николе", "Неготино", "Ресен", "Дебар", "Делчево", "Демир Хисар",
  "Крушево", "Македонски Брод", "Берово", "Пехчево", "Пробиштип", "Богданци", "Валандово",
  "Македонска Каменица", "Демир Капија", "Кратово", "Босилово", "Ново Село", "Centar", "Чаир",
  // латиница
  "Skopje", "Kumanovo", "Bitola", "Prilep", "Tetovo", "Veles", "Stip", "Štip", "Ohrid",
  "Gostivar", "Strumica", "Kavadarci", "Kocani", "Kočani", "Kicevo", "Kičevo", "Gevgelija",
  "Struga", "Radovis", "Radoviš", "Vinica", "Kriva Palanka", "Sveti Nikole", "Negotino",
];

const norm = (s) => (s ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim();
const KNOWN = new Set(KNOWN_CITIES.map(norm));

// Токен, който НЕ може да е град (улица/номер/без-номер маркери, съдържа цифри).
function isStreetLike(t) {
  const n = norm(t);
  if (/\d/.test(n)) return true; // съдържа номер → улица/№
  return /^(ул|бул|пл|бр|нас|ббб?|бб|no|str|ul)\b/.test(n) || /\bб\.?б\.?$/.test(n);
}
// Правдоподобно населено място: буквен токен, без цифри, разумна дължина.
function looksLikePlace(t) {
  const n = (t ?? "").trim();
  return n.length >= 3 && !/\d/.test(n) && /^[\p{L}][\p{L} .'’-]*$/u.test(n) && !isStreetLike(n);
}

/**
 * Предлага град от адресните полета. `address` е основен, `baseAddress` е резерва.
 * confidence: HIGH | MEDIUM | LOW | UNRESOLVED.
 */
export function suggestCity(address, baseAddress) {
  const raw = (address && address.trim()) ? address : (baseAddress || "");
  const addr = (raw || "").trim();
  if (!addr) return { city: "", confidence: "UNRESOLVED", reason: "no address" };

  const tokens = addr.split(",").map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return { city: "", confidence: "UNRESOLVED", reason: "no address segments" };

  const last = tokens[tokens.length - 1];
  const knownTokens = tokens.filter((t) => KNOWN.has(norm(t)));

  // 1) Последният сегмент е познат град → най-висока сигурност.
  if (KNOWN.has(norm(last))) {
    return { city: last, confidence: "HIGH", reason: "last address segment matches known city" };
  }
  // 2) Няколко познати града в адреса, но не като последен → двусмислено.
  if (knownTokens.length > 1) {
    return { city: "", confidence: "LOW", reason: `multiple known cities in address (${knownTokens.join(" / ")})` };
  }
  // 3) Точно един познат град някъде (не последен) → вероятен, но за проверка.
  if (knownTokens.length === 1) {
    return { city: knownTokens[0], confidence: "MEDIUM", reason: "known city found but not the last segment" };
  }
  // 4) Последният сегмент прилича на населено място, но не е в списъка → за проверка.
  if (looksLikePlace(last)) {
    return { city: last, confidence: "MEDIUM", reason: "last segment looks like a settlement (not in known list)" };
  }
  // 5) Няма надежден кандидат.
  return { city: "", confidence: "UNRESOLVED", reason: "no reliable city candidate" };
}

export { KNOWN_CITIES };
