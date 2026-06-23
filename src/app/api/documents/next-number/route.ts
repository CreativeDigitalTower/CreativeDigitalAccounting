import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/session";
import { generateDocumentNumber } from "@/lib/documents";
import { DocumentType } from "@prisma/client";

const VALID: DocumentType[] = ["invoice", "proforma", "quote", "credit_note", "debit_note"];

export async function GET(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const url = new URL(req.url);
    const type = url.searchParams.get("type") as DocumentType;
    if (!VALID.includes(type)) {
      return NextResponse.json({ error: "Невалиден тип." }, { status: 400 });
    }
    const number = await generateDocumentNumber(companyId, type);
    return NextResponse.json({ number });
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}
