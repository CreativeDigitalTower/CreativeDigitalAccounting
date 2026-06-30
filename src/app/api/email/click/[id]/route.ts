import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const target = url.searchParams.get("u") || "/";
  try {
    await prisma.emailLog.update({
      where: { id },
      data: { clicksCount: { increment: 1 }, clickedAt: new Date(), openedAt: new Date() },
    });
  } catch {}
  // only allow http(s) redirects
  const safe = /^https?:\/\//i.test(target) ? target : "/";
  return NextResponse.redirect(safe);
}
