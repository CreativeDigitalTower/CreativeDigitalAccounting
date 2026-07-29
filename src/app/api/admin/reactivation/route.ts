import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { sendEmail } from "@/lib/email/send";
import { buildReactivationHtml, createInvoiceUrl, reactivationReminderDefaults } from "@/lib/email/messages";
import { reminderCooldown } from "@/lib/engagement";
import { normalizeLocale } from "@/lib/i18n/config";
import { z } from "zod";

export const REACTIVATION_TYPE = "reactivation_reminder";

const schema = z.object({
  companyId: z.string(),
  recipients: z.array(z.string().email()).min(1).max(10),
  subject: z.string().min(3).max(300),
  paragraphs: z.array(z.string().max(4000)).min(1).max(20),
  buttonLabel: z.string().min(1).max(120).optional(),
  override: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await requireSuperAdmin();
    const { companyId, recipients, subject, paragraphs, buttonLabel, override } = schema.parse(await req.json());

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true, name: true, email: true, archivedAt: true,
        companyUsers: { select: { user: { select: { email: true, name: true, preferredLanguage: true } } } },
      },
    });
    if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
    if (company.archivedAt) return NextResponse.json({ error: "Фирмата е в Кошчето." }, { status: 400 });

    // Разрешени получатели: само реалните имейли на фирмата (потребители + фирмен email).
    // Пази от изпращане до произволни адреси / injection чрез API.
    const allowed = new Set<string>();
    if (company.email) allowed.add(company.email.trim().toLowerCase());
    for (const cu of company.companyUsers) if (cu.user?.email) allowed.add(cu.user.email.trim().toLowerCase());
    const chosen = [...new Set(recipients.map((r) => r.trim().toLowerCase()))].filter((r) => allowed.has(r));
    if (chosen.length === 0) return NextResponse.json({ error: "Получателите трябва да са реални адреси на фирмата." }, { status: 400 });

    // Cooldown / максимален брой напомняния (освен ако Super Admin не потвърди override).
    const prior = await prisma.emailLog.findMany({
      where: { companyId, type: REACTIVATION_TYPE, status: { in: ["sent", "queued"] } },
      select: { createdAt: true }, orderBy: { createdAt: "desc" },
    });
    const cd = reminderCooldown(prior.length, prior[0]?.createdAt ?? null);
    if (!cd.canSend && !override) {
      return NextResponse.json({
        error: cd.maxReached
          ? `Достигнат е максималният брой напомняния (${prior.length}). Потвърдете изрично за ново.`
          : `Напомняне е изпратено преди ${cd.daysSinceLast} дни. Изчакайте още ${cd.daysUntilAllowed} дни или потвърдете изрично.`,
        needsOverride: true,
      }, { status: 429 });
    }

    // Език по предпочитание на основния потребител.
    const owner = company.companyUsers[0]?.user;
    const locale = normalizeLocale(owner?.preferredLanguage);
    const btn = buttonLabel || reactivationReminderDefaults({ companyName: company.name, daysSinceRegistration: 0 }, locale).buttonLabel;
    const html = buildReactivationHtml({ subject, paragraphs, buttonLabel: btn, ctaUrl: createInvoiceUrl(), locale });

    // Изпращане през централния EmailService (open pixel + click tracking + blacklist).
    const results: { email: string; status: string; id: string }[] = [];
    for (const to of chosen) {
      const r = await sendEmail({ to, subject, html, category: "reminder", type: REACTIVATION_TYPE, companyId });
      results.push({ email: to, status: r.status, id: r.id });
    }

    const edited = subject !== reactivationReminderDefaults({ companyName: company.name, daysSinceRegistration: 0 }, locale).subject;
    await audit(companyId, userId, "email", "Company", companyId,
      `Напомняне за активиране → ${chosen.join(", ")}; тема: "${subject}"${edited ? " (редактирана)" : ""}${override && !cd.canSend ? " [override]" : ""}`);

    return NextResponse.json({ success: true, results });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
