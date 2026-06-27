import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DownloadButtons } from "@/components/app/DownloadButtons";
import { PLATFORM_CREDIT } from "@/lib/constants";

type Product = { name: string; kg: string; batch: string; bestBefore: string };
type Lab = { indicator: string; method: string; result: string };

function parse<T>(s: string | null): T[] {
  try { return s ? JSON.parse(s) : []; } catch { return []; }
}

export default async function DeclarationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("declarations");
  const { id } = await params;
  const [d, company] = await Promise.all([
    prisma.conformityDeclaration.findFirst({ where: { id, companyId } }),
    prisma.company.findUnique({ where: { id: companyId } }),
  ]);
  if (!d) notFound();
  const products = parse<Product>(d.products);
  const labs = parse<Lab>(d.labResults);

  const cell: React.CSSProperties = { border: "1px solid var(--ink)", padding: "5px 8px", fontSize: 12 };
  const th: React.CSSProperties = { ...cell, fontWeight: 700, background: "rgba(0,0,0,.04)", textAlign: "center" };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }} className="no-print">
        <Link href="/dashboard/documents/declarations" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Декларации</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{d.number}</h1>
        <div style={{ marginLeft: "auto" }}><DownloadButtons filename={d.number} /></div>
      </div>

      <div className="glass printable" style={{ borderRadius: 14, maxWidth: 820, padding: "40px 48px", fontSize: 13 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", textAlign: "center", fontSize: 21, fontWeight: 700, margin: "0 0 18px" }}>ДЕКЛАРАЦИЯ ЗА СЪОТВЕТСТВИЕ</h2>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 30, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>ДОСТАВЧИК:</div>
            <div style={{ fontWeight: 600 }}>{company?.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.6 }}>
              {company?.address && <div>{company.address}{company?.city ? `, ${company.city}` : ""}</div>}
              {company?.eik && <div>{company.vatNumber ?? company.eik}</div>}
              {company?.mol && <div>МОЛ: {company.mol}</div>}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>КЛИЕНТ:</div>
            <div style={{ fontWeight: 600 }}>{d.clientName ?? "—"}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.6 }}>
              {d.clientAddress && <div>{d.clientAddress}</div>}
              {d.clientEik && <div>{d.clientEik}</div>}
              {d.clientMol && <div>МОЛ: {d.clientMol}</div>}
            </div>
          </div>
        </div>

        {products.length > 0 && (
          <>
            <div style={{ fontWeight: 600, margin: "8px 0" }}>Декларираме, че следните продукти са годни за консумация:</div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
              <thead><tr><th style={th}>№</th><th style={th}>НАИМЕНОВАНИЕ</th><th style={th}>КГ.</th><th style={th}>ПАРТИДА НОМЕР</th><th style={th}>НАЙ-ДОБЪР ДО</th></tr></thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={i}>
                    <td style={{ ...cell, textAlign: "center" }}>{i + 1}.</td>
                    <td style={cell}>{p.name}</td>
                    <td style={{ ...cell, textAlign: "right" }}>{p.kg}</td>
                    <td style={{ ...cell, textAlign: "center" }}>{p.batch}</td>
                    <td style={{ ...cell, textAlign: "center" }}>{p.bestBefore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {d.declarationText && <p style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 16 }}>{d.declarationText}</p>}

        {labs.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
            <thead><tr><th style={th}>№</th><th style={th}>НАИМЕНОВАНИЕ НА ПОКАЗАТЕЛЯ</th><th style={th}>МЕТОД НА ИЗПИТВАНЕ</th><th style={th}>РЕЗУЛТАТИ</th></tr></thead>
            <tbody>
              {labs.map((l, i) => (
                <tr key={i}>
                  <td style={{ ...cell, textAlign: "center" }}>{i + 1}.</td>
                  <td style={cell}>{l.indicator}</td>
                  <td style={cell}>{l.method}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{l.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {d.storageNote && <p style={{ fontSize: 12.5, marginBottom: 8 }}>{d.storageNote}</p>}
        {d.standards && <p style={{ fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 8 }}>{d.standards}</p>}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36, fontSize: 12.5 }}>
          <div>Дата: {new Date(d.date).toLocaleDateString("bg-BG")}</div>
          <div>Изготвил (подпис, дата и печат): {d.signedBy ?? company?.mol ?? "................"}</div>
        </div>

        <div style={{ marginTop: 28, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 10.5, color: "var(--muted)", textAlign: "center" }}>
          {PLATFORM_CREDIT}
        </div>
      </div>
    </>
  );
}
