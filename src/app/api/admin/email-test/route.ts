import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/session";
import { verifyTransport, smtpConfigSummary, sendEmail, ADMIN_EMAIL } from "@/lib/email/send";
import { baseTemplate } from "@/lib/email/templates";
import { z } from "zod";

// Статус на SMTP връзката + текуща конфигурация (без паролата).
export async function GET() {
  await requireSuperAdmin();
  const config = smtpConfigSummary();
  const verify = await verifyTransport();
  return NextResponse.json({ config, verify });
}

// Изпраща тестов имейл и връща резултата (status + причина при грешка).
export async function POST(req: Request) {
  await requireSuperAdmin();
  let to = ADMIN_EMAIL;
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = z.object({ to: z.string().email().optional() }).parse(body);
    if (parsed.to) to = parsed.to;
  } catch {
    return NextResponse.json({ error: "Невалиден имейл" }, { status: 400 });
  }

  const html = baseTemplate({
    eyebrow: "Тест",
    title: "Тестов имейл от Email Center",
    intro: [
      "Това е тестово съобщение, изпратено от Super Admin панела.",
      `Ако виждате този имейл, SMTP връзката към <strong>${smtpConfigSummary().host}</strong> работи коректно.`,
      `Изпратено на: ${new Date().toLocaleString("bg-BG")}.`,
    ],
  });

  const res = await sendEmail({
    to, subject: "Тестов имейл — Creative Digital Accounting",
    html, category: "system", type: "smtp_test", force: true,
  });

  // взимаме крайния статус + евентуална грешка от лога
  const { prisma } = await import("@/lib/prisma");
  const log = await prisma.emailLog.findUnique({ where: { id: res.id }, select: { status: true, error: true } });
  const ok = log?.status === "sent";
  return NextResponse.json({
    ok, status: log?.status ?? res.status, error: log?.error ?? null, to,
  }, { status: ok ? 200 : 200 });
}
