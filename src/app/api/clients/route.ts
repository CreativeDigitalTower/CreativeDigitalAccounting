import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, getPlan } from "@/lib/session";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { validateEik } from "@/lib/validation/eik";
import { prepareClientEmails } from "@/lib/clientEmails";
import { z } from "zod";

const emailInputSchema = z.object({
  id: z.string().optional(),
  email: z.string(),
  contactName: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  receivesInvoices: z.boolean().optional(),
  receivesReminders: z.boolean().optional(),
  receivesOffers: z.boolean().optional(),
  receivesGeneral: z.boolean().optional(),
});

const schema = z.object({
  name: z.string().min(2),
  eik: z.string().optional(),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  mol: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  emails: z.array(emailInputSchema).optional(),
});

export async function GET() {
  try {
    const { companyId } = await requireCompany();
    const clients = await prisma.client.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(clients);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const plan = await getPlan(companyId);
    const limit = SUBSCRIPTION_PLANS[plan].clients;
    if (limit !== Infinity) {
      const count = await prisma.client.count({ where: { companyId } });
      if (count >= limit) {
        return NextResponse.json({ error: `Достигнат лимит от ${limit} клиенти за вашия план. Надградете, за да добавите повече.` }, { status: 403 });
      }
    }
    const body = await req.json();
    const data = schema.parse(body);
    const { emails: emailsInput, ...clientData } = data;

    // Валидираме структурираните имейли предварително (за да върнем ясна грешка)
    let prepared: ReturnType<typeof prepareClientEmails> | null = null;
    if (emailsInput !== undefined) {
      try { prepared = prepareClientEmails(emailsInput); }
      catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
    }

    // ── Валидация на ЕИК/БУЛСТАT (формат + контролна цифра), ако е попълнен ──
    if (clientData.eik && clientData.eik.trim() !== "") {
      const c = validateEik(clientData.eik);
      if (!c.isValid) return NextResponse.json({ error: c.error ?? "Невалиден ЕИК/БУЛСТАТ." }, { status: 400 });
      clientData.eik = c.normalized;
    }

    // Без дублиране: ако вече има клиент със същия ЕИК (или същото име), връщаме него.
    const eik = clientData.eik?.trim();
    const dup = await prisma.client.findFirst({
      where: { companyId, OR: [...(eik ? [{ eik }] : []), { name: { equals: clientData.name.trim(), mode: "insensitive" as const } }] },
    });
    if (dup) return NextResponse.json(dup);

    // primary имейлът се синхронизира с Client.contactEmail (обратна съвместимост)
    const primaryEmail = prepared ? prepared.primaryEmail : null;
    const client = await prisma.client.create({
      data: {
        companyId, ...clientData,
        contactEmail: primaryEmail ?? clientData.contactEmail ?? null,
        ...(prepared && prepared.emails.length
          ? { emails: { create: prepared.emails.map(({ id: _id, ...e }) => e) } }
          : {}),
      },
    });

    // ─── Meta: първи създаден клиент ───
    try {
      const total = await prisma.client.count({ where: { companyId } });
      if (total === 1) {
        const { sendMetaEvent, metaContextFromRequest, newEventId } = await import("@/lib/meta");
        const owner = await prisma.companyUser.findFirst({ where: { companyId, role: "owner" }, select: { user: { select: { email: true, name: true } } } });
        await sendMetaEvent({
          eventName: "FirstClientCreated", eventId: newEventId(), actionSource: "system_generated",
          user: { email: owner?.user.email, firstName: owner?.user.name?.split(" ")[0], externalId: companyId, ...metaContextFromRequest(req) },
          custom: { company_id: companyId },
        });
      }
    } catch { /* tracking не бива да чупи */ }

    return NextResponse.json(client);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
