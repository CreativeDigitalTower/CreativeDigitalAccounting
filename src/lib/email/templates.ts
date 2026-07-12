import { PLATFORM_NAME, PLATFORM_URL } from "@/lib/constants";
import { getMessages, makeT } from "@/lib/i18n/messages";
import { normalizeLocale } from "@/lib/i18n/config";

const EMERALD = "#0F8A6A";
const EMERALD_DARK = "#0B5E4A";
const BRASS = "#A5812E";
const INK = "#1A2B26";
const MUTED = "#6B7C76";
const BG = "#F4F6F4";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://www.creativedigitalaccounting.com";

export interface EmailButton {
  label: string;
  url: string;
}

interface BaseOpts {
  title: string;
  preheader?: string;
  /** lead paragraph(s) — array of HTML strings */
  intro: string[];
  button?: EmailButton;
  /** secondary blocks: key/value rows rendered as an elegant table */
  details?: { label: string; value: string }[];
  /** extra HTML after the button (e.g. disclaimers) */
  footnote?: string;
  /** small accent label shown above the title */
  eyebrow?: string;
  /** език на получателя (bg по подразбиране) */
  locale?: string;
}

/** Elegant, minimalist, brand-consistent HTML email shell. */
export function baseTemplate(o: BaseOpts): string {
  const loc = normalizeLocale(o.locale);
  const et = makeT(getMessages(loc));
  const detailRows = (o.details ?? [])
    .map(
      (d) => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #E7ECE9;color:${MUTED};font-size:13px;">${escapeHtml(d.label)}</td>
        <td style="padding:9px 0;border-bottom:1px solid #E7ECE9;color:${INK};font-size:13px;font-weight:600;text-align:right;">${escapeHtml(d.value)}</td>
      </tr>`
    )
    .join("");

  const detailsBlock = o.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;border-collapse:collapse;">${detailRows}</table>`
    : "";

  const button = o.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px;"><tr><td style="border-radius:10px;background:${EMERALD};">
        <a href="${o.button.url}" target="_blank" style="display:inline-block;padding:13px 30px;font-size:14.5px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:.2px;">${escapeHtml(o.button.label)}</a>
      </td></tr></table>`
    : "";

  return `<!DOCTYPE html>
<html lang="${loc}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(o.title)}</title></head>
<body style="margin:0;padding:0;background:${BG};-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(o.preheader ?? o.title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E7ECE9;">
    <!-- header -->
    <tr><td style="padding:30px 40px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;">
          <span style="display:inline-block;width:34px;height:34px;border-radius:9px;background:${EMERALD_DARK};color:#fff;text-align:center;line-height:34px;font-weight:700;font-family:Georgia,serif;font-size:17px;">C</span>
        </td>
        <td style="vertical-align:middle;padding-left:11px;">
          <span style="font-size:15px;font-weight:700;color:${INK};font-family:Georgia,serif;letter-spacing:.2px;">${escapeHtml(PLATFORM_NAME)}</span>
        </td>
      </tr></table>
      <div style="height:1px;background:linear-gradient(90deg,${EMERALD},transparent);margin-top:22px;"></div>
    </td></tr>
    <!-- body -->
    <tr><td style="padding:30px 40px 36px;">
      ${o.eyebrow ? `<div style="font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${BRASS};margin-bottom:10px;">${escapeHtml(o.eyebrow)}</div>` : ""}
      <h1 style="margin:0 0 16px;font-size:23px;line-height:1.25;font-weight:700;color:${INK};font-family:Georgia,serif;">${escapeHtml(o.title)}</h1>
      ${o.intro.map((p) => `<p style="margin:0 0 14px;font-size:14.5px;line-height:1.62;color:#384842;">${p}</p>`).join("")}
      ${detailsBlock}
      ${button}
      ${o.footnote ? `<p style="margin:22px 0 0;font-size:12.5px;line-height:1.6;color:${MUTED};">${o.footnote}</p>` : ""}
    </td></tr>
    <!-- footer -->
    <tr><td style="padding:22px 40px 30px;background:#FAFBFA;border-top:1px solid #EEF2F0;">
      <p style="margin:0 0 6px;font-size:12px;color:${MUTED};line-height:1.6;">
        ${escapeHtml(et("emails.footer.tagline", { name: PLATFORM_NAME }))}
      </p>
      <p style="margin:0;font-size:11.5px;color:#9AA8A2;">
        <a href="${APP_URL}" style="color:${EMERALD};text-decoration:none;">${escapeHtml(PLATFORM_URL)}</a>
        &nbsp;·&nbsp; office@creativedigitalaccounting.com
      </p>
    </td></tr>
  </table>
  <p style="max-width:560px;margin:16px auto 0;font-size:11px;color:#9AA8A2;line-height:1.5;text-align:center;">
    ${escapeHtml(et("emails.footer.whyReceiving", { name: PLATFORM_NAME }))}
    {{UNSUB}}
  </p>
</td></tr></table>
</body></html>`;
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
