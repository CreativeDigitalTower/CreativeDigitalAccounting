import Link from "next/link";
import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { saftMissingFields } from "@/lib/saft/generate";
import { SaftPanel } from "@/components/app/SaftPanel";

export const dynamic = "force-dynamic";

const OBLIGATIONS = [
  { title: "Какво е SAF-T", text: "SAF-T (Standard Audit File for Tax) е стандартизиран XML файл с определена от НАП структура, който съдържа счетоводни данни, документи, контрагенти, данъци и активи. Дава на приходната администрация пълна и уеднаквена картина за одит." },
  { title: "Кой е задължен", text: "Задължението се въвежда поетапно — първо за големи предприятия, след това за средни и малки, а накрая за микропредприятия. Проверете към коя група спада фирмата Ви и от коя дата възниква задължението." },
  { title: "Периодичност", text: "Месечно — счетоводни данни и данни за покупки/продажби; годишно — данни за дълготрайните активи; при поискване — складови наличности. Модулът генерира и трите вида." },
  { title: "Срокове", text: "Месечните файлове се подават до определения от закона срок след края на съответния месец. Годишният файл — заедно с годишното приключване. Следете официалните срокове на НАП." },
];

export default async function SaftPage() {
  const { companyId } = await requireFeature("saft");
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, eik: true, address: true, city: true, mol: true, vatRegistered: true, vatNumber: true },
  });
  const missing = company ? saftMissingFields(company) : ["данни за фирмата"];
  const ready = missing.length === 0;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>SAF-T</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Стандартен одитен файл за данъци (Standard Audit File for Tax) — генериране за подаване към НАП.</div>
      </div>

      {/* Готовност на данните */}
      <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 18, borderLeft: `4px solid ${ready ? "var(--emerald)" : "var(--brass)"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: ready ? "var(--emerald-dark)" : "var(--brass)" }}>
            {ready ? "✓ Данните на фирмата са готови за SAF-T" : "Липсват задължителни данни за фирмата"}
          </span>
          {!ready && <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Липсва: {missing.join(", ")}</span>}
          <Link href="/dashboard/settings" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>Профил на фирмата</Link>
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <SaftPanel ready={ready} />
      </div>

      {/* Съдържание на файла */}
      <div className="glass panel" style={{ padding: "18px 22px", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, margin: "0 0 10px" }}>Какво съдържа генерираният файл</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, fontSize: 12.5, color: "var(--ink-soft)" }}>
          {[
            "Header — данни за фирмата, период и софтуер",
            "Сметкоплан (GeneralLedgerAccounts)",
            "Клиенти и Доставчици (контрагенти)",
            "Данъчна таблица (ДДС 20/9/0%)",
            "Продукти и складови артикули",
            "Дълготрайни активи (годишен/при поискване)",
            "Главна книга (GeneralLedgerEntries)",
            "Продажби (SalesInvoices) от фактурите",
            "Покупки (PurchaseInvoices) от разходите",
          ].map((t) => (
            <div key={t} style={{ paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700 }}>✓</span>{t}</div>
          ))}
        </div>
      </div>

      {/* Изисквания и задължения */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 12 }}>
        {OBLIGATIONS.map((o) => (
          <div key={o.title} className="glass panel" style={{ padding: "16px 18px" }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{o.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>{o.text}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 780 }}>
        Файлът се генерира по структурата на SAF-T за България (OECD SAF-T 2.0 / НАП). Преди подаване проверете съответствието спрямо актуалната официална XSD схема на НАП за Вашия отчетен период.
      </p>
    </>
  );
}
