/**
 * Централно определяне на Reply-To за ДОКУМЕНТНИ имейли (фактури/напомняния), които CDA
 * изпраща от името на конкретна фирма към неин клиент (§12/§14).
 *
 * SMTP From остава винаги CDA (техническият подател). Reply-To сочи към фирмата издател, за
 * да стигат отговорите директно при нея. Приоритет:
 *   1) Company.correspondenceEmail
 *   2) Company.email
 *   3) email на собственика (owner), ако е подаден
 *   4) null → извикващият пада към глобалния CDA SMTP_REPLY_TO
 * Всяка стойност се валидира; невалиден/празен адрес се пропуска (никога cross-company).
 */
import { isValidEmail, normalizeEmail } from "@/lib/clientEmails";

export type ReplyToInput = {
  correspondenceEmail?: string | null;
  email?: string | null;
  ownerEmail?: string | null;
};

/** Чисто резолвиране (без DB) — за да е тествано изолирано и споделено с UI/preview. */
export function resolveCompanyReplyTo(input: ReplyToInput): string | null {
  for (const raw of [input.correspondenceEmail, input.email, input.ownerEmail]) {
    const e = normalizeEmail(raw ?? "");
    if (e && isValidEmail(e)) return e;
  }
  return null;
}

/**
 * Резолвиране по companyId (зарежда фирмата + собственика). Връща null при липса на валиден
 * фирмен адрес → извикващият ползва глобалния CDA Reply-To.
 */
export async function resolveCompanyReplyToById(companyId: string | null | undefined): Promise<string | null> {
  if (!companyId) return null;
  const { prisma } = await import("@/lib/prisma");
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      correspondenceEmail: true, email: true,
      companyUsers: { where: { role: "owner" }, select: { user: { select: { email: true } } }, take: 1 },
    },
  });
  if (!company) return null;
  return resolveCompanyReplyTo({
    correspondenceEmail: company.correspondenceEmail,
    email: company.email,
    ownerEmail: company.companyUsers[0]?.user?.email ?? null,
  });
}
