import { requireFeature } from "@/lib/session";
import { TaxReminders } from "@/components/app/TaxReminders";
import { upcomingStandard } from "@/lib/taxCalendar";
import { getT } from "@/lib/i18n/server";

export default async function TaxCalendarPage() {
  await requireFeature("tax_calendar");
  const { t, locale } = await getT();
  const standard = upcomingStandard();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("modules.taxCalendar.title")}</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("modules.taxCalendar.subtitle")}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="glass panel" style={{ padding: "8px 0" }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "12px 16px" }}>{t("modules.taxCalendar.upcomingTitle")}</h3>
          <table>
            <thead><tr><th style={{ paddingLeft: 16 }}>{t("modules.taxCalendar.th.date")}</th><th>{t("modules.taxCalendar.th.obligation")}</th><th>{t("modules.taxCalendar.th.law")}</th></tr></thead>
            <tbody>
              {standard.map((s, i) => {
                const days = Math.round((s.date.getTime() - today.getTime()) / 86400000);
                const soon = days <= 7;
                return (
                  <tr key={i}>
                    <td style={{ paddingLeft: 16, whiteSpace: "nowrap" }}>
                      <span className="num" style={{ fontWeight: 600, color: soon ? "var(--brick)" : "inherit" }}>{s.date.toLocaleDateString(locale)}</span>
                      <div style={{ fontSize: 11, color: soon ? "var(--brick)" : "var(--muted)" }}>{days === 0 ? t("modules.taxCalendar.today") : t("modules.taxCalendar.inDays", { n: days })}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{s.title}</td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{s.law}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: "var(--muted)", padding: "8px 16px 14px" }}>
            {t("modules.taxCalendar.note")}
          </p>
        </div>

        <TaxReminders />
      </div>
    </>
  );
}
