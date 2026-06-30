import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let email = "";
  try {
    const log = await prisma.emailLog.findUnique({ where: { id }, select: { toEmail: true } });
    if (log) {
      email = log.toEmail;
      await prisma.emailBlacklist.upsert({
        where: { email: log.toEmail },
        update: { unsubscribed: true },
        create: { email: log.toEmail, unsubscribed: true, reason: "Отписан от потребителя" },
      });
    }
  } catch {}
  const html = `<!DOCTYPE html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Отписване</title></head>
  <body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#F4F6F4;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;">
  <div style="background:#fff;border:1px solid #E7ECE9;border-radius:16px;padding:40px;max-width:440px;text-align:center;">
  <div style="width:46px;height:46px;border-radius:11px;background:#0B5E4A;color:#fff;line-height:46px;font-weight:700;font-family:Georgia,serif;font-size:22px;margin:0 auto 18px;">C</div>
  <h1 style="font-family:Georgia,serif;color:#1A2B26;font-size:21px;margin:0 0 12px;">Отписахте се успешно</h1>
  <p style="color:#384842;font-size:14px;line-height:1.6;margin:0;">Повече няма да получавате автоматизирани имейли на <strong>${email}</strong>.<br>Критични съобщения за сигурност може все пак да получите.</p>
  </div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
