"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { generateDocPdfDataUrl } from "@/lib/downloadDocs";

type Defaults = {
  recipient: string; subject: string; message: string; attachPdf: boolean;
  replyTo: string | null; total: string; dueDate: string | null; number: string;
  paid: boolean; canRemind: boolean;
};

/**
 * Ръчно „Напомняне за плащане" (Action C). ПЪРВИЯТ клик НИКОГА не изпраща — отваря модал с
 * редактируеми Получател/Тема/Съобщение, чекбокс за прикачване на PDF и информация за Reply-To.
 * Изпраща се едва при „Изпрати напомнянето" → POST /remind. Default-ите идват от GET /remind
 * (една business логика с изпращането).
 */
export function PaymentReminderModal({
  documentId, variant = "ghost",
}: {
  documentId: string; variant?: "primary" | "ghost";
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [d, setD] = useState<Defaults | null>(null);

  async function openModal() {
    setOpen(true); setLoading(true); setErr(""); setDone(false); setD(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/remind`, { method: "GET" });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? t("documents.reminder.errLoad")); setLoading(false); return; }
      setD(data as Defaults);
    } catch {
      setErr(t("documents.reminder.errLoad"));
    }
    setLoading(false);
  }

  function patch(p: Partial<Defaults>) { setD((prev) => (prev ? { ...prev, ...p } : prev)); }

  async function send() {
    if (!d) return;
    const email = d.recipient.trim();
    if (!email) { setErr(t("documents.reminder.errNoRecipient")); return; }
    if (!d.subject.trim() || !d.message.trim()) { setErr(t("documents.reminder.errEmpty")); return; }
    setBusy(true); setErr("");
    try {
      let invoicePdf: { name: string; dataUrl: string } | null = null;
      if (d.attachPdf) {
        invoicePdf = await generateDocPdfDataUrl(documentId);
        if (!invoicePdf) { setErr(t("documents.reminder.errPdf")); setBusy(false); return; }
      }
      const res = await fetch(`/api/documents/${documentId}/remind`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject: d.subject, message: d.message, attachPdf: d.attachPdf, invoicePdf }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) { setErr(data.error ?? t("documents.reminder.errSend")); return; }
      setDone(true);
      setTimeout(() => setOpen(false), 2000);
    } catch {
      setBusy(false); setErr(t("documents.reminder.errSend"));
    }
  }

  return (
    <>
      <button className={`btn btn-${variant} btn-sm`} onClick={openModal}>{t("documents.reminder.cta")}</button>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: 480, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", padding: 22, borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: 0 }}>{t("documents.reminder.title")}</h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: 20, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {loading && <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>…</div>}

            {!loading && d && d.paid && (
              <div style={{ fontSize: 13, color: "var(--ink-soft)", padding: "6px 0 12px" }}>{t("documents.reminder.paidNote")}</div>
            )}

            {!loading && d && !d.paid && (
              <>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("documents.reminder.recipient")}</label>
                <input type="email" value={d.recipient} onChange={(e) => patch({ recipient: e.target.value })} style={{ width: "100%", marginBottom: 12 }} />

                <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("documents.reminder.subject")}</label>
                <input type="text" value={d.subject} onChange={(e) => patch({ subject: e.target.value })} style={{ width: "100%", marginBottom: 12 }} />

                <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("documents.reminder.message")}</label>
                <textarea value={d.message} onChange={(e) => patch({ message: e.target.value })} rows={9} style={{ width: "100%", marginBottom: 12, fontFamily: "inherit", resize: "vertical" }} />

                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, margin: "0 0 12px" }}>
                  <input type="checkbox" checked={d.attachPdf} onChange={(e) => patch({ attachPdf: e.target.checked })} style={{ width: "auto" }} />
                  <span>{t("documents.reminder.attachPdf")}</span>
                </label>

                {d.replyTo && (
                  <div style={{ fontSize: 11.5, color: "var(--muted)", background: "var(--surface-2, rgba(0,0,0,.03))", borderRadius: 8, padding: "8px 10px", marginBottom: 14 }}>
                    {t("documents.reminder.replyToNotice", { email: d.replyTo })}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={send} disabled={busy} className="btn btn-primary btn-sm">{busy ? t("documents.reminder.sending") : t("documents.reminder.send")}</button>
                  <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">{t("documents.reminder.cancel")}</button>
                </div>
              </>
            )}

            {err && <p style={{ fontSize: 12, color: "var(--brick)", marginTop: 10 }}>{err}</p>}
            {done && <p style={{ fontSize: 12, color: "var(--emerald-dark)", marginTop: 10 }}>{t("documents.reminder.sent")}</p>}
          </div>
        </div>
      )}
    </>
  );
}
