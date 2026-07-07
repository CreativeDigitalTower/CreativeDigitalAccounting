"use client";

import { createRoot } from "react-dom/client";
import { InvoiceDocument } from "@/components/app/InvoiceDocument";
import { OfferDocument } from "@/components/app/OfferDocument";

// Български етикети за имената на файловете
const TYPE_FILE: Record<string, string> = {
  invoice: "Фактура", proforma: "Проформа", quote: "Оферта",
  credit_note: "Кредитно-известие", debit_note: "Дебитно-известие",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocData = any;

export function sanitizeFileName(s: string): string {
  return (s || "документ").replace(/[\\/:*?"<>|]+/g, "-").trim();
}
const sanitize = sanitizeFileName;

/** Днешна дата като YYYY-MM-DD за имена на архиви. */
export function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Сваля списък от вече генерирани PDF файлове.
 * 1 файл → директно PDF (application/pdf). 2+ файла → ZIP архив (application/zip),
 * като всеки PDF е самостоятелен файл в архива.
 */
export async function downloadPdfBlobs(files: { name: string; blob: Blob }[], zipBaseName: string): Promise<void> {
  if (files.length === 0) return;
  if (files.length === 1) { saveBlob(files[0].blob, files[0].name); return; }
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const used: Record<string, number> = {};
  for (const f of files) {
    const count = used[f.name] ?? 0;
    used[f.name] = count + 1;
    const name = count === 0 ? f.name : f.name.replace(/\.pdf$/i, `-${count + 1}.pdf`);
    zip.file(name, f.blob);
  }
  const content = await zip.generateAsync({ type: "blob" });
  saveBlob(content, `${sanitize(zipBaseName)}.zip`);
}

async function fetchViewData(id: string): Promise<DocData | null> {
  const r = await fetch(`/api/documents/${id}/view`);
  if (!r.ok) return null;
  return r.json();
}

async function renderCanvas(host: HTMLElement, data: DocData, html2canvas: typeof import("html2canvas-pro").default) {
  const holder = document.createElement("div");
  holder.style.width = "800px";
  holder.style.background = "#ffffff";
  host.appendChild(holder);
  const root = createRoot(holder);
  await new Promise<void>((resolve) => {
    root.render(data.type === "quote" ? <OfferDocument data={data} /> : <InvoiceDocument data={data} />);
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise((r) => setTimeout(r, 180)); // изчакване на шрифтове/лого
  const printable = (holder.querySelector(".printable") as HTMLElement) ?? holder;
  const canvas = await html2canvas(printable, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
  root.unmount();
  host.removeChild(holder);
  return canvas;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addCanvas(pdf: any, canvas: HTMLCanvasElement) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const availH = pageH - margin * 2;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;
  const img = canvas.toDataURL("image/jpeg", 0.95);
  if (imgH <= availH * 1.06) {
    let w = imgW, h = imgH;
    if (h > availH) { const s = availH / h; h = availH; w = imgW * s; }
    pdf.addImage(img, "JPEG", (pageW - w) / 2, margin, w, h);
    return;
  }
  let heightLeft = imgH;
  let position = margin;
  pdf.addImage(img, "JPEG", margin, position, imgW, imgH);
  heightLeft -= availH;
  while (heightLeft > 2) {
    position = margin - (imgH - heightLeft);
    pdf.addPage();
    pdf.addImage(img, "JPEG", margin, position, imgW, imgH);
    heightLeft -= availH;
  }
}

/**
 * Сваля избраните документи.
 * Всеки документ е самостоятелен PDF файл. При няколко избрани документа файловете
 * се пакетират в ZIP архив (не се обединяват в един PDF). При един документ се
 * сваля директно PDF.
 */
export async function downloadDocsAsZip(ids: string[], zipBaseName: string): Promise<void> {
  if (ids.length === 0) return;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"), import("jspdf"),
  ]);
  const host = document.createElement("div");
  host.style.position = "fixed"; host.style.left = "-10000px"; host.style.top = "0";
  document.body.appendChild(host);
  try {
    const files: { name: string; blob: Blob }[] = [];
    for (const id of ids) {
      const data = await fetchViewData(id);
      if (!data) continue;
      const canvas = await renderCanvas(host, data, html2canvas);
      const pdf = new jsPDF("p", "mm", "a4");
      addCanvas(pdf, canvas);
      files.push({ name: `${TYPE_FILE[data.type] ?? "Документ"}-${sanitize(data.number)}.pdf`, blob: pdf.output("blob") });
    }
    await downloadPdfBlobs(files, zipBaseName);
  } finally {
    document.body.removeChild(host);
  }
}
