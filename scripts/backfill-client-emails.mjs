// Пренася съществуващия Client.contactEmail като основен (primary) структуриран
// адрес в ClientEmail. Идемпотентен: пропуска клиенти, които вече имат адреси.
//
// Употреба:  node scripts/backfill-client-emails.mjs
//
// Безопасно: НЕ променя/трие Client.contactEmail. Само добавя липсващи ClientEmail.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clients = await prisma.client.findMany({
  where: { contactEmail: { not: null } },
  select: { id: true, contactEmail: true, contactPerson: true, _count: { select: { emails: true } } },
});

let created = 0, skipped = 0, invalid = 0;
for (const c of clients) {
  if (c._count.emails > 0) { skipped++; continue; } // вече има структурирани адреси
  const email = (c.contactEmail ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) { invalid++; continue; }
  await prisma.clientEmail.create({
    data: {
      clientId: c.id, email, contactName: c.contactPerson ?? null, type: "primary",
      isPrimary: true, isActive: true,
      receivesInvoices: true, receivesReminders: true, receivesOffers: true, receivesGeneral: true,
    },
  });
  created++;
}

console.log(`Готово. Създадени: ${created}, пропуснати (вече имат адреси): ${skipped}, невалидни/празни: ${invalid}.`);
await prisma.$disconnect();
