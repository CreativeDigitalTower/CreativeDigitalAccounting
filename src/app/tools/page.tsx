import Link from "next/link";
import { IconCash, IconInvoice, IconUsers, IconChart, IconCalc } from "@/components/Icons";

const tools = [
  { href: "/tools/currency", Icon: IconCash, title: "Валутен калкулатор", desc: "Конвертиране EUR ↔ BGN по фиксиран курс и други валути." },
  { href: "/tools/salary", Icon: IconUsers, title: "Калкулатор за заплати", desc: "Бруто/нето, осигуровки и данък върху дохода." },
  { href: "/tools/vat", Icon: IconInvoice, title: "ДДС калкулатор", desc: "Изчисляване на ДДС, нето и бруто суми." },
  { href: "/tools/interest", Icon: IconChart, title: "Лихвен калкулатор", desc: "Проста и сложна лихва за избран период." },
  { href: "/tools/markup", Icon: IconCalc, title: "Надценка и печалба", desc: "Изчисляване на надценка, марж и крайна цена." },
];

export default function ToolsHub() {
  return (
    <>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, margin: "0 0 6px" }}>
        Безплатни бизнес инструменти
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 14.5, marginBottom: 28 }}>
        Полезни калкулатори за вашия бизнес — достъпни безплатно за всички регистрирани потребители.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {tools.map((t) => (
          <Link key={t.href} href={t.href} className="glass panel" style={{ padding: "22px 24px", textDecoration: "none", color: "inherit" }}>
            <div className="icon-tile" style={{ marginBottom: 12 }}><t.Icon /></div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 6px" }}>{t.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>{t.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
