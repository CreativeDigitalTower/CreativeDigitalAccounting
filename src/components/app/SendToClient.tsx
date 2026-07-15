"use client";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { generateDocPdfDataUrl } from "@/lib/downloadDocs";
import { formatFileSize } from "@/lib/attachments";
import {
  defaultRecipients, dedupeRecipients, isValidEmail, normalizeEmail,
  type ClientEmailRow, type EmailPurpose,
} from "@/lib/clientEmails";

export type SendRecipient = ClientEmailRow & { email: string };
export type SendAttachment = { id: string; filename: string; size: number };

export function SendToClient({ id, defaultEmail, decision, sentAt, purpose = "invoice", clientEmails = [], attachments = [] }: {
  id: string; defaultEmail?: string | null; decision?: string | null; sentAt?: string | null;
  purpose?: EmailPurpose; clientEmails?: SendRecipient[]; attachments?: SendAttachment[];
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Списък получатели (активни адреси на клиента) + резервен contactEmail.
  const baseRecipients = useMemo<SendRecipient[]>(() => {
    if (clientEmails.length) return clientEmails.filter((e) => e.isActive !== false);
    const fb = normalizeEmail(defaultEmail ?? "");
    return fb && isValidEmail(fb)
      ? [{ email: fb, isPrimary: true, isActive: true, receivesInvoices: true, receivesReminders: true, receivesOffers: true, receivesGeneral: true } as SendRecipient]
      : [];
  }, [clientEmails, defaultEmail]);

  const preselected = useMemo(() => new Set(defaultRecipients(baseRecipients, purpose, defaultEmail)), [baseRecipients, purpose, defaultEmail]);

  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [includeInvoice, setIncludeInvoice] = useState(true);
  const [checkedAtt, setCheckedAtt] = useState<Set<string>>(new Set());

  function openModal() {
    setCheckedEmails(new Set(preselected));
    setCheckedAtt(new Set(attachments.map((a) => a.id)));
    setManual([]); setManualInput(""); setIncludeInvoice(true);
    setError(""); setDone(null); setOpen(true);
  }

  const allRecipients = useMemo(() => {
    const map = new Map<string, string>(); // email -> label
    for (const r of baseRecipients) map.set(r.email, r.contactName ? `${r.contactName} · ${r.email}` : r.email);
    for (const m of manual) if (!map.has(m)) map.set(m, m);
    return [...map.entries()];
  }, [baseRecipients, manual]);

  const selectedEmails = allRecipients.filter(([e]) => checkedEmails.has(e)).map(([e]) => e);
  const selectedAtt = attachments.filter((a) => checkedAtt.has(a.id));
  const attTotal = selectedAtt.reduce((s, a) => s + a.size, 0);

  function toggleEmail(e: string) {
    setCheckedEmails((prev) => { const n = new Set(prev); if (n.has(e)) n.delete(e); else n.add(e); return n; });
  }
  function selectAll() {
    setCheckedEmails(new Set(allRecipients.map(([e]) => e)));
  }
  function addManual() {
    const e = normalizeEmail(manualInput);
    if (!isValidEmail(e)) { setError(t("mailattach.send.invalidManual")); return; }
    setError("");
    if (!manual.includes(e) && !baseRecipients.some((r) => r.email === e)) setManual((p) => [...p, e]);
    setCheckedEmails((prev) => new Set(prev).add(e));
    setManualInput("");
  }
  function toggleAtt(idA: string) {
    setCheckedAtt((prev) => { const n = new Set(prev); if (n.has(idA)) n.delete(idA); else n.add(idA); return n; });
  }

  async function send() {
    const recipients = dedupeRecipients(selectedEmails);
    if (recipients.length === 0) { setError(t("mailattach.send.noRecipients")); return; }
    setBusy(true); setError(""); setDone(null);
    try {
      let invoicePdf: { name: string; dataUrl: string } | null = null;
      if (includeInvoice) {
        invoicePdf = await generateDocPdfDataUrl(id);
        if (!invoicePdf) { setError(t("mailattach.send.pdfError")); setBusy(false); return; }
      }
      const res = await fetch(`/api/documents/${id}/send-client`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients, attachmentIds: [...checkedAtt], includeInvoicePdf: includeInvoice, invoicePdf,
        }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) { setError(data.error ?? t("mailattach.send.errSend")); return; }
      setDone(t("mailattach.send.sentTo", { list: recipients.join(", ") }));
      setTimeout(() => setOpen(false), 2200);
    } catch {
      setBusy(false); setError(t("mailattach.send.errSend"));
    }
  }

  const decisionBadge = decision
    ? <span style={{ fontSize: 12, fontWeight: 700, color: decision === "accepted" ? "var(--emerald-dark)" : "var(--brick)" }}>
        {decision === "accepted" ? t("documents.send.accepted") : t("documents.send.rejected")}
      </span>
    : null;

  return (
    <>
      <button onClick={openModal} className="btn btn-ghost btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px" }}><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3 6 9 6 9-6" /></svg> {t("documents.send.btn")}</button>
      {decisionBadge}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: 460, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto", padding: 22, borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: 0 }}>{t("documents.send.title")}</h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: 20, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {/* Получатели */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, margin: 0 }}>{t("mailattach.send.recipients")}</label>
              {allRecipients.length > 1 && <button type="button" onClick={selectAll} style={{ background: "none", border: "none", color: "var(--navy)", fontSize: 12, cursor: "pointer", padding: 0 }}>{t("mailattach.send.selectAll")}</button>}
            </div>
            {allRecipients.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{t("mailattach.send.noneOnFile")}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
              {allRecipients.map(([email, label]) => (
                <label key={email} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, margin: 0 }}>
                  <input type="checkbox" checked={checkedEmails.has(email)} onChange={() => toggleEmail(email)} style={{ width: "auto" }} />
                  <span style={{ wordBreak: "break-all" }}>{label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <input type="email" value={manualInput} onChange={(e) => setManualInput(e.target.value)} placeholder={t("mailattach.send.addRecipient")}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }} style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={addManual}>+</button>
            </div>

            {/* Приложения */}
            <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 6 }}>{t("mailattach.send.attachments")}</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, margin: 0 }}>
                <input type="checkbox" checked={includeInvoice} onChange={(e) => setIncludeInvoice(e.target.checked)} style={{ width: "auto" }} />
                <span>{t("mailattach.send.invoicePdf")}</span>
              </label>
              {attachments.map((a) => (
                <label key={a.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, margin: 0 }}>
                  <input type="checkbox" checked={checkedAtt.has(a.id)} onChange={() => toggleAtt(a.id)} style={{ width: "auto" }} />
                  <span style={{ wordBreak: "break-all" }}>{a.filename} <span style={{ color: "var(--muted)" }}>· {formatFileSize(a.size)}</span></span>
                </label>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 14 }}>
              {t("mailattach.send.summary", { recipients: selectedEmails.length, files: selectedAtt.length + (includeInvoice ? 1 : 0), size: formatFileSize(attTotal) })}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={send} disabled={busy || selectedEmails.length === 0} className="btn btn-primary btn-sm">{busy ? t("documents.send.sending") : t("documents.send.send")}</button>
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">{t("documents.send.cancel")}</button>
            </div>
            {error && <p style={{ fontSize: 12, color: "var(--brick)", marginTop: 10 }}>{error}</p>}
            {done && <p style={{ fontSize: 12, color: "var(--emerald-dark)", marginTop: 10 }}>{done}</p>}
            {sentAt && !done && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>{t("documents.send.lastSent", { when: new Date(sentAt).toLocaleString(locale) })}</p>}
          </div>
        </div>
      )}
    </>
  );
}
