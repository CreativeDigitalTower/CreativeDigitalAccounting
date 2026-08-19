"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { REQUEST_STATUSES, REQUEST_PRIORITIES, QUICK_REPLIES } from "@/lib/featureRequest/config";

type Att = { id: string; fileName: string; mimeType: string; size: number };
type Note = { id: string; kind: string; body: string; createdAt: string };
type Req = {
  id: string; type: string; title: string; description: string; benefit: string | null; contactEmail: string; contactPhone: string | null;
  status: string; priority: string | null; assignedTo: string | null; dueDate: string | null; rating: number | null;
  planSnapshot: string | null; modulesSnapshot: string | null; scope: string; locale: string; createdAt: string;
  company: { id: string; name: string; eik: string | null; phone: string | null; businessSector: string | null };
  attachments: Att[]; notes: Note[];
};

export function AdminFeatureRequestDetail({ id }: { id: string }) {
  const t = useT();
  const [r, setR] = useState<Req | null>(null);
  const [note, setNote] = useState({ body: "", kind: "note" });
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() { const res = await fetch(`/api/admin/feature-requests/${id}`); if (res.ok) setR(await res.json()); }
  useEffect(() => { load(); }, [id]);
  if (!r) return null;

  async function patch(body: Record<string, unknown>) {
    setBusy(true); setMsg("");
    const res = await fetch(`/api/admin/feature-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false); if (res.ok) load(); else setMsg("⚠️");
  }
  async function addNote() {
    if (!note.body.trim()) return;
    setBusy(true);
    await fetch(`/api/admin/feature-requests/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(note) });
    setBusy(false); setNote({ body: "", kind: "note" }); load();
  }
  async function sendReply() {
    if (!reply.trim()) return;
    setBusy(true); setMsg("");
    const res = await fetch(`/api/admin/feature-requests/${id}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: reply }) });
    setBusy(false);
    if (res.ok) { setReply(""); setMsg(`✅ ${t("featureRequest.admin.replySent")}`); load(); } else setMsg("⚠️");
  }
  async function impersonate() {
    const res = await fetch("/api/admin/impersonate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: r!.company.id }) });
    if (res.ok) window.location.href = "/dashboard";
  }

  const dt = (x: string) => new Date(x).toLocaleString();
  const inp = { padding: "6px 9px", fontSize: 12.5, width: "100%" } as const;
  const lbl = { fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 } as const;
  const Row = ({ l, v }: { l: string; v: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
      <span style={{ color: "var(--muted)" }}>{l}</span><span style={{ textAlign: "right" }}>{v ?? "—"}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href="/dashboard/admin/feature-requests" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("featureRequest.admin.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{r.title}</h1>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={impersonate}>{t("featureRequest.admin.impersonate")}</button>
      </div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("featureRequest.admin.details")}</h3>
          <Row l={t("featureRequest.admin.company")} v={r.company.name} />
          <Row l="ЕИК" v={r.company.eik} />
          <Row l={t("featureRequest.admin.scope")} v={r.scope === "firm" ? t("featureRequest.admin.scopeFirm") : t("featureRequest.admin.scopeCompany")} />
          <Row l={t("featureRequest.admin.type")} v={t(`featureRequest.type.${r.type}`)} />
          <Row l={t("featureRequest.form.email")} v={r.contactEmail} />
          <Row l={t("featureRequest.form.phone")} v={r.contactPhone} />
          <Row l={t("featureRequest.admin.plan")} v={r.planSnapshot} />
          <Row l={t("featureRequest.admin.modules")} v={r.modulesSnapshot || "—"} />
          <Row l={t("featureRequest.admin.date")} v={dt(r.createdAt)} />
          <div style={{ marginTop: 10 }}>
            <div style={lbl}>{t("featureRequest.form.desc")}</div>
            <div style={{ fontSize: 12.5, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{r.description}</div>
          </div>
          {r.benefit && <div style={{ marginTop: 8 }}><div style={lbl}>{t("featureRequest.form.benefit")}</div><div style={{ fontSize: 12.5, whiteSpace: "pre-wrap" }}>{r.benefit}</div></div>}
          {r.attachments.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={lbl}>{t("featureRequest.form.attach")}</div>
              {r.attachments.map((a) => <a key={a.id} href={`/api/feature-requests/${r.id}/attachments/${a.id}`} style={{ display: "block", fontSize: 12.5 }}>{a.fileName} <span style={{ color: "var(--muted)" }}>({Math.round(a.size / 1024)} KB)</span></a>)}
            </div>
          )}
        </div>

        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("featureRequest.admin.manage")}</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <div><label style={lbl}>{t("featureRequest.admin.status")}</label>
              <select style={inp} value={r.status} disabled={busy} onChange={(e) => patch({ status: e.target.value })}>{REQUEST_STATUSES.map((s) => <option key={s} value={s}>{t(`featureRequest.status.${s}`)}</option>)}</select></div>
            <div><label style={lbl}>{t("featureRequest.admin.priority")}</label>
              <select style={inp} value={r.priority ?? ""} disabled={busy} onChange={(e) => patch({ priority: e.target.value || null })}>
                <option value="">—</option>{REQUEST_PRIORITIES.map((p) => <option key={p} value={p}>{t(`featureRequest.priority.${p}`)}</option>)}
              </select></div>
            <div><label style={lbl}>{t("featureRequest.admin.assigned")}</label><input style={inp} defaultValue={r.assignedTo ?? ""} disabled={busy} onBlur={(e) => { if (e.target.value !== (r.assignedTo ?? "")) patch({ assignedTo: e.target.value || null }); }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><label style={lbl}>{t("featureRequest.admin.due")}</label><input type="date" style={inp} defaultValue={r.dueDate ? r.dueDate.slice(0, 10) : ""} disabled={busy} onBlur={(e) => patch({ dueDate: e.target.value || null })} /></div>
              <div><label style={lbl}>{t("featureRequest.admin.rating")}</label><input type="number" min={1} max={5} style={inp} defaultValue={r.rating ?? ""} disabled={busy} onBlur={(e) => patch({ rating: e.target.value ? Number(e.target.value) : null })} /></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("featureRequest.admin.reply")}</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {QUICK_REPLIES.map((q) => <button key={q} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setReply(t(`featureRequest.quick.${q}`))}>{t(`featureRequest.status.${q === "need_info" ? "need_info" : q === "approved" ? "approved" : q === "in_development" ? "in_development" : "delivered"}`)}</button>)}
          </div>
          <textarea style={{ ...inp, minHeight: 100, resize: "vertical", fontFamily: "inherit" }} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t("featureRequest.admin.replyPh")} />
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} disabled={busy} onClick={sendReply}>{t("featureRequest.admin.sendReply")}</button>
        </div>

        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("featureRequest.admin.notes")}</h3>
          <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 8 }}>
            {r.notes.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("featureRequest.admin.noNotes")}</div> : r.notes.map((n) => (
              <div key={n.id} style={{ fontSize: 12, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>{t(`featureRequest.noteKind.${n.kind}`)} · {dt(n.createdAt)}</span>
                <div style={{ whiteSpace: "pre-wrap" }}>{n.body}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
            <textarea style={{ ...inp, minHeight: 44, resize: "vertical", fontFamily: "inherit" }} value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} placeholder={t("featureRequest.admin.notePh")} />
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={addNote}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}
