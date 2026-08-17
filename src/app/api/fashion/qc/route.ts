import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";

// GET ?orderId=… → QC минаванията + дефектите + текущите броеве на поръчката.
// Без orderId → обзор на поръчките за QC (в статус qc/finishing/ready).
export async function GET(req: Request) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const orderId = new URL(req.url).searchParams.get("orderId") || undefined;

  if (!orderId) {
    const orders = await prisma.fashionProductionOrder.findMany({
      where: { companyId: g.companyId },
      include: { style: { select: { code: true, name: true } }, lines: { select: { cutQuantity: true } } },
      orderBy: { createdAt: "desc" }, take: 1000,
    });
    return NextResponse.json(orders.map((o) => ({
      id: o.id, code: o.code, status: o.status, styleCode: o.style.code, styleName: o.style.name, color: o.color,
      cut: o.lines.reduce((s, l) => s + l.cutQuantity, 0), qtyGood: o.qtyGood, qtyDefective: o.qtyDefective, qtyRepair: o.qtyRepair, qtyReady: o.qtyReady,
    })));
  }

  const order = await prisma.fashionProductionOrder.findFirst({
    where: { id: orderId, companyId: g.companyId },
    include: {
      style: { select: { code: true, name: true } }, lines: { orderBy: { size: "asc" } },
      qcRecords: { orderBy: { createdAt: "desc" } }, defects: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  const cut = order.lines.reduce((s, l) => s + l.cutQuantity, 0);
  return NextResponse.json({ ...order, cut });
}
