import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { sendEmail } from "@/lib/email/send";
import { baseTemplate } from "@/lib/email/templates";
import { z } from "zod";

// Супер Админ изпраща съобщение до всички или избрани фирми.
export async function POST(req: Request) {
  await requireSuperAdmin();
  try {
    const { subject, message, target, companyIds, attachments } = z.object({
      subject: z.string().min(2),
      message: z.string().min(2),
      target: z.enum(["all", "selected"]),
      companyIds: z.array(z.string()).optional(),
      attachments: z.array(z.object({ filename: z.string(), dataUrl: z.string() })).optional(),
    }).parse(await req.json());

    const where = target === "selected" && companyIds?.length ? { id: { in: companyIds } } : {};
    const companies = await prisma.company.findMany({
      where,
      select: { id: true, name: true, companyUsers: { where: { role: "owner" }, select: { user: { select: { email: true, name: true } } } } },
    });

    const html = baseTemplate({
      eyebrow: "Съобщение от екипа",
      title: subject,
      intro: message.split("\n").filter(Boolean).map((p) => p.replace(/</g, "&lt;")),
      button: { label: "Към платформата", url: process.env.NEXT_PUBLIC_APP_URL || "https://www.creativedigitalaccounting.com" },
    });

    let sent = 0;
    for (const c of companies) {
      const owner = c.companyUsers[0]?.user;
      if (!owner?.email) continue;
      // категория "announcement" → по подразбиране разрешена; уважава глобално отписаните
      // фирми (настройка на Супер Админ) и черния списък.
      const res = await sendEmail({ to: owner.email, toName: owner.name, subject, html, category: "announcement", type: "admin_broadcast", companyId: c.id, attachments });
      if (res.status === "sent" || res.status === "queued") sent++;
    }
    return NextResponse.json({ ok: true, recipients: companies.length, sent });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни" }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка" }, { status: 500 });
  }
}
