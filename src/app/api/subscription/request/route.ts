import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/session";
import { logSubscriptionEvent } from "@/lib/subscriptionEvents";
import { z } from "zod";

const schema = z.object({
  plan: z.enum(["start", "business", "pro"]),
  period: z.string().optional(),
  amount: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const { plan, period, amount } = schema.parse(await req.json());
    await logSubscriptionEvent(companyId, "request", { plan, period: period ?? null, amount: amount ?? null, note: "Клиентът избра план за плащане по банков път" });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
