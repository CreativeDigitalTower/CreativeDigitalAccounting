import { requireFeature } from "@/lib/session";
import { TaxReminders } from "@/components/app/TaxReminders";
import { upcomingStandard } from "@/lib/taxCalendar";

export default async function TaxCalendarPage() {
  await requireFeature("tax_calendar");
  const standard = upcomingStandard();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Данъчен и осигурителен календар</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Срокове по ЗДДС, ЗКПО, ЗДДФЛ, КСО и собствени напомняния</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="glass panel" style={{ padding: "8px 0" }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "12px 16px" }}>Предстоящи законови срокове</h3>
          <table>
            <thead><tr><th style={{ paddingLeft: 16 }}>Срок</th><th>Задължение</th><th>Закон</th></tr></thead>
            <tbody>
              {standard.map((s, i) => {
                const days = Math.round((s.date.getTime() - today.getTime()) / 86400000);
                const soon = days <= 7;
                return (
                  <tr key={i}>
                    <td style={{ paddingLeft: 16, whiteSpace: "nowrap" }}>
                      <span className="num" style={{ fontWeight: 600, color: soon ? "var(--brick)" : "inherit" }}>{s.date.toLocaleDateString("bg-BG")}</span>
                      <div style={{ fontSize: 11, color: soon ? "var(--brick)" : "var(--muted)" }}>{days === 0 ? "днес" : `след ${days} дни`}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{s.title}</td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{s.law}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: "var(--muted)", padding: "8px 16px 14px" }}>
            Сроковете са ориентировъчни; при изпадане в неработен ден се местят на следващия работен ден. Проверявайте официалните публикации на НАП.
          </p>
        </div>

        <TaxReminders />
      </div>
    </>
  );
}
