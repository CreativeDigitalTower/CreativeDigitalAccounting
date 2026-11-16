// ─────────────────────────────────────────────────────────────────────────
// Единен, надежден резолвер за фирменото лого (data URL).
//
// Логото се съхранява като data URL (base64) в Company.logoUrl — записва се в БД,
// затова е устойчиво при production deployments (не е локален файл, който може да се
// изгуби). Този модул е ЕДИНСТВЕНИЯТ източник на истина за: валидация на формата,
// безопасна обработка на SVG и решение дали логото изобщо да се покаже.
//
// Използва се навсякъде (профил, фактура, PDF), за да няма лого, което „работи" в
// един изглед, а липсва в друг. Чист модул (без DOM) → ползваем и на сървър, и в тестове.
// ─────────────────────────────────────────────────────────────────────────

export const SUPPORTED_LOGO_MIME = [
  "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/svg+xml",
] as const;
export type LogoMime = (typeof SUPPORTED_LOGO_MIME)[number];

export const MAX_LOGO_BYTES = 500 * 1024; // 500 KB (§8)

export type ParsedLogo = { mime: string; base64: string; isSvg: boolean; approxBytes: number };

function decodeBase64(b64: string): string {
  // Изоморфно: Buffer (Node/сървър/тестове) или atob (браузър).
  if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf-8");
  if (typeof atob !== "undefined") return decodeURIComponent(escape(atob(b64)));
  return "";
}
function encodeBase64(s: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(s, "utf-8").toString("base64");
  if (typeof btoa !== "undefined") return btoa(unescape(encodeURIComponent(s)));
  return "";
}

/** Разбор на data URL. Връща null, ако не е валиден data:image/*;base64 URL. */
export function parseLogoDataUrl(logoUrl: string | null | undefined): ParsedLogo | null {
  if (!logoUrl || typeof logoUrl !== "string") return null;
  const m = /^data:([a-z0-9.+/-]+);base64,([a-z0-9+/=\s]+)$/i.exec(logoUrl.trim());
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const base64 = m[2].replace(/\s+/g, "");
  if (!SUPPORTED_LOGO_MIME.includes(mime as LogoMime)) return null;
  // Приблизителен размер на декодираните байтове (3/4 от base64 дължината).
  const approxBytes = Math.floor((base64.length * 3) / 4);
  return { mime, base64, isSvg: mime === "image/svg+xml", approxBytes };
}

/** Валидно ли е качено лого (поддържан формат, в рамките на лимита). */
export function isSupportedLogo(logoUrl: string | null | undefined): boolean {
  const p = parseLogoDataUrl(logoUrl);
  return !!p && p.approxBytes <= MAX_LOGO_BYTES;
}

/**
 * Безопасна обработка на SVG (§10): премахва активно съдържание, за да не се изпълнява
 * код при визуализация — <script>, inline on*= handlers, <foreignObject>, javascript: URL-и.
 */
export function sanitizeSvg(svg: string): string {
  let out = svg;
  out = out.replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  out = out.replace(/<\s*script[^>]*\/\s*>/gi, "");
  out = out.replace(/<\s*foreignObject[\s\S]*?<\s*\/\s*foreignObject\s*>/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/(href|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "");
  return out;
}

/**
 * Резолвер за визуализация: връща безопасен data URL за показване, или null ако логото
 * липсва/е невалидно/повредено (тогава изгледът ползва fallback — името на фирмата, §5).
 * SVG се санитизира и преопакова; растерните формати се подават непроменени.
 */
export function resolveCompanyLogo(logoUrl: string | null | undefined): string | null {
  const p = parseLogoDataUrl(logoUrl);
  if (!p) return null;
  if (p.approxBytes > MAX_LOGO_BYTES) return null;
  if (!p.isSvg) return logoUrl!.trim();
  try {
    const svg = sanitizeSvg(decodeBase64(p.base64));
    if (!/<svg[\s>]/i.test(svg)) return null; // не е валиден SVG след почистване
    return `data:image/svg+xml;base64,${encodeBase64(svg)}`;
  } catch {
    return null;
  }
}

/** Съобщение за грешка при качване (ключ за i18n). */
export type LogoUploadError = "logoFormat" | "logoTooLarge" | "logoUploadFailed";

/** Проверка на избран файл при качване (тип + размер). Връща null при успех или i18n ключ. */
export function validateLogoFile(file: { type?: string; name?: string; size: number }): LogoUploadError | null {
  if (file.size > MAX_LOGO_BYTES) return "logoTooLarge";
  const type = (file.type || "").toLowerCase();
  const byExt = /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name || "");
  const okType = SUPPORTED_LOGO_MIME.includes(type as LogoMime);
  if (!okType && !byExt) return "logoFormat";
  return null;
}
