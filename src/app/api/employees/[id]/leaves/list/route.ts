import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id } = await params;
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp || emp.companyId !== companyId) return NextResponse.json([], { status: 200 });
    const leaves = await prisma.employeeLeave.findMany({ where: { employeeId: id }, orderBy: { startDate: "desc" } });
    return NextResponse.json(leaves);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
