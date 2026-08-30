"use client";
import { buildDeclarationText } from "@/lib/logistics/exportDocs";
import { formatInvoiceDate } from "@/lib/logistics/exportDates";

type Party = { name?: string | null; address?: string | null; city?: string | null; country?: string | null; eik?: string | null; registrationNumber?: string | null; vatNumber?: string | null };
export type DeclarationDocData = {
  regulation?: string | null; title?: string | null;
  declarantName?: string | null; bgCompany?: Party;
  proformaNumber?: string | null; proformaDate?: string | null; holcim?: string | null;
  invoiceNumber?: string | null; invoiceDate?: string | null; product?: string | null;
  origin?: string | null; place?: string | null; city?: string | null; date?: string | null; bodyText?: string | null;
  statementText?: string | null;
  representedCompany?: string | null; proformaSupplier?: string | null;
};

// Фиксираният юридически текст (§33, sheet „Декларация" B19/B21/B24-25) — не се перифразира.
const STMT_INTRO = "Декларирам, че:";
const STMT_CUMULATION = "Кумулация не е приложена";
const STMT_OBLIGATION = "Задължавам се, при поискване от митническите власти, да предоставя всички допълнителни документи.";

/**
 * „Декларация" — възпроизвежда 1:1 sheet „Декларация" от SK501(1).xlsx (§30-§39):
 * нормативно основание горе вдясно, центрирано заглавие, наративни абзаци с динамични
 * номера/дати, „Декларирам, че:" + „Кумулация не е приложена" + задължение, място/дата,
 * ред за декларатор. A4 portrait, една страница, с щедро вертикално пространство (§38).
 * Датата тук е DD.MM.YYYY (§35) — независимо от YYYY.MM.DD правилото в Invoice.
 */
export function ExportDeclarationTemplate({ data }: { data: DeclarationDocData }) {
  // Наративните абзаци идват от структурираните променливи (§34); „−" bullet на проформа реда.
  const lines = buildDeclarationText(data).split("\n");
  const placeDate = [data.place, formatInvoiceDate(data.date)].filter(Boolean).join(", ");

  return (
    <div className="printable" style={{ fontFamily: "'Times New Roman', Times, serif", color: "#000", background: "#fff", width: "210mm", minHeight: "297mm", boxSizing: "border-box", padding: "22mm 24mm", fontSize: "13.5pt", lineHeight: 1.7, overflow: "hidden" }}>
      {/* Нормативно основание — горе вдясно (F4). */}
      <div style={{ textAlign: "right", fontSize: "10.5pt", marginBottom: "14mm" }}>{data.regulation ?? "Регламент – EC №2447/2015, Приложение 22-10"}</div>

      {/* Заглавие — центрирано (B8). */}
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: "18pt", letterSpacing: 1, marginBottom: "14mm" }}>{data.title ?? "ДЕКЛАРАЦИЯ"}</div>

      {/* Наративни абзаци (C12-B16). Проформа редът е с „−" и висящ отстъп. */}
      <div style={{ textAlign: "justify" }}>
        {lines.map((ln, i) => {
          const isProforma = ln.startsWith("Проформа");
          return (
            <p key={i} style={{ margin: "0 0 4mm", ...(isProforma ? { paddingLeft: "8mm", textIndent: "-8mm" } : {}) }}>
              {isProforma ? `− ${ln}` : ln}
            </p>
          );
        })}
      </div>

      {/* „Декларирам, че:" + „Кумулация не е приложена" (B19/B21). */}
      <p style={{ margin: "10mm 0 4mm" }}>{STMT_INTRO}</p>
      <p style={{ margin: "0 0 10mm", paddingLeft: "8mm" }}>{STMT_CUMULATION}</p>

      {/* Задължение (B24-25). */}
      <p style={{ margin: "0 0 22mm", textAlign: "justify" }}>{STMT_OBLIGATION}</p>

      {/* Място, дата (B28) — DD.MM.YYYY. */}
      <p style={{ margin: "0 0 16mm" }}>{placeDate}</p>

      {/* Ред за декларатор (B32). */}
      <p style={{ margin: 0 }}>Декларатор : ...................................</p>
    </div>
  );
}
