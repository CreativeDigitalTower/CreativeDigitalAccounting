import { requireFeature } from "@/lib/session";
import { TaxReminders } from "@/components/app/TaxReminders";

// Стандартни данъчни срокове (България)
function upcomingStandard() {
  const now = new Date();
  const y = now.getFullYear();
  const items: { title: string; date: Date; law: string }[] = [];

  // Месечни срокове за следващите 3 месеца
  for (let k = 0; k < 3; k++) {
    const base = new Date(y, now.getMonth() + k, 1);
    const my = base.getFullYear(), mm = base.getMonth();
    items.push({ title: "Подаване на справка-декларация по ДДС и VIES + плащане", date: new Date(my, mm, 14), law: "ЗДДС" });
    items.push({ title: "Интрастат декларации", date: new Date(my, mm, 14), law: "Интрастат" });
    items.push({ title: "Авансови вноски по ЗКПО", date: new Date(my, mm, 15), law: "ЗКПО" });
    items.push({ title: "Осигуровки и авансов данък по ЗДДФЛ (за предходния месец)", date: new Date(my, mm, 25), law: "КСО/ЗДДФЛ" });
  }
  // Годишни срокове
  items.push({ title: "Годишна данъчна декларация по чл. 50 ЗДДФЛ (физ. лица/ЕТ)", date: new Date(y, 3, 30), law: "ЗДДФЛ" });
  items.push({ title: "Годишна данъчна декларация по ЗКПО + годишен финансов отчет", date: new Date(y, 5, 30), law: "ЗКПО" });
  items.push({ title: "Деклариране и плащане на данък върху разходите", date: new Date(y, 5, 30), law: "ЗКПО" });
  items.push({ title: "Обявяване на ГФО в Търговския регистър", date: new Date(y, 8, 30), law: "ЗСч" });

  return items.filter((i) => i.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate())).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 14);
}

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
