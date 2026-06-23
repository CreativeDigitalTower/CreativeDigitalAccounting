import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  clientId: z.string().optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
  plannedBudget: z.number().min(0).optional().nullable(),
  deadline: z.string().optional().nullable(),
  progressPercent: z.number().int().min(0).max(100).default(0),
  status: z.enum(["active", "completed", "on_hold", "cancelled"]).default("active"),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("projects");
    const data = schema.parse(await req.json());
    const p = await prisma.project.create({
      data: {
        companyId, name: data.name, clientId: data.clientId ?? null,
        budget: data.budget ?? null, plannedBudget: data.plannedBudget ?? null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        progressPercent: data.progressPercent, status: data.status,
      },
    });
    await audit(companyId, userId, "create", "Project", p.id, data.name);
    return NextResponse.json(p);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
