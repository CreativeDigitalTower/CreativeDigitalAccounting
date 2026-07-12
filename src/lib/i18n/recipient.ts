import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "./config";

// Езикът, на който да се изпрати имейл/известие до получателя.
// Приоритет: език на потребителя → език по подразбиране на фирмата → език на текущата
// заявка (бисквитка) → български.

export async function localeForUser(userId?: string | null): Promise<Locale> {
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { preferredLanguage: true } });
    if (u?.preferredLanguage) return normalizeLocale(u.preferredLanguage);
  }
  return "bg";
}

export async function localeForEmail(email?: string | null): Promise<Locale> {
  if (email) {
    const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { preferredLanguage: true } });
    if (u?.preferredLanguage) return normalizeLocale(u.preferredLanguage);
  }
  return "bg";
}

export async function localeForCompany(companyId?: string | null): Promise<Locale> {
  if (companyId) {
    const c = await prisma.company.findUnique({ where: { id: companyId }, select: { defaultLanguage: true } });
    if (c?.defaultLanguage) return normalizeLocale(c.defaultLanguage);
  }
  return "bg";
}

/** Езикът на текущата заявка (бисквитка) — за нерегистрирани/при регистрация. */
export async function localeFromRequest(): Promise<Locale> {
  const jar = await cookies();
  return normalizeLocale(jar.get(LOCALE_COOKIE)?.value);
}
