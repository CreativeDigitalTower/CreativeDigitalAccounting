import Link from "next/link";
import { IconCash, IconInvoice, IconUsers, IconChart, IconCalc } from "@/components/Icons";
import { getT } from "@/lib/i18n/server";

const tools = [
  { href: "/tools/currency", Icon: IconCash, key: "currency" },
  { href: "/tools/salary", Icon: IconUsers, key: "salary" },
  { href: "/tools/vat", Icon: IconInvoice, key: "vat" },
  { href: "/tools/interest", Icon: IconChart, key: "interest" },
  { href: "/tools/markup", Icon: IconCalc, key: "markup" },
];

export default async function ToolsHub() {
  const { t } = await getT();
  return (
    <>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, margin: "0 0 6px" }}>
        {t("tools.hubTitle")}
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 14.5, marginBottom: 28 }}>
        {t("tools.hubSubtitle")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="glass panel" style={{ padding: "22px 24px", textDecoration: "none", color: "inherit" }}>
            <div className="icon-tile" style={{ marginBottom: 12 }}><tool.Icon /></div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 6px" }}>{t(`tools.${tool.key}.name`)}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>{t(`tools.${tool.key}.desc`)}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
