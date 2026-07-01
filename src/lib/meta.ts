import crypto from "crypto";

/**
 * Централен сървърен helper за Meta Conversions API (CAPI).
 * ВСИЧКИ сървърни Meta събития минават оттук.
 */

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE;
const API_VERSION = "v19.0";
const isDev = process.env.NODE_ENV !== "production";

export const metaPixelId = () => PIXEL_ID ?? null;
export const metaConfigured = () => !!(PIXEL_ID && ACCESS_TOKEN);
export const newEventId = () => crypto.randomUUID();

/** SHA-256 хеш на нормализирана стойност (lowercase + trim) съгласно изискванията на Meta. */
export function hash(value?: string | null): string | undefined {
  if (!value) return undefined;
  const norm = String(value).trim().toLowerCase();
  if (!norm) return undefined;
  return crypto.createHash("sha256").update(norm).digest("hex");
}
/** Телефон — само цифри, после SHA-256. */
export function hashPhone(value?: string | null): string | undefined {
  if (!value) return undefined;
  const digits = String(value).replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  return crypto.createHash("sha256").update(digits).digest("hex");
}

export type MetaUserData = {
  email?: string | null; phone?: string | null; firstName?: string | null; lastName?: string | null;
  externalId?: string | null; clientIpAddress?: string | null; clientUserAgent?: string | null;
  fbp?: string | null; fbc?: string | null;
};

export type MetaEventArgs = {
  eventName: string;
  eventId?: string;
  eventSourceUrl?: string | null;
  actionSource?: "website" | "system_generated" | "app";
  user?: MetaUserData;
  custom?: Record<string, unknown>;
};

function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null && v !== "") out[k] = v;
  return out as Partial<T>;
}

/** Изпраща едно събитие към Meta CAPI. Никога не хвърля — само логва в dev. */
export async function sendMetaEvent(args: MetaEventArgs): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const eventId = args.eventId ?? newEventId();
  if (!metaConfigured()) {
    if (isDev) console.log(`[Meta CAPI] SKIPPED (no config): ${args.eventName}`);
    return { ok: false, skipped: true };
  }
  const u = args.user ?? {};
  const user_data = clean({
    em: hash(u.email), ph: hashPhone(u.phone), fn: hash(u.firstName), ln: hash(u.lastName),
    external_id: hash(u.externalId), client_ip_address: u.clientIpAddress ?? undefined,
    client_user_agent: u.clientUserAgent ?? undefined, fbp: u.fbp ?? undefined, fbc: u.fbc ?? undefined,
  });

  const payload = {
    data: [clean({
      event_name: args.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: args.actionSource ?? "website",
      event_source_url: args.eventSourceUrl ?? undefined,
      user_data,
      custom_data: args.custom && Object.keys(args.custom).length ? clean(args.custom as Record<string, unknown>) : undefined,
    })],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (isDev) console.log(`[Meta CAPI] ${args.eventName} → ${res.status}`, TEST_EVENT_CODE ? "(TEST)" : "", JSON.stringify(json));
    return { ok: res.ok, error: res.ok ? undefined : JSON.stringify(json) };
  } catch (e) {
    if (isDev) console.log(`[Meta CAPI ERROR] ${args.eventName}`, e);
    return { ok: false, error: String(e) };
  }
}

/** Извлича IP, User-Agent и _fbp/_fbc от заявка (за advanced matching). */
export function metaContextFromRequest(req: Request): Pick<MetaUserData, "clientIpAddress" | "clientUserAgent" | "fbp" | "fbc"> {
  const h = req.headers;
  const ip = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim() || undefined;
  const ua = h.get("user-agent") || undefined;
  const cookie = h.get("cookie") || "";
  const get = (name: string) => cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];
  return { clientIpAddress: ip, clientUserAgent: ua, fbp: get("_fbp"), fbc: get("_fbc") };
}
