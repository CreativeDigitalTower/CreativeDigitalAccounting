import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/messages";
import { normalizeLocale } from "@/lib/i18n/config";
import { APP_URL } from "@/lib/email/templates";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`forgot:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ ok: true }); // не разкриваме нищо
    }
    const { email } = await req.json();
    if (typeof email !== "string") return NextResponse.json({ ok: true });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    // Винаги връщаме ok, за да не се разкрива дали имейлът съществува.
    if (user && user.passwordHash) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expires: new Date(Date.now() + 60 * 60 * 1000) },
      });
      const url = `${APP_URL}/reset-password?token=${token}`;
      const m = passwordResetEmail(user.name || "", url, normalizeLocale(user.preferredLanguage));
      await sendEmail({ to: user.email, toName: user.name, subject: m.subject, html: m.html, category: m.category, type: "password_reset", force: true });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
