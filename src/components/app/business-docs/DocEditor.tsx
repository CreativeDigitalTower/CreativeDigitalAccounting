"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Doc = { id: string; title: string; contentHtml: string; status: string; favorite: boolean; pinned: boolean };

const STATUSES = [{ v: "draft", l: "Чернова" }, { v: "final", l: "Завършен" }, { v: "archived", l: "Архивиран" }];

export function DocEditor({ doc, logoUrl, companyName }: { doc: Doc; logoUrl: string | null; companyName: string }) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(doc.title);
  const [status, setStatus] = useState(doc.status);
  const [favorite, setFavorite] = useState(doc.favorite);
  const [pinned, setPinned] = useState(doc.pinned);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (editorRef.current) editorRef.current.innerHTML = doc.contentHtml; }, [doc.contentHtml]);

  function cmd(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }
  function insertHtml(html: string) {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/business-docs/${doc.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, contentHtml: editorRef.current?.innerHTML ?? "", status }),
    });
    setSaving(false);
    if (res.ok) { setSavedAt(new Date().toLocaleTimeString("bg-BG")); router.refresh(); }
  }

  async function patch(data: Record<string, unknown>) {
    await fetch(`/api/business-docs/${doc.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  }

  async function remove() {
    if (!confirm("Изтриване на документа?")) return;
    const res = await fetch(`/api/business-docs/${doc.id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard/business-docs");
  }

  function printDoc() {
    document.body.classList.add("printing-doc");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-doc"), 500);
  }

  async function downloadPdf() {
    const el = document.querySelector(".bizdoc-page") as HTMLElement | null;
    if (!el) return;
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 8;
      const iw = pw - m * 2, ih = (canvas.height * iw) / canvas.width;
      let left = ih, pos = m;
      pdf.addImage(img, "JPEG", m, pos, iw, ih); left -= ph - m * 2;
      while (left > 0) { pos = m - (ih - left); pdf.addPage(); pdf.addImage(img, "JPEG", m, pos, iw, ih); left -= ph - m * 2; }
      pdf.save(`${title || "document"}.pdf`);
    } catch { printDoc(); } finally { setBusy(false); }
  }

  function downloadDocx() {
    const content = document.querySelector(".bizdoc-page")?.innerHTML ?? "";
    const html = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${title}</title></head><body>${content}</body></html>`;
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title || "document"}.doc`; a.click();
    URL.revokeObjectURL(url);
  }

  const Btn = ({ onClick, children, title: tt }: { onClick: () => void; children: React.ReactNode; title: string }) => (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={tt}
      style={{ minWidth: 30, height: 30, padding: "0 8px", border: "1px solid var(--border)", background: "rgba(255,255,255,.6)", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
      {children}
    </button>
  );

  return (
    <>
      {/* Top bar */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Link href="/dashboard/business-docs" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Бизнес документи</Link>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, minWidth: 200, maxWidth: 420, fontWeight: 600, fontSize: 15 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "auto", padding: "6px 10px", fontSize: 12.5 }}>
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => { setFavorite(!favorite); patch({ favorite: !favorite }); }} title="Любим">{favorite ? "⭐" : "☆"}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setPinned(!pinned); patch({ pinned: !pinned }); }} title="Закачи">{pinned ? "📌" : "📍"}</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? "Запазване…" : "💾 Запази"}</button>
        {savedAt && <span style={{ fontSize: 11.5, color: "var(--emerald)" }}>Запазено {savedAt}</span>}
      </div>

      {/* Export bar */}
      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={downloadPdf} disabled={busy}>{busy ? "…" : "↓ PDF"}</button>
        <button className="btn btn-ghost btn-sm" onClick={downloadDocx}>↓ DOCX</button>
        <button className="btn btn-ghost btn-sm" onClick={printDoc}>🖨 Печат</button>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", color: "var(--brick)" }} onClick={remove}>Изтрий</button>
      </div>

      {/* Toolbar */}
      <div className="no-print glass" style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: 8, borderRadius: 10, marginBottom: 12, position: "sticky", top: 8, zIndex: 20 }}>
        <Btn onClick={() => cmd("undo")} title="Отмени">↶</Btn>
        <Btn onClick={() => cmd("redo")} title="Възстанови">↷</Btn>
        <Sep />
        <Btn onClick={() => cmd("bold")} title="Удебелен"><b>Б</b></Btn>
        <Btn onClick={() => cmd("italic")} title="Курсив"><i>К</i></Btn>
        <Btn onClick={() => cmd("underline")} title="Подчертан"><u>П</u></Btn>
        <Sep />
        <select onMouseDown={(e) => e.preventDefault()} onChange={(e) => { cmd("fontSize", e.target.value); e.target.selectedIndex = 0; }} style={{ width: "auto", padding: "0 6px", height: 30, fontSize: 12.5 }} defaultValue="">
          <option value="" disabled>Размер</option>
          <option value="2">Малък</option><option value="3">Нормален</option><option value="5">Голям</option><option value="6">Заглавие</option>
        </select>
        <Sep />
        <Btn onClick={() => cmd("insertUnorderedList")} title="Списък">•</Btn>
        <Btn onClick={() => cmd("insertOrderedList")} title="Номериран списък">1.</Btn>
        <Btn onClick={() => cmd("outdent")} title="Намали отстъп">⇤</Btn>
        <Btn onClick={() => cmd("indent")} title="Отстъп">⇥</Btn>
        <Sep />
        <Btn onClick={() => cmd("justifyLeft")} title="Ляво">⯇</Btn>
        <Btn onClick={() => cmd("justifyCenter")} title="Център">≡</Btn>
        <Btn onClick={() => cmd("justifyRight")} title="Дясно">⯈</Btn>
        <Sep />
        <Btn onClick={() => insertHtml('<table style="width:100%;border-collapse:collapse;margin:8px 0;"><tr><td style="border:1px solid #999;padding:6px;">&nbsp;</td><td style="border:1px solid #999;padding:6px;">&nbsp;</td><td style="border:1px solid #999;padding:6px;">&nbsp;</td></tr><tr><td style="border:1px solid #999;padding:6px;">&nbsp;</td><td style="border:1px solid #999;padding:6px;">&nbsp;</td><td style="border:1px solid #999;padding:6px;">&nbsp;</td></tr></table>')} title="Таблица">▦</Btn>
        <Btn onClick={() => { const url = prompt("URL на изображение:"); if (url) insertHtml(`<img src="${url}" style="max-width:100%;" />`); }} title="Изображение">🖼</Btn>
        <Btn onClick={() => insertHtml('<div style="page-break-after:always;border-top:1px dashed #bbb;margin:18px 0;"></div>')} title="Нова страница">⤓</Btn>
      </div>

      {/* Document page */}
      <div className="bizdoc-page printable" style={{ background: "#fff", maxWidth: 820, margin: "0 auto", padding: "48px 56px", borderRadius: 6, boxShadow: "0 4px 24px rgba(0,0,0,.08)", color: "#16201C" }}>
        {logoUrl && (
          <div style={{ textAlign: "right", marginBottom: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={companyName} style={{ maxHeight: 48, maxWidth: 160, objectFit: "contain" }} />
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          style={{ outline: "none", minHeight: 400, fontSize: 14, lineHeight: 1.6 }}
        />
        {/* Дискретен футър — бранд на CDA (на всеки документ) */}
        <div style={{ marginTop: 40, paddingTop: 10, borderTop: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 10, color: "#9a9a90" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cda-logo.png" alt="CDA" style={{ width: 16, height: 16, borderRadius: "50%" }} />
          <span>Генерирано чрез Creative Digital Accounting · www.CreativeDigitalAccounting.com</span>
        </div>
      </div>
    </>
  );
}

function Sep() {
  return <span style={{ width: 1, background: "var(--border)", margin: "0 3px" }} />;
}
