import { NextResponse } from "next/server";
import { sendMetaEvent, metaContextFromRequest } from "@/lib/meta";

/**
 * Приема клиентски-инициирани Meta събития и ги дублира през CAPI със същия event_id
 * (дедупликация). Advanced matching данните се хешират в sendMetaEvent.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventName = typeof body.eventName === "string" ? body.eventName : null;
    if (!eventName) return NextResponse.json({ ok: false }, { status: 400 });

    const ctx = metaContextFromRequest(req);
    const u = body.user ?? {};
    await sendMetaEvent({
      eventName,
      eventId: body.eventId,
      eventSourceUrl: body.eventSourceUrl ?? null,
      actionSource: "website",
      user: {
        email: u.email, phone: u.phone, firstName: u.firstName, lastName: u.lastName, externalId: u.externalId,
        ...ctx,
      },
      custom: body.custom ?? undefined,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
