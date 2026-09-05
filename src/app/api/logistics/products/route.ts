import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { normalizeProductKey } from "@/lib/logistics/normalize";
import { CURRENCIES } from "@/lib/constants";
import { z } from "zod";

const CURRENCY_CODES: string[] = CURRENCIES.map((c) => c.code);

const select = {
  id: true, canonicalName: true, materialCode: true, unit: true, packaging: true,
  category: true, isSystemDefault: true, active: true, notes: true, createdAt: true, updatedAt: true,
  certificateNumber: true, purchasePrice: true, purchaseCurrency: true,
  certificateFileName: true, certificateFileMime: true, certificateUploadedAt: true,
  aliases: { select: { id: true, alias: true } },
} as const;

/** Сериализира продукт: Decimal → number; blob-ът на сертификата не се връща (само метаданни). */
function serialize<T extends { purchasePrice: unknown; certificateFileName: string | null }>(p: T) {
  const { purchasePrice, ...rest } = p;
  return { ...rest, purchasePrice: purchasePrice == null ? null : Number(purchasePrice), hasCertificatePdf: !!p.certificateFileName };
}

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const products = await prisma.logisticsProduct.findMany({
    where: { companyId: g.companyId }, select, orderBy: { canonicalName: "asc" },
  });
  return NextResponse.json(products.map(serialize));
}

const schema = z.object({
  canonicalName: z.string().min(1).max(200),
  materialCode: z.string().max(60).nullable().optional(),
  unit: z.string().min(1).max(20).default("t"),
  packaging: z.string().max(120).nullable().optional(),
  // Вид е ЗАДЪЛЖИТЕЛЕН при създаване (§5) — само насипен/пакетиран, без „Без категория".
  category: z.enum(["bulk", "packaged"], { message: "Изберете вид: Насипен или Пакетиран." }),
  notes: z.string().max(2000).nullable().optional(),
  // Сертификат + покупна цена (§7/§15/§20). Optional; валута по подразбиране EUR.
  certificateNumber: z.string().trim().max(120).nullable().optional(),
  purchasePrice: z.number().min(0).nullable().optional(),
  purchaseCurrency: z.string().refine((c) => CURRENCY_CODES.includes(c), "Невалидна валута.").nullable().optional(),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const normalizedName = normalizeProductKey(d.canonicalName);
    if (!normalizedName) return NextResponse.json({ error: "Невалидно име." }, { status: 400 });
    // Предотвратяване на дубликат (различия във формат → един продукт).
    const existing = await prisma.logisticsProduct.findUnique({
      where: { companyId_normalizedName: { companyId: g.companyId, normalizedName } }, select: { id: true },
    });
    if (existing) return NextResponse.json({ error: "Вече съществува продукт с това наименование." }, { status: 409 });

    const product = await prisma.logisticsProduct.create({
      data: {
        companyId: g.companyId, canonicalName: d.canonicalName, normalizedName,
        materialCode: d.materialCode?.trim() || null, unit: d.unit, packaging: d.packaging ?? null,
        category: d.category, isSystemDefault: false, notes: d.notes ?? null,
        certificateNumber: d.certificateNumber?.trim() || null,
        purchasePrice: d.purchasePrice ?? null,
        purchaseCurrency: d.purchasePrice != null ? (d.purchaseCurrency ?? "EUR") : (d.purchaseCurrency ?? null),
      }, select,
    });
    await audit(g.companyId, g.userId, "create", "LogisticsProduct", product.id, `Продукт „${d.canonicalName}"`);
    return NextResponse.json(serialize(product));
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
