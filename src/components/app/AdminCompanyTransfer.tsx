"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchableSelect } from "@/components/app/logistics/SearchableSelect";

type Company = { id: string; name: string; eik: string | null; registrationNumber: string | null; companyGroupId: string | null };
type Group = { id: string; name: string };
type Member = { userId: string; name: string | null; email: string; role: string };
type Detail = { id: string; name: string; companyGroupId: string | null; groupName: string | null; members: Member[] };

export function AdminCompanyTransfer() {
  const sp = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sourceId, setSourceId] = useState(sp.get("source") ?? "");
  const [targetId, setTargetId] = useState("");
  const [source, setSource] = useState<Detail | null>(null);
  const [target, setTarget] = useState<Detail | null>(null);
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [groupId, setGroupId] = useState<string>("");        // "" = не пипай
  const [removeUserId, setRemoveUserId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => { fetch("/api/admin/company-transfer?list=1").then((r) => r.ok ? r.json() : null).then((j) => { if (j) { setCompanies(j.companies ?? []); setGroups(j.groups ?? []); } }); }, []);
  useEffect(() => { if (!sourceId) { setSource(null); return; } fetch(`/api/admin/company-transfer?companyId=${sourceId}`).then((r) => r.ok ? r.json() : null).then((d) => { setSource(d); setRemoveUserId(d?.members?.[0]?.userId ?? ""); }); }, [sourceId]);
  useEffect(() => {
    if (!targetId) { setTarget(null); return; }
    fetch(`/api/admin/company-transfer?targetCompanyId=${targetId}`).then((r) => r.ok ? r.json() : null).then((d: Detail | null) => {
      setTarget(d);
      setGroupId(d?.companyGroupId ?? "");                        // default: групата на target
      const owner = d?.members.find((m) => m.role === "owner");   // default: owner-ът на target
      setOwnerIds(owner ? [owner.userId] : []);
    });
  }, [targetId]);

  const companyLabel = (c: Company) => `${c.name}${c.eik ? ` · ${c.eik}` : c.registrationNumber ? ` · ${c.registrationNumber}` : ""}`;
  const groupName = (id: string | null) => id ? (groups.find((g) => g.id === id)?.name ?? id) : "—";
  const canApply = useMemo(() => !!sourceId && ownerIds.length > 0, [sourceId, ownerIds]);

  function toggleOwner(uid: string) {
    setOwnerIds((p) => p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]);
  }

  async function apply() {
    setBusy(true); setMsg("");
    const body: Record<string, unknown> = { companyId: sourceId, addOwnerUserIds: ownerIds };
    if (targetId) body.targetCompanyId = targetId;
    if (groupId) body.setGroupId = groupId;
    if (removeUserId && !ownerIds.includes(removeUserId)) body.removeUserId = removeUserId;
    const r = await fetch("/api/admin/company-transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setDone(true); setMsg(`✅ Приложено: ${(j.changes ?? []).join(", ")}`); fetch(`/api/admin/company-transfer?companyId=${sourceId}`).then((x) => x.ok ? x.json() : null).then(setSource); }
    else setMsg(`⚠️ ${j.error ?? "Грешка."}`);
  }

  const inp = { padding: "6px 9px", fontSize: 13 } as const;
  const panel = { marginBottom: 14 } as const;
  const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <div className="glass panel" style={panel}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Стъпка {n} — {title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Прехвърляне на фирма</h1>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>
        Свързва съществуваща фирма към правилния клиентски контекст — без създаване на нов Company record и без изтриване на данни. Атомарно; последният собственик е защитен.
      </p>

      <Step n={1} title="Фирма за прехвърляне">
        <SearchableSelect options={companies.map((c) => ({ value: c.id, label: companyLabel(c), keywords: c.eik ?? "" }))} value={sourceId} onChange={(v) => { setSourceId(v); setDone(false); }} placeholder="Търси фирма…" allowEmpty={false} />
        {source && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Текущи членове: {source.members.map((m) => `${m.email} (${m.role})`).join(", ") || "—"} · група: {groupName(source.companyGroupId)}</div>}
      </Step>

      <Step n={2} title="Към кой клиент">
        <SearchableSelect options={companies.filter((c) => c.id !== sourceId).map((c) => ({ value: c.id, label: companyLabel(c), keywords: c.eik ?? "" }))} value={targetId} onChange={setTargetId} placeholder="Търси клиентска фирма…" allowEmpty={false} />
      </Step>

      {target && (
        <>
          <Step n={3} title="Бизнес група">
            <select style={{ ...inp, width: "100%" }} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">— не променяй групата —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}{g.id === target.companyGroupId ? " (групата на клиента)" : ""}</option>)}
            </select>
            {!target.companyGroupId && <div style={{ fontSize: 11.5, color: "var(--brass)", marginTop: 4 }}>Клиентът още няма бизнес група — създайте я през „Модули" при нужда.</div>}
          </Step>

          <Step n={4} title="Достъп (поне един собственик)">
            {target.members.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Клиентът няма потребители.</div> :
              target.members.map((m) => (
                <label key={m.userId} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, padding: "3px 0" }}>
                  <input type="checkbox" checked={ownerIds.includes(m.userId)} onChange={() => toggleOwner(m.userId)} />
                  <span>{m.name ?? "—"} · {m.email} · {m.role}</span>
                </label>
              ))}
          </Step>

          <Step n={5} title="Преглед">
            <div style={{ fontSize: 12.5, lineHeight: 1.9 }}>
              <div>Фирма: <strong>{source?.name ?? "—"}</strong> <span style={{ color: "var(--muted)" }}>(ID запазен, данните не се трият)</span></div>
              <div>Текущ (грешен) член: <strong>{source?.members.map((m) => m.email).join(", ") || "—"}</strong></div>
              <div>Целеви клиент: <strong>{target.name}</strong></div>
              <div>Бизнес група: <strong>{groupId ? groupName(groupId) : "без промяна"}</strong></div>
              <div>Нов(и) собственик(ци): <strong>{ownerIds.map((id) => target.members.find((m) => m.userId === id)?.email ?? id).join(", ") || "—"}</strong></div>
              <div>Стар relation: {source && (
                <select style={{ ...inp, marginLeft: 6 }} value={removeUserId} onChange={(e) => setRemoveUserId(e.target.value)}>
                  <option value="">— не премахвай —</option>
                  {source.members.map((m) => <option key={m.userId} value={m.userId}>Премахни {m.email}</option>)}
                </select>
              )}</div>
            </div>
            {!canApply && <div style={{ fontSize: 12, color: "var(--brick)", marginTop: 6 }}>Изберете поне един собственик.</div>}
            <button className="btn btn-primary btn-sm" disabled={busy || !canApply} onClick={apply} style={{ marginTop: 10 }}>{busy ? "Прилагане…" : "Приложи прехвърлянето"}</button>
          </Step>
        </>
      )}

      {msg && <div style={{ fontSize: 13, marginTop: 4 }}>{msg}{done && " — готово."}</div>}
    </div>
  );
}
