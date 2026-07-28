import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TRASH_RETENTION_DAYS } from "@/lib/constants";

// Автоматично изчистване на Кошчето: окончателно изтрива документи, престояли
// в Кошчето по-дълго от TRASH_RETENTION_DAYS (по подразбиране 90 дни).
// Защита: Authorization: Bearer <CRON_SECRET> или ?key=<CRON_SECRET>.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = req.headers.get("authorization")?.replace("Bearer ", "") || url.searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 86400000);
  const res = await prisma.document.deleteMany({ where: { deletedAt: { not: null, lt: cutoff } } });
  return NextResponse.json({ ok: true, deleted: res.count, retentionDays: TRASH_RETENTION_DAYS });
}
