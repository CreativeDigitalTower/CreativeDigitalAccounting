import { ToolsTabs } from "@/components/tools/Calculators";

export default function DashboardToolsPage() {
  return (
    <>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>
        Безплатни бизнес инструменти
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 22 }}>
        Полезни калкулатори за ежедневната работа — всичко на едно място.
      </p>
      <ToolsTabs />
    </>
  );
}
