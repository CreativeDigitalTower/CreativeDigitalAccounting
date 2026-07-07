"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";
import { downloadPdfBlobs, sanitizeFileName, todayStamp } from "@/lib/downloadDocs";

type Doc = { id: string; title: string; category: string; categoryLabel: string; status: string; createdAt: string; updatedAt: string };
const STATUS_LABEL: Record<string, string> = { draft: "Чернова", final: "Завършен", archived: "Архивиран" };
const STATUS_COLOR: Record<string, string> = { draft: "var(--brass)", final: "var(--emerald)", archived: "var(--muted)" };
const MONTHS = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"];

export function MyDocsList({ docs }: { docs: Doc[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  // Готовите документи по подразбиране; черновите са в отделен таб, за да не е дълга страницата.
  const [tab, setTab] = useState<"ready" | "draft">("ready");

  const draftCount = docs.filter((d) => d.status === "draft").length;
  const readyCount = docs.length - draftCount;

  const byTab = docs.filter((d) => (tab === "draft" ? d.status === "draft" : d.status !== "draft"));
  const filtered = byTab.filter((d) => !q.trim() || [d.title, d.categoryLabel].some((v) => v.toLowerCase().includes(q.toLowerCase())));

  async function remove(d: Doc) {
    if (!(await confirmDelete(`документа „${d.title}"`))) return;
    const res = await fetch(`/api/business-docs/${d.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert((await res.json().catch(() => ({}))).error ?? "Грешка при изтриване.");
  }

  // групиране по година → месец
  const groups = new Map<string, Doc[]>();
  for (const d of filtered) {
    const dt = new Date(d.createdAt);
    const key = `${dt.getFullYear()}-${String(dt.getMonth()).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  function toggle(id: string) { setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleGroup(rows: Doc[]) {
    const all = rows.every((r) => sel.has(r.id));
    setSel((s) => { const n = new Set(s); rows.forEach((r) => all ? n.delete(r.id) : n.add(r.id)); return n; });
  }

  async function downloadIds(ids: string[]) {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/business-docs/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      const data: { logoUrl: string | null; companyName: string; docs: { title: string; contentHtml: string }[] } = await res.json();
      const items = data.docs;
      const logoHtml = data.logoUrl
        ? `<div style="text-align:right;margin-bottom:18px;"><img src="${data.logoUrl}" alt="${data.companyName}" style="max-height:48px;max-width:160px;object-fit:contain;" crossorigin="anonymous" /></div>`
        : "";
      const footerHtml = `<div style="margin-top:40px;padding-top:10px;border-top:1px solid #eee;display:flex;align-items:center;justify-content:center;gap:8px;font-size:10px;color:#9a9a90;"><img src="/cda-logo.png" alt="CDA" style="width:16px;height:16px;border-radius:50%;" crossorigin="anonymous" /><span>Генерирано чрез Creative Digital Accounting · www.CreativeDigitalAccounting.com</span></div>`;
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:-10000px;top:0;width:820px;background:#fff;";
      document.body.appendChild(host);
      // Всеки документ → самостоятелен PDF; при няколко → ZIP архив.
      const files: { name: string; blob: Blob }[] = [];
      for (const it of items) {
        const page = document.createElement("div");
        page.className = "bizdoc-page";
        page.style.cssText = "background:#fff;width:820px;padding:48px 56px;color:#16201C;";
        page.innerHTML = logoHtml + it.contentHtml + footerHtml;
        host.appendChild(page);
        await new Promise((r) => setTimeout(r, 60));
        const canvas = await html2canvas(page, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
        const img = canvas.toDataURL("image/jpeg", 0.95);
        const pdf = new jsPDF("p", "mm", "a4");
        const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 8, availH = ph - m * 2, iw = pw - m * 2;
        const ih = (canvas.height * iw) / canvas.width;
        let w = iw, h = ih; if (h > availH) { const s = availH / h; h = availH; w = iw * s; }
        pdf.addImage(img, "JPEG", (pw - w) / 2, m, w, h);
        files.push({ name: `${sanitizeFileName(it.title || "Документ")}.pdf`, blob: pdf.output("blob") });
        host.removeChild(page);
      }
      document.body.removeChild(host);
      await downloadPdfBlobs(files, `Документи-${todayStamp()}`);
    } catch { alert("Неуспешно сваляне."); } finally { setBusy(false); }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <button className={`filter-tab${tab === "ready" ? " active" : ""}`} onClick={() => { setTab("ready"); setSel(new Set()); }}>Готови документи ({readyCount})</button>
        <button className={`filter-tab${tab === "draft" ? " active" : ""}`} onClick={() => { setTab("draft"); setSel(new Set()); }}>Чернови ({draftCount})</button>
      </div>

      <div className="glass panel" style={{ padding: "12px 16px", marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Търси документ…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 240px", minWidth: 200, padding: "8px 12px" }} />
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => downloadIds([...sel])}>{busy ? "Сваляне…" : `Свали избраните (${sel.size})`}</button>
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => downloadIds(filtered.map((d) => d.id))}>Свали всички</button>
      </div>

      {filtered.length === 0 && (
        <div className="glass panel" style={{ textAlign: "center", padding: "34px 0", color: "var(--muted)", fontSize: 13 }}>
          {tab === "draft" ? "Няма чернови." : "Няма готови документи."}
        </div>
      )}

      {sortedGroups.map(([key, rows]) => {
        const [y, m] = key.split("-");
        const allSel = rows.every((r) => sel.has(r.id));
        return (
          <div key={key} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 8px" }}>
              <input type="checkbox" checked={allSel} onChange={() => toggleGroup(rows)} style={{ width: "auto" }} />
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{MONTHS[Number(m)]} {y} <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>({rows.length})</span></h3>
            </div>
            <div className="glass panel" style={{ padding: "8px 0" }}>
              <table>
                <thead><tr><th style={{ width: 30 }}></th><th>Документ</th><th>Категория</th><th>Статус</th><th></th></tr></thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id}>
                      <td><input type="checkbox" checked={sel.has(d.id)} onChange={() => toggle(d.id)} style={{ width: "auto" }} /></td>
                      <td style={{ fontWeight: 600 }}><Link href={`/dashboard/business-docs/doc/${d.id}`} style={{ color: "inherit", textDecoration: "none" }}>{d.title}</Link></td>
                      <td style={{ fontSize: 12.5 }}>{d.categoryLabel}</td>
                      <td><span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_COLOR[d.status] }}>{STATUS_LABEL[d.status] ?? d.status}</span></td>
                      <td style={{ display: "flex", gap: 6 }}>
                        <Link href={`/dashboard/business-docs/doc/${d.id}`} className="btn btn-ghost btn-sm" title="Отвори / редактирай">Отвори</Link>
                        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => downloadIds([d.id])}>↓ PDF</button>
                        <button className="btn btn-ghost btn-sm" title="Изтрий" onClick={() => remove(d)} style={{ color: "var(--brick)", borderColor: "var(--brick)", display: "inline-flex", alignItems: "center" }}><UiIcon.trash /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && <div className="glass panel" style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>Няма документи.</div>}
    </>
  );
}
