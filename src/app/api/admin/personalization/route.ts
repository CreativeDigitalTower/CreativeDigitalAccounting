import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { sendEmail } from "@/lib/email/send";
import { buildPersonalizationHtml } from "@/lib/email/messages";
import { normalizeLocale } from "@/lib/i18n/config";
import { z } from "zod";

// Тип на събитието за проследяване + бъдещи маркетинг кампании. „personalization"
// е първата кампания; архитектурата позволява лесно добавяне на още (нови модули,
// шаблони, покани за демо и т.н.) чрез нов campaign ключ.
export const PERSONALIZATION_TYPE = "personalization_offer";
const CAMPAIGN_BUILDERS: Record<string, (locale: string) => { subject: string; html: string }> = {
  personalization: (locale) => buildPersonalizationHtml(normalizeLocale(locale)),
};

const schema = z.object({
  companyId: z.string(),
  campaign: z.string().default("personalization"),
});

export async function POST(req: Request) {
  try {
    const { userId } = await requireSuperAdmin();
    const { companyId, campaign } = schema.parse(await req.json());
    const build = CAMPAIGN_BUILDERS[campaign];
    if (!build) return NextResponse.json({ error: "Непозната кампания." }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true, name: true, email: true, archivedAt: true,
        companyUsers: { select: { user: { select: { email: true, name: true, preferredLanguage: true } } } },
      },
    });
    if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
    if (company.archivedAt) return NextResponse.json({ error: "Фирмата е в Кошчето." }, { status: 400 });

    // Разрешени получатели: само реалните имейли на фирмата (срещу injection).
    const allowed = new Set<string>();
    if (company.email) allowed.add(company.email.trim().toLowerCase());
    for (const cu of company.companyUsers) if (cu.user?.email) allowed.add(cu.user.email.trim().toLowerCase());
    const recipients = [...allowed];
    if (recipients.length === 0) return NextResponse.json({ error: "Няма валиден имейл на фирмата." }, { status: 400 });

    const owner = company.companyUsers[0]?.user;
    const locale = normalizeLocale(owner?.preferredLanguage);
    const { subject, html } = build(locale);

    const results: { email: string; status: string; id: string }[] = [];
    for (const to of recipients) {
      const r = await sendEmail({ to, subject, html, category: "announcement", type: PERSONALIZATION_TYPE, companyId });
      results.push({ email: to, status: r.status, id: r.id });
    }

    await audit(companyId, userId, "email", "Company", companyId,
      `Предложение за персонализация (${campaign}) → ${recipients.join(", ")}`);
    return NextResponse.json({ success: true, results });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
