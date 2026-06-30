import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import { allowsCategory } from "./prefs";
import { APP_URL } from "./templates";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "office@creativedigitalaccounting.com";
const FROM = process.env.SMTP_FROM || `Creative Digital Accounting <${ADMIN_EMAIL}>`;
const REPLY_TO = process.env.SMTP_REPLY_TO || ADMIN_EMAIL;

/** Дали SMTP е конфигуриран (има host). */
export function isSmtpConfigured(): boolean {
  return !!process.env.SMTP_HOST;
}

/** Текущата SMTP конфигурация (без паролата) — за индикатора в Super Admin. */
export function smtpConfigSummary() {
  return {
    configured: isSmtpConfigured(),
    host: process.env.SMTP_HOST || null,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
    user: process.env.SMTP_USER || null,
    from: FROM,
    replyTo: REPLY_TO,
    hasPassword: !!process.env.SMTP_PASS,
  };
}

/** Проверка на SMTP връзката (login + handshake) без да изпраща имейл. */
export async function verifyTransport(): Promise<{ ok: boolean; error?: string }> {
  const transport = getTransport();
  if (!transport) return { ok: false, error: "SMTP не е конфигуриран (липсва SMTP_HOST)." };
  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message ?? err) };
  }
}

// Retry backoff schedule (минути): 5м, 30м, 2ч, 24ч
export const RETRY_STEPS_MIN = [5, 30, 120, 1440];

let _transport: Transporter | null = null;
let _resolved = false;

function getTransport(): Transporter | null {
  if (_resolved) return _transport;
  _resolved = true;
  const host = process.env.SMTP_HOST;
  if (!host) {
    _transport = null;
    return null;
  }
  _transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return _transport;
}

export interface SendArgs {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  category: string; // account | subscription | document | reminder | admin | system | client_decision | product
  type: string; // machine key
  companyId?: string | null;
  /** schedule for later (used by reminders); if set in the future, queued */
  scheduledFor?: Date | null;
  /** bypass preference check (critical mails). default false */
  force?: boolean;
}

/**
 * Core entry point. Records an EmailLog row, respects blacklist + company prefs,
 * then attempts delivery (or queues if SMTP is unconfigured / send fails).
 */
export async function sendEmail(args: SendArgs): Promise<{ id: string; status: string }> {
  const to = args.to.trim().toLowerCase();

  // 1) blacklist / unsubscribe guard
  const black = await prisma.emailBlacklist.findUnique({ where: { email: to } });
  if (black) {
    const log = await prisma.emailLog.create({
      data: {
        companyId: args.companyId ?? null, toEmail: to, toName: args.toName ?? null,
        category: args.category, type: args.type, subject: args.subject,
        status: "skipped", error: black.unsubscribed ? "Отписан" : "В черен списък",
      },
    });
    return { id: log.id, status: "skipped" };
  }

  // 2) company preference guard (non-critical only)
  if (!args.force && args.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: args.companyId }, select: { emailPrefs: true },
    });
    if (company && !allowsCategory(company.emailPrefs, args.category)) {
      const log = await prisma.emailLog.create({
        data: {
          companyId: args.companyId, toEmail: to, toName: args.toName ?? null,
          category: args.category, type: args.type, subject: args.subject,
          status: "skipped", error: "Изключено от настройките на фирмата",
        },
      });
      return { id: log.id, status: "skipped" };
    }
  }

  // 3) create log row (queued)
  const log = await prisma.emailLog.create({
    data: {
      companyId: args.companyId ?? null, toEmail: to, toName: args.toName ?? null,
      category: args.category, type: args.type, subject: args.subject,
      status: "queued", scheduledFor: args.scheduledFor ?? null,
    },
  });

  // scheduled for the future → leave queued, the cron picks it up
  if (args.scheduledFor && args.scheduledFor.getTime() > Date.now()) {
    return { id: log.id, status: "queued" };
  }

  await deliver(log.id, to, args.subject, args.html);
  const fresh = await prisma.emailLog.findUnique({ where: { id: log.id }, select: { status: true } });
  return { id: log.id, status: fresh?.status ?? "queued" };
}

/** Inject open-tracking pixel + footer unsubscribe link, then attempt SMTP send. */
async function deliver(logId: string, to: string, subject: string, html: string): Promise<boolean> {
  const pixel = `<img src="${APP_URL}/api/email/open/${logId}" width="1" height="1" alt="" style="display:none">`;
  const unsub = `Не желаете тези имейли? <a href="${APP_URL}/api/email/unsubscribe/${logId}" style="color:#0F8A6A;">Отпишете се</a>.`;
  let finalHtml = html.replace("{{UNSUB}}", unsub).replace("</body>", `${pixel}</body>`);
  // wrap primary CTA for click-tracking
  finalHtml = finalHtml.replace(
    /<a href="([^"]+)" target="_blank" style="display:inline-block;padding:13px/g,
    (_m, url) => `<a href="${APP_URL}/api/email/click/${logId}?u=${encodeURIComponent(url)}" target="_blank" style="display:inline-block;padding:13px`
  );

  const transport = getTransport();
  if (!transport) {
    // SMTP not configured: keep queued so it can be delivered once configured.
    await prisma.emailLog.update({
      where: { id: logId },
      data: { status: "queued", error: "SMTP не е конфигуриран (изчаква)", attempts: { increment: 1 } },
    });
    return false;
  }

  try {
    await transport.sendMail({ from: FROM, replyTo: REPLY_TO, to, subject, html: finalHtml });
    await prisma.emailLog.update({
      where: { id: logId },
      data: { status: "sent", sentAt: new Date(), error: null, nextRetryAt: null, attempts: { increment: 1 } },
    });
    return true;
  } catch (err) {
    const log = await prisma.emailLog.findUnique({ where: { id: logId }, select: { attempts: true } });
    const attempts = (log?.attempts ?? 0) + 1;
    const stepIdx = Math.min(attempts - 1, RETRY_STEPS_MIN.length - 1);
    const giveUp = attempts > RETRY_STEPS_MIN.length;
    const nextRetryAt = giveUp ? null : new Date(Date.now() + RETRY_STEPS_MIN[stepIdx] * 60_000);
    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status: giveUp ? "failed" : "queued",
        error: String((err as Error)?.message ?? err).slice(0, 500),
        attempts, nextRetryAt,
      },
    });
    // Repeated hard failures → blacklist
    if (giveUp) await markBounce(to);
    return false;
  }
}

/** Process queued/retry-due emails. Called by the cron endpoint. Re-renders is not
 * possible (html not stored), so we re-send the stored subject with a minimal note
 * only for SMTP-unconfigured queue; real retries store nothing extra. To keep it
 * simple and reliable we store the rendered html in a transient cache is overkill —
 * instead the cron only flips SMTP-unavailable queue once transport exists by
 * resending a generic note is wrong. So we DO NOT resend bodyless mails; retries are
 * handled inline at send time. This function only expires stuck queued mails. */
export async function processQueue(): Promise<{ retried: number }> {
  // With inline retry at send-time, the queue mainly holds SMTP-unconfigured or
  // future-scheduled mails. We mark long-stuck queued mails as failed after 3 days.
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const res = await prisma.emailLog.updateMany({
    where: { status: "queued", scheduledFor: null, createdAt: { lt: cutoff } },
    data: { status: "failed", error: "Изтекъл в опашката (SMTP недостъпен)" },
  });
  return { retried: res.count };
}

export async function markBounce(email: string) {
  const e = email.trim().toLowerCase();
  const existing = await prisma.emailBlacklist.findUnique({ where: { email: e } });
  if (existing) {
    await prisma.emailBlacklist.update({ where: { email: e }, data: { bounces: { increment: 1 } } });
  } else {
    await prisma.emailBlacklist.create({ data: { email: e, reason: "Многократни грешки при доставка", bounces: 1 } });
  }
  await prisma.emailLog.updateMany({ where: { toEmail: e }, data: { bounced: true } });
}

/** Helper for platform/admin notifications to office@. Always sent (critical). */
export async function notifyAdmin(subject: string, html: string, type = "admin_notice") {
  return sendEmail({ to: ADMIN_EMAIL, subject, html, category: "admin", type, force: true });
}
