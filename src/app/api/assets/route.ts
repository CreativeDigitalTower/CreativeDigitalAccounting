import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  acquiredDate: z.string(),
  value: z.number().min(0),
  annualDepreciation: z.number().min(0).default(0),
  warrantyUntil: z.string().optional().nullable(),
  insuranceUntil: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("assets");
    const data = schema.parse(await req.json());
    const a = await prisma.asset.create({
      data: {
        companyId, name: data.name, category: data.category,
        acquiredDate: new Date(data.acquiredDate), value: data.value,
        annualDepreciation: data.annualDepreciation, bookValue: data.value,
        warrantyUntil: data.warrantyUntil ? new Date(data.warrantyUntil) : null,
        insuranceUntil: data.insuranceUntil ? new Date(data.insuranceUntil) : null,
      },
    });
    await audit(companyId, userId, "create", "Asset", a.id, data.name);
    return NextResponse.json(a);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
