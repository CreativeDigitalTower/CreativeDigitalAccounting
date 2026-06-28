import { prisma } from "@/lib/prisma";

export type SubEventType = "request" | "payment" | "plan_change" | "status_change" | "trial" | "expiry";

export async function logSubscriptionEvent(
  companyId: string,
  type: SubEventType,
  data: { plan?: string | null; status?: string | null; period?: string | null; amount?: number | null; note?: string | null } = {}
) {
  try {
    await prisma.subscriptionEvent.create({
      data: {
        companyId, type,
        plan: data.plan ?? null, status: data.status ?? null, period: data.period ?? null,
        amount: data.amount ?? null, note: data.note ?? null,
      },
    });
  } catch {
    // не прекъсваме основния поток при проблем с логването
  }
}

export const SUB_EVENT_LABEL: Record<string, string> = {
  request: "Заявка за плащане",
  payment: "Получено плащане",
  plan_change: "Смяна на план",
  status_change: "Промяна на статус",
  trial: "Активиран пробен период",
  expiry: "Изтекъл абонамент → Безплатен",
};
