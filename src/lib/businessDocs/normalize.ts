// ─────────────────────────────────────────────────────────────────────────
// Нормативен нормализатор — гарантира задължителните реквизити на НОВите
// документи, без да пипа отделните ~100 шаблона. Прилага се при генериране
// (buildDocumentHtml). Вече генерираните документи са snapshot-и → не се влияят.
//
//   • Официалните документи носят издателски реквизит (име + ЕИК [+ ДДС]).
//   • Декларациите носят клауза за наказателна отговорност (чл. 313 НК).
// ─────────────────────────────────────────────────────────────────────────

// „Официални" категории, за които издателският ЕИК е задължителен реквизит.
// Вътрешните/аналитичните (analysis, marketing, policies, iso, correspondence)
// не са официални изходящи документи и се изключват.
export const OFFICIAL_CATEGORIES = new Set([
  "contracts", "hr", "clients", "suppliers", "protocols", "acceptance",
  "declarations", "forms", "letters", "finance", "company", "legal", "bank",
  "vehicles", "construction", "inventory", "gdpr",
]);

export function isOfficialCategory(categoryId: string): boolean {
  return OFFICIAL_CATEGORIES.has(categoryId);
}

type NormalizeMeta = { companyName?: string | null; companyEik?: string | null; companyVat?: string | null; categoryId: string; title: string };

function issuerLine(name: string, eik: string, vat?: string | null): string {
  return `<p style="margin:0 0 10px;font-size:12px;color:#444;">Издател: <strong>${name}</strong>, ЕИК ${eik}${vat ? `, ДДС № ${vat}` : ""}</p>`;
}

const DECLARATION_CLAUSE =
  `<p style="margin:14px 0 0;font-size:12.5px;">Известна ми е наказателната отговорност по чл. 313 от Наказателния кодекс за деклариране на неверни данни.</p>`;

const isDeclaration = (m: NormalizeMeta) => m.categoryId === "declarations" || /деклара[цт]/i.test(m.title);

/**
 * Добавя липсващите задължителни реквизити към готовия HTML на документа.
 * Идемпотентно: не дублира вече наличен ЕИК/клауза.
 */
export function normalizeBusinessDoc(html: string, meta: NormalizeMeta): string {
  let out = html;

  // 1) Издателски реквизит (ЕИК) за официалните документи, ако липсва.
  const eik = (meta.companyEik ?? "").trim();
  const name = (meta.companyName ?? "").trim();
  if (isOfficialCategory(meta.categoryId) && eik && name && !out.includes(eik)) {
    const line = issuerLine(name, eik, meta.companyVat ?? undefined);
    const i = out.indexOf("</h1>");
    out = i >= 0 ? out.slice(0, i + 5) + line + out.slice(i + 5) : line + out;
  }

  // 2) Клауза за наказателна отговорност (чл. 313 НК) за декларации, ако липсва.
  if (isDeclaration(meta) && !(out.includes("313") || /наказателна отговорност/i.test(out))) {
    // Опитваме да я поставим преди блока с подписи; иначе — в края.
    const markers = ['<table style="width:100%;margin-top:48px', '<p style="margin-top:40px', '<p style="margin-top:36px'];
    let placed = false;
    for (const mk of markers) {
      const idx = out.indexOf(mk);
      if (idx >= 0) { out = out.slice(0, idx) + DECLARATION_CLAUSE + out.slice(idx); placed = true; break; }
    }
    if (!placed) out = out + DECLARATION_CLAUSE;
  }

  return out;
}
