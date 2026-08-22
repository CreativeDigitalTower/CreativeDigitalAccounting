"use client";
import { useEffect, useState } from "react";

type Company = { id: string; name: string; eik: string | null; companyGroupId: string | null; logisticsEnabled: boolean };
type Group = { id: string; name: string };

// Super Admin контрол: активиране на логистичния модул по фирма + управление на
// бизнес групи (BG ↔ MK). Всичко минава през /api/admin/logistics-access.
type FashionCompany = { id: string; name: string; eik: string | null; fashionEnabled: boolean };

export function AdminModuleAccess() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [fashion, setFashion] = useState<FashionCompany[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const [r, rf] = await Promise.all([
      fetch("/api/admin/logistics-access"),
      fetch("/api/admin/fashion-access"),
    ]);
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setCompanies(j.companies ?? []); setGroups(j.groups ?? []); }
    const jf = await rf.json().catch(() => ({}));
    if (rf.ok) setFashion(jf.companies ?? []);
  }
  useEffect(() => { load(); }, []);

  async function postFashion(companyId: string, enabled: boolean) {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/fashion-access", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, enabled }),
    });
    const jf = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? `✅ ${enabled ? "Модно производство активиран." : "Модно производство деактивиран."}` : `⚠️ ${jf.error ?? "Грешка."}`);
    if (r.ok) await load();
  }

  async function post(body: unknown, note: string) {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/logistics-access", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(`⚠️ ${j.error ?? "Грешка."}`); return; }
    // Детайлен резултат за import/fix действията (created/updated/skipped).
    let detail = "";
    if (j.imported) {
      const im = j.imported;
      if (typeof im.created === "number") detail = ` (създадени: ${im.created}, обновени: ${im.updated}, пропуснати: ${im.skipped}${im.errors?.length ? `, грешки: ${im.errors.length}` : ""})`;
      else if (typeof im.carriers === "number") detail = ` (превозвачи: ${im.carriers}, влекачи: ${im.trucks}, конфигурации: ${im.configurations})`;
    } else if (j.fixed) {
      detail = ` (фирми: ${j.fixed.companiesFixed?.length ?? 0}, клиенти: ${j.fixed.clientsFixed?.length ?? 0})`;
    }
    setMsg(`✅ ${note}${detail}`);
    await load();
  }

  const filtered = companies.filter((c) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.eik ?? "").includes(q));
  const groupName = (id: string | null) => id ? (groups.find((g) => g.id === id)?.name ?? id) : "—";

  const th = { textAlign: "left" as const, padding: "8px 10px", color: "var(--muted)", fontSize: 12 };
  const td = { padding: "8px 10px", fontSize: 13, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Модули на фирми</h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
        Индивидуално активиране на модул „Търговия, доставки и логистика" за конкретна фирма.
        Достъпът е database-driven (без промяна на код) и не засяга останалите клиенти.
      </p>

      <div className="glass panel" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Бърза начална настройка (клиент по ЕИК)</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
          Намира фирмата по ЕИК, създава бизнес група (ако няма) и активира логистичния модул.
          Македонската фирма се присъединява по-късно към същата група.
        </div>
        <button className="btn btn-primary btn-sm" disabled={busy}
          onClick={() => post({ action: "setupClient" }, "Клиентът е настроен (група + модул).")}>
          Активирай за ЕИК 109581515
        </button>
      </div>

      {msg && <div style={{ fontSize: 13, marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input placeholder="Търси по име или ЕИК…" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ padding: "7px 10px", fontSize: 13, flex: 1, minWidth: 200 }} />
        <button className="btn btn-ghost btn-sm" disabled={busy}
          onClick={() => { const n = prompt("Име на нова бизнес група:"); if (n) post({ action: "createGroup", name: n }, "Групата е създадена."); }}>
          + Нова група
        </button>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={th}>Фирма</th><th style={th}>ЕИК</th><th style={th}>Група</th>
            <th style={th}>Логистика</th><th style={th}>Действия</th>
          </tr></thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={td}>{c.name}</td>
                <td style={td}>{c.eik ?? "—"}</td>
                <td style={td}>
                  <select value={c.companyGroupId ?? ""} disabled={busy}
                    onChange={(e) => post({ action: "attachGroup", companyId: c.id, groupId: e.target.value || null }, "Групата е обновена.")}
                    style={{ padding: "4px 6px", fontSize: 12.5 }}>
                    <option value="">— без група —</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <span style={{ display: "none" }}>{groupName(c.companyGroupId)}</span>
                </td>
                <td style={td}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", borderRadius: 12, padding: "2px 9px", background: c.logisticsEnabled ? "var(--emerald)" : "var(--muted)" }}>
                    {c.logisticsEnabled ? "Активен" : "Неактивен"}
                  </span>
                </td>
                <td style={td}>
                  <button className="btn btn-ghost btn-sm" disabled={busy}
                    onClick={() => post({ action: "setModule", companyId: c.id, enabled: !c.logisticsEnabled }, c.logisticsEnabled ? "Модулът е деактивиран." : "Модулът е активиран.")}>
                    {c.logisticsEnabled ? "Деактивирай" : "Активирай"}
                  </button>
                  {c.logisticsEnabled && (
                    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", marginLeft: 6 }}>
                      <button className="btn btn-ghost btn-sm" disabled={busy}
                        onClick={() => post({ action: "seedMasterData", companyId: c.id }, "Master data е зареден (idempotent).")}>
                        Зареди master data
                      </button>
                      <button className="btn btn-ghost btn-sm" disabled={busy}
                        onClick={() => post({ action: "importCementFleet", companyId: c.id }, "Автопаркът (цимент) е импортиран (idempotent).")}>
                        Импортирай автопарк
                      </button>
                      {/* Поправя master името SEM INIERNAIIONAL JOUEL → SEM INTERNATIONAL DOOEL */}
                      <button className="btn btn-ghost btn-sm" disabled={busy}
                        onClick={() => post({ action: "fixSemInternationalNames", companyId: c.id }, "Името е коригирано → SEM INTERNATIONAL DOOEL.")}>
                        Поправи име (SEM)
                      </button>
                      {/* Импортира 19-те MK клиента, company-scoped, idempotent */}
                      <button className="btn btn-primary btn-sm" disabled={busy}
                        onClick={() => post({ action: "importMkClients", companyId: c.id }, "MK клиентите са импортирани (idempotent).")}>
                        Импортирай MK клиенти
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Модул „Модно производство" (Fashion Production) — независимо активиране. */}
      <div className="glass panel" style={{ marginTop: 16, overflowX: "auto" }}>
        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>Модул „Модно производство"</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
          Индивидуално активиране на модула за шивашко/модно производство. Database-driven, изолиран по фирма.
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Фирма</th><th style={th}>ЕИК</th><th style={th}>Статус</th><th style={th}>Действие</th></tr></thead>
          <tbody>
            {fashion.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.eik ?? "").includes(q)).map((c) => (
              <tr key={c.id}>
                <td style={td}>{c.name}</td>
                <td style={td}>{c.eik ?? "—"}</td>
                <td style={td}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", borderRadius: 12, padding: "2px 9px", background: c.fashionEnabled ? "var(--emerald)" : "var(--muted)" }}>
                    {c.fashionEnabled ? "Активен" : "Неактивен"}
                  </span>
                </td>
                <td style={td}>
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => postFashion(c.id, !c.fashionEnabled)}>
                    {c.fashionEnabled ? "Деактивирай" : "Активирай"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Поправка: пълен flow за прехвърляне/свързване на фирма към клиент. */}
      <div className="glass panel" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>Прехвърляне / свързване на фирма</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
          Свързва фирма, попаднала в грешен профил, към правилния клиент — без изтриване на данни, с избор на собственик, група и preview.
        </div>
        <a className="btn btn-primary btn-sm" href="/dashboard/admin/company-transfer">Отвори „Прехвърляне на фирма"</a>
      </div>
    </div>
  );
}
