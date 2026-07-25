"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Inv = { id: string; number: string; type: string };

/** Генерира PDF на протокола и го прикача като приложение към избрана фактура.
 *  Така при изпращане на фактурата по имейл протоколът се праща заедно с нея. */
export function AttachProtocolToInvoice({ protocolNumber, invoices, selector = ".printable" }: { protocolNumber: string; invoices: Inv[]; selector?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [invId, setInvId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function attach() {
    if (!invId) return;
    setBusy(true); setMsg(null);
    try {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) throw new Error("no-el");
      // Синхронизирай отметките (чекбоксовете) преди генериране на PDF.
      el.querySelectorAll('input[type="checkbox"]').forEach((c) => {
        const cb = c as HTMLInputElement;
        if (cb.checked) cb.setAttribute("checked", ""); else cb.removeAttribute("checked");
      });
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 8;
      const iw = pw - m * 2, ih = (canvas.height * iw) / canvas.width, availH = ph - m * 2;
      if (ih <= availH) pdf.addImage(img, "JPEG", m, m, iw, ih);
      else {
        let left = ih, pos = m;
        pdf.addImage(img, "JPEG", m, pos, iw, ih); left -= availH;
        while (left > 2) { pos = m - (ih - left); pdf.addPage(); pdf.addImage(img, "JPEG", m, pos, iw, ih); left -= availH; }
      }
      const dataUrl = pdf.output("datauristring");
      const filename = `${protocolNumber}.pdf`.replace(/[/\\?%*:|"<>]/g, "-");
      const size = Math.floor((dataUrl.length * 3) / 4);
      const res = await fetch(`/api/documents/${invId}/attachments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, mimeType: "application/pdf", size, dataUrl }),
      });
      if (res.ok) { setMsg({ ok: true, text: t("subdocs.prot.attach.done") }); setOpen(false); }
      else setMsg({ ok: false, text: (await res.json().catch(() => ({}))).error ?? t("subdocs.prot.attach.err") });
    } catch { setMsg({ ok: false, text: t("subdocs.prot.attach.err") }); }
    finally { setBusy(false); }
  }

  if (invoices.length === 0) return null;

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
      {!open ? (
        <button className="btn btn-ghost btn-sm" onClick={() => { setOpen(true); setMsg(null); }}>{t("subdocs.prot.attach.btn")}</button>
      ) : (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <select value={invId} onChange={(e) => setInvId(e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5, width: "auto" }}>
            <option value="">{t("subdocs.prot.attach.pick")}</option>
            {invoices.map((i) => <option key={i.id} value={i.id}>{i.number}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" disabled={busy || !invId} onClick={attach}>{busy ? "…" : t("subdocs.prot.attach.confirm")}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>✕</button>
        </span>
      )}
      {msg && <span style={{ fontSize: 12, color: msg.ok ? "var(--emerald-dark)" : "var(--brick)" }}>{msg.text}</span>}
    </span>
  );
}
