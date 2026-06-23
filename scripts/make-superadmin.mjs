// Прави даден потребител супер админ.
// Употреба:  node scripts/make-superadmin.mjs you@email.com
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const email = process.argv[2];
if (!email) {
  console.error("Употреба: node scripts/make-superadmin.mjs <email>");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const user = await prisma.user.update({
  where: { email },
  data: { isSuperAdmin: true },
}).catch(() => null);

if (!user) {
  console.error(`Потребител с имейл ${email} не е намерен.`);
  process.exit(1);
}

console.log(`✓ ${email} вече е супер админ.`);
await prisma.$disconnect();
