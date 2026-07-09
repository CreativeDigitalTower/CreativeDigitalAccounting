import { NextResponse } from "next/server";
import { requireCompany, getPlan } from "@/lib/session";
import { planHasFeature } from "@/lib/constants";
import { buildSaftXml, type SaftType } from "@/lib/saft/generate";

export async function GET(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const plan = await getPlan(companyId);
    if (!planHasFeature(plan, "saft")) {
      return NextResponse.json({ error: "SAF-T е достъпен в план Бизнес и Про." }, { status: 403 });
    }

    const url = new URL(req.url);
    const year = parseInt(url.searchParams.get("year") ?? "", 10);
    const monthRaw = url.searchParams.get("month");
    const type = (url.searchParams.get("type") ?? "monthly") as SaftType;
    if (!year || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Невалидна година." }, { status: 400 });
    }
    const month = type === "monthly" ? parseInt(monthRaw ?? "", 10) : null;
    if (type === "monthly" && (!month || month < 1 || month > 12)) {
      return NextResponse.json({ error: "Невалиден месец." }, { status: 400 });
    }

    const { xml, filename } = await buildSaftXml(companyId, { year, month, type });
    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("saft", e);
    return NextResponse.json({ error: "Грешка при генериране на SAF-T файла." }, { status: 500 });
  }
}
