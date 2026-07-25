"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { DDD_COLUMNS, DDD_ROWS, DDD_PESTS, cellKey, type DddColId, type DddData } from "@/lib/dddProtocol";

type Client = { id: string; name: string; address: string | null; city: string | null; contactPerson: string | null };

export function DddProtocolForm() {
  const t = useT();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [number, setNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [applicant, setApplicant] = useState({ name: "", eik: "", address: "", mobile: "" });
  const [objectId, setObjectId] = useState("");
  const [obj, setObj] = useState({ name: "", contact: "", address: "" });
  const [basis, setBasis] = useState<"single" | "contract">("single");
  const [pests, setPests] = useState<Record<DddColId, string[]>>({ dez: [], derat: [], dezinf: [] });
  const [cells, setCells] = useState<Record<string, string>>({});
  const [footer, setFooter] = useState({ preparedBy: "", certification: "", performedBy: "", executionMonth: "" });

  // Авто-попълване: заявител = собствената фирма
  useEffect(() => {
    fetch("/api/company").then((r) => r.json()).then((c) => {
      if (c) setApplicant({ name: c.name ?? "", eik: c.eik ?? "", address: [c.address, c.city].filter(Boolean).join(", "), mobile: c.phone ?? "" });
    }).catch(() => {});
    fetch("/api/clients").then((r) => r.json()).then((d) => setClients(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  function pickObject(id: string) {
    setObjectId(id);
    const c = clients.find((x) => x.id === id);
    if (c) setObj({ name: c.name, contact: c.contactPerson ?? "", address: [c.address, c.city].filter(Boolean).join(", ") });
  }
  const togglePest = (col: DddColId, p: string) => setPests((prev) => ({ ...prev, [col]: prev[col].includes(p) ? prev[col].filter((x) => x !== p) : [...prev[col], p] }));
  const setCell = (k: string, v: string) => setCells((prev) => ({ ...prev, [k]: v }));

  async function submit() {
    setSaving(true); setError("");
    const data: DddData = { applicant, object: obj, basis, pests, cells, footer };
    const res = await fetch("/api/handover-protocols", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "ddd", number: number || undefined, date,
        counterpartyId: objectId || null, counterpartyName: obj.name || null,
        counterpartyAddress: obj.address || null, data,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/documents/protocols");
    else setError((await res.json().catch(() => ({}))).error ?? t("subdocs.prot.form.errSave"));
  }

  const inp: React.CSSProperties = { padding: "5px 7px", fontSize: 12, width: "100%" };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <Link href="/dashboard/documents/protocols/new" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("subdocs.prot.form.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{t("subdocs.prot.ddd.formTitle")}</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* Основни */}
      <div className="glass panel" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
          <div><label>{t("subdocs.prot.form.number")}</label><input value={number} onChange={(e) => setNumber(e.target.value)} placeholder={t("subdocs.prot.form.numberPh")} /></div>
          <div><label>{t("subdocs.prot.form.date")}</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
      </div>

      {/* Заявител (собствена фирма) + Обект (клиент) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="glass panel" style={{ padding: 20 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 12px" }}>{t("subdocs.prot.ddd.applicant")}</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <div><label>{t("subdocs.prot.form.name")}</label><input value={applicant.name} onChange={(e) => setApplicant({ ...applicant, name: e.target.value })} /></div>
            <div><label>{t("subdocs.prot.form.eik")}</label><input value={applicant.eik} onChange={(e) => setApplicant({ ...applicant, eik: e.target.value })} /></div>
            <div><label>{t("subdocs.prot.form.address")}</label><input value={applicant.address} onChange={(e) => setApplicant({ ...applicant, address: e.target.value })} /></div>
            <div><label>{t("subdocs.prot.ddd.mobile")}</label><input value={applicant.mobile} onChange={(e) => setApplicant({ ...applicant, mobile: e.target.value })} /></div>
          </div>
        </div>
        <div className="glass panel" style={{ padding: 20 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 12px" }}>{t("subdocs.prot.ddd.object")}</h3>
          <div style={{ marginBottom: 8 }}>
            <label>{t("subdocs.prot.form.pickClient")}</label>
            <select value={objectId} onChange={(e) => pickObject(e.target.value)}>
              <option value="">{t("subdocs.prot.form.manual")}</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <div><label>{t("subdocs.prot.form.name")}</label><input value={obj.name} onChange={(e) => setObj({ ...obj, name: e.target.value })} /></div>
            <div><label>{t("subdocs.prot.ddd.contact")}</label><input value={obj.contact} onChange={(e) => setObj({ ...obj, contact: e.target.value })} /></div>
            <div><label>{t("subdocs.prot.form.address")}</label><input value={obj.address} onChange={(e) => setObj({ ...obj, address: e.target.value })} /></div>
          </div>
        </div>
      </div>

      {/* Основание */}
      <div className="glass panel" style={{ padding: 20, marginBottom: 14 }}>
        <label style={{ marginBottom: 8, display: "block" }}>{t("subdocs.prot.ddd.basisTitle")}</label>
        <div style={{ display: "flex", gap: 18 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}><input type="radio" name="basis" checked={basis === "single"} onChange={() => setBasis("single")} style={{ width: "auto" }} /> {t("subdocs.prot.ddd.single")}</label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}><input type="radio" name="basis" checked={basis === "contract"} onChange={() => setBasis("contract")} style={{ width: "auto" }} /> {t("subdocs.prot.ddd.contract")}</label>
        </div>
      </div>

      {/* Вредители */}
      <div className="glass panel" style={{ padding: 20, marginBottom: 14 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 12px" }}>{t("subdocs.prot.ddd.pestsTitle")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16 }}>
          {DDD_COLUMNS.map((col) => (
            <div key={col.id}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{col.label}</div>
              {DDD_PESTS[col.id].map((p) => (
                <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, padding: "2px 0" }}>
                  <input type="checkbox" checked={pests[col.id].includes(p)} onChange={() => togglePest(col.id, p)} style={{ width: "auto" }} /> {p}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Таблица с данни за обработката */}
      <div className="glass panel" style={{ padding: 20, marginBottom: 14, overflowX: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 12px" }}>{t("subdocs.prot.ddd.tableTitle")}</h3>
        <table style={{ width: "100%", minWidth: 640 }}>
          <thead><tr><th style={{ width: 40 }}>№</th><th></th>{DDD_COLUMNS.map((c) => <th key={c.id} style={{ fontSize: 11 }}>{c.label}</th>)}</tr></thead>
          <tbody>
            {DDD_ROWS.map((r) => (
              <tr key={r.id}>
                <td style={{ fontSize: 11.5, color: "var(--muted)", verticalAlign: "top" }}>{r.no}</td>
                <td style={{ fontSize: 11.5, verticalAlign: "top", paddingLeft: r.sub ? 12 : 0 }}>{r.label}</td>
                {DDD_COLUMNS.map((c) => (
                  <td key={c.id} style={{ verticalAlign: "top" }}>
                    {r.cols.includes(c.id) ? <input style={inp} value={cells[cellKey(r.id, c.id)] ?? ""} onChange={(e) => setCell(cellKey(r.id, c.id), e.target.value)} /> : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Подписи/футър */}
      <div className="glass panel" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label>{t("subdocs.prot.ddd.preparedBy")}</label><input value={footer.preparedBy} onChange={(e) => setFooter({ ...footer, preparedBy: e.target.value })} /></div>
          <div><label>{t("subdocs.prot.ddd.certification")}</label><input value={footer.certification} onChange={(e) => setFooter({ ...footer, certification: e.target.value })} /></div>
          <div><label>{t("subdocs.prot.ddd.performedBy")}</label><input value={footer.performedBy} onChange={(e) => setFooter({ ...footer, performedBy: e.target.value })} /></div>
          <div><label>{t("subdocs.prot.ddd.executionMonth")}</label><input value={footer.executionMonth} onChange={(e) => setFooter({ ...footer, executionMonth: e.target.value })} /></div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Link href="/dashboard/documents/protocols" className="btn btn-ghost">{t("subdocs.prot.form.cancel")}</Link>
        <button className="btn btn-primary" disabled={saving || !obj.name} onClick={submit}>{saving ? t("subdocs.prot.form.saving") : t("subdocs.prot.form.submit")}</button>
      </div>
    </>
  );
}
