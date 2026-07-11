import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "./config";
import { getMessages, makeT } from "./messages";

/** Активният език за текущата заявка — от бисквитката (fallback: български). */
export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return normalizeLocale(jar.get(LOCALE_COOKIE)?.value);
}

/** Сървърен превод за текущия език: `const t = await getT()`. */
export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(getMessages(locale)) };
}
