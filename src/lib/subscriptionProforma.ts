import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { COMPANY_EIK, planLabel, type PlanId } from "@/lib/constants";
import { generateDocumentNumber } from "@/lib/documents";

/**
 * Автоматично генерира проформа фактура за избран абонамент.
 * Издател: платформената фирма (Криейтив Диджитъл Тауър ЕООД, по ЕИК COMPANY_EIK).
 * Получател: фирмата на клиента (пълни данни), заведена като клиент в CRM на платформата.
 *
 * Документът се завежда едновременно:
 *   • при платформата (изходящ документ в нейния списък с документи), и
 *   • при клиента (входящ документ + известие), чрез recipientCompanyId.
 *
 * Връща публичния токен и номера за сваляне, или null ако не може да се генерира.
 */
export async function generateSubscriptionProforma(opts: {
  clientCompanyId: string;
  plan: PlanId;
  periodLabel: string;
  amount: number; // нето сума (както е показана при избора на план)
}): Promise<{ token: string; number: string; documentId: string } | null> {
  const { clientCompanyId, plan, periodLabel, amount } = opts;
  if (!amount || amount <= 0) return null;

  // Платформената фирма (издател)
  const platform = await prisma.company.findFirst({ where: { eik: COMPANY_EIK } });
  if (!platform || platform.id === clientCompanyId) return null;

  // Данни на клиента (получател)
  const client = await prisma.company.findUnique({
    where: { id: clientCompanyId },
    select: { id: true, name: true, eik: true, vatNumber: true, vatRegistered: true, address: true, city: true, mol: true, email: true, phone: true },
  });
  if (!client) return null;

  // Намираме или създаваме клиента в CRM на платформата (по ЕИК, иначе по име)
  let crmClient = await prisma.client.findFirst({
    where: { companyId: platform.id, ...(client.eik ? { eik: client.eik } : { name: client.name }) },
    select: { id: true },
  });
  if (!crmClient) {
    crmClient = await prisma.client.create({
      data: {
        companyId: platform.id, name: client.name, eik: client.eik ?? null,
        vatNumber: client.vatNumber ?? null, address: client.address ?? null, city: client.city ?? null,
        mol: client.mol ?? null, contactEmail: client.email ?? null, phone: client.phone ?? null,
      },
      select: { id: true },
    });
  }

  const number = await generateDocumentNumber(platform.id, "proforma");
  const token = randomUUID();

  // Сумата, показана при избора, е нето (без ДДС). Ако платформата е регистрирана
  // по ДДС — включваме 20% така, че крайната сума да съвпадне с показаната.
  const vatRate = platform.vatRegistered ? 20 : 0;
  const unitPrice = platform.vatRegistered ? +(amount / 1.2).toFixed(2) : amount;
  const lineTotal = +(unitPrice * (1 + vatRate / 100)).toFixed(2);

  const now = new Date();
  const due = new Date(now); due.setDate(due.getDate() + 7);

  const doc = await prisma.document.create({
    data: {
      companyId: platform.id,
      type: "proforma",
      number,
      clientId: crmClient.id,
      issueDate: now,
      dueDate: due,
      currency: "EUR",
      language: "bg",
      template: platform.invoiceTemplate ?? "classic",
      paymentMethod: "bank_transfer",
      status: "sent",
      notes: `Абонамент ${planLabel(plan)} — ${periodLabel}. Проформата е генерирана автоматично при избор на абонамент. Плащане по банков път; фактура ще бъде издадена веднага след получаване на превода.`,
      vatExempt: !platform.vatRegistered,
      vatExemptReason: platform.vatRegistered ? null : "art113_9",
      publicToken: token,
      recipientCompanyId: client.id,
      sentToClientAt: now,
      lines: {
        create: [{
          description: `Абонамент Creative Digital Accounting — ${planLabel(plan)} (${periodLabel})`,
          quantity: 1, unitPrice, vatRate, lineTotal,
        }],
      },
    },
    select: { id: true },
  });

  // Известие към клиента (освен входящия документ по recipientCompanyId)
  await prisma.notification.create({
    data: {
      companyId: client.id, type: "incoming_document",
      title: `Проформа фактура за абонамент ${planLabel(plan)}`,
      body: `${platform.name} Ви издаде проформа № ${number} за избрания абонамент. Можете да я прегледате и платите по банков път.`,
      link: `/dashboard/inbox/${doc.id}`,
    },
  });

  return { token, number, documentId: doc.id };
}
