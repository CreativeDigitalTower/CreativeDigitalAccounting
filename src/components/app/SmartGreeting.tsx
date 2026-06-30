import Link from "next/link";
import { formatCurrency } from "@/lib/constants";

export type TodayItem = { icon: string; label: string; href: string; count: number; tone?: "warn" | "info" | "ok" };

export function SmartGreeting({ name, items, expectedRevenue, dateLabel }: {
  name: string; items: TodayItem[]; expectedRevenue: number; dateLabel: string;
}) {
  const hour = new Date().getHours();
  const greet = hour < 6 ? "Лека нощ" : hour < 11 ? "Добро утро" : hour < 18 ? "Добър ден" : "Добър вечер";
  const active = items.filter((i) => i.count > 0);

  return (
    <div className="glass panel dash-greeting" style={{ padding: "22px 26px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(15,138,106,.08), transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "0 0 2px" }}>
              {greet}{name ? `, ${name.split(" ")[0]}` : ""} 👋
            </h1>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>{dateLabel}</div>
          </div>
          {expectedRevenue > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Очакван приход (неплатени)</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--emerald-dark)" }}>{formatCurrency(expectedRevenue)}</div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          {active.length === 0 ? (
            <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>Всичко е изчистено за днес. Чудесна работа! ✨</div>
          ) : (
            <>
              <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 10 }}>Днес имате:</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {active.map((i) => (
                  <Link key={i.label} href={i.href} className="today-chip"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 9, padding: "9px 14px", borderRadius: 12, textDecoration: "none",
                      background: i.tone === "warn" ? "rgba(178,59,59,.08)" : i.tone === "ok" ? "rgba(15,138,106,.08)" : "rgba(255,255,255,.6)",
                      border: `1px solid ${i.tone === "warn" ? "rgba(178,59,59,.3)" : "var(--border)"}`,
                      color: "var(--ink)", transition: "transform .15s, box-shadow .15s",
                    }}>
                    <span style={{ fontSize: 18 }}>{i.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: i.tone === "warn" ? "var(--brick)" : "var(--emerald-dark)" }}>{i.count}</span>
                    <span style={{ fontSize: 13 }}>{i.label}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
