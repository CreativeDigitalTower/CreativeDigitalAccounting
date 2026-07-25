import { DDD_COLUMNS, DDD_ROWS, DDD_PESTS, cellKey, type DddColId, type DddData } from "@/lib/dddProtocol";

type Protocol = {
  number: string; date: Date | string; kind: string;
  counterpartyName: string | null; counterpartyEik: string | null; counterpartyAddress: string | null; counterpartyMol: string | null;
  items: string | null; activity: string | null; period: string | null; description: string | null;
  data: unknown;
};
type Company = { name: string; eik: string | null; address: string | null; city: string | null };

const fmtDate = (d: Date | string, locale: string) => new Date(d).toLocaleDateString(locale);

// ─── Приемо-предавателен протокол (по образец) ───
export function HandoverDoc({ p, company, locale }: { p: Protocol; company: Company; locale: string }) {
  const date = fmtDate(p.date, locale);
  const activity = p.activity || p.items || "";
  const forwarder = p.counterpartyName || "................";
  const executor = company.name;
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--ink)" }}>
      <div style={{ textAlign: "center", fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, marginBottom: 18 }}>ПРИЕМО-ПРЕДАВАТЕЛЕН ПРОТОКОЛ</div>
      <div style={{ marginBottom: 14 }}>Изх.№: {p.number} / {date} г.</div>
      <div><strong>Възложител:</strong> {forwarder}</div>
      <div><strong>Изпълнител:</strong> {executor}</div>
      {activity && <div><strong>Дейност:</strong> {activity}</div>}
      <p style={{ marginTop: 16 }}>Днес, {date} г., долуподписаните представители на:</p>
      <div>Възложителя: - {forwarder}</div>
      <div>и</div>
      <div>Изпълнителя: - {executor}</div>
      <p>съставиха настоящия Приемо-предавателен протокол, в уверение на това, че е извършено {activity || "................"}{p.period ? ` за период – ${p.period}` : ""}.</p>
      <p>Всички дейности са извършени в срок, с добро качество, съгласно нормативните и договорни изисквания.</p>
      <p>Забележки: {p.description || "______________________________________________________________________"}</p>
      <p>Настоящият Приемо-предавателен протокол е изготвен и подписан в 2 (два) еднообразни екземпляра – по един за всяка от Страните.</p>
      <div style={{ display: "flex", gap: 24, marginTop: 42 }}>
        <div style={{ flex: 1 }}>ЗА ВЪЗЛОЖИТЕЛЯ:<div style={{ borderTop: "1px solid var(--ink)", marginTop: 34 }} /></div>
        <div style={{ flex: 1 }}>ЗА ИЗПЪЛНИТЕЛЯ:<div style={{ borderTop: "1px solid var(--ink)", marginTop: 34 }} /></div>
      </div>
    </div>
  );
}

// ─── Протокол за ДДД обработка (Наредба №1 на МЗ) ───
export function DddDoc({ p, locale }: { p: Protocol; locale: string }) {
  const d = (p.data ?? {}) as DddData;
  const cells = d.cells ?? {};
  const pests = d.pests ?? {};
  const cellV = (rowId: string, col: DddColId) => cells[cellKey(rowId, col)] ?? "";
  const td: React.CSSProperties = { border: "1px solid #999", padding: "4px 6px", fontSize: 10.5, verticalAlign: "top" };
  const check = (col: DddColId, opt: string) => (pests[col] ?? []).includes(opt);

  return (
    <div style={{ fontSize: 11, color: "var(--ink)" }}>
      <div style={{ textAlign: "center", fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
        Протокол за ДДД обработка съгласно Наредба №1 на МЗ от 05.01.2018 г.
      </div>

      {/* Заявител / Обект */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ ...td, width: "50%" }}><strong>Данни за заявителя на извършената ДДД обработка</strong></td>
            <td style={{ ...td, width: "50%" }}><strong>Данни за обекта, в който е извършена ДДД обработката</strong></td>
          </tr>
          <tr>
            <td style={td}>
              <div>Име: {d.applicant?.name ?? ""}</div>
              <div>ЕИК: {d.applicant?.eik ?? ""}</div>
              <div>Адрес: {d.applicant?.address ?? ""}</div>
              <div>Мобилен: {d.applicant?.mobile ?? ""}</div>
            </td>
            <td style={td}>
              <div>Име: {d.object?.name ?? ""}</div>
              <div>Лице за контакт: {d.object?.contact ?? ""}</div>
              <div>Адрес: {d.object?.address ?? ""}</div>
            </td>
          </tr>
          <tr>
            <td style={td} colSpan={2}>
              Обработката е по: &nbsp; еднократна заявка [{d.basis === "single" ? "ДА" : "  "}] &nbsp;&nbsp; дългосрочен договор [{d.basis === "contract" ? "ДА" : "  "}]
            </td>
          </tr>
        </tbody>
      </table>

      {/* Основна таблица */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <td style={{ ...td, fontWeight: 700, width: 28 }}>№</td>
            <td style={{ ...td, fontWeight: 700 }}>Данни за извършените в обекта ДДД обработки</td>
            {DDD_COLUMNS.map((c) => <td key={c.id} style={{ ...td, fontWeight: 700 }}>{c.label}</td>)}
          </tr>
        </thead>
        <tbody>
          {/* Ред 1 — вредители */}
          <tr>
            <td style={td}>1.</td>
            <td style={td}>Вид на вредителите, срещу които е извършена обработката/спектър на действие при дезинфектантите</td>
            {DDD_COLUMNS.map((c) => (
              <td key={c.id} style={td}>
                {DDD_PESTS[c.id].map((opt) => <div key={opt}>[{check(c.id, opt) ? "v" : " "}] {opt}</div>)}
              </td>
            ))}
          </tr>
          {DDD_ROWS.map((r) => (
            <tr key={r.id}>
              <td style={td}>{r.no}</td>
              <td style={{ ...td, paddingLeft: r.sub ? 14 : 6 }}>{r.label}</td>
              {DDD_COLUMNS.map((c) => (
                <td key={c.id} style={td}>{r.cols.includes(c.id) ? cellV(r.id, c.id) : ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Футър */}
      <div style={{ marginTop: 14, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span>Протоколът е подготвен от: {d.footer?.preparedBy ?? ""}</span>
          <span>Заверка: {d.footer?.certification ?? ""}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span>Обработката е извършена от: {d.footer?.performedBy ?? ""}</span>
          <span>Месец на изпълнение: {d.footer?.executionMonth ?? ""}</span>
        </div>
        <div>Подпис на заявителя на обработката или на упълномощено от него лице: ____________________</div>
      </div>
    </div>
  );
}
