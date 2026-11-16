"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

/**
 * Подготвя всички изображения в елемента за надеждно улавяне от html2canvas (§5):
 *  1) изчаква декодирането им (иначе html2canvas може да ги прескочи);
 *  2) растеризира SVG-лога до PNG (html2canvas не рендира SVG <img> надеждно → празно
 *     място в PDF, макар че браузърът ги показва) — това е ОСНОВНАТА причина логото да
 *     се вижда в preview, но да липсва в PDF.
 * Връща функция за възстановяване на оригиналните src след улавянето. Всяка грешка по
 * отделно изображение се поглъща — генерирането на PDF никога не се проваля заради лого.
 */
async function prepareImagesForCapture(el: HTMLElement): Promise<() => void> {
  const imgs = Array.from(el.querySelectorAll("img"));
  const originals: Array<{ img: HTMLImageElement; src: string }> = [];

  await Promise.all(imgs.map(async (img) => {
    try {
      if (!img.complete || img.naturalWidth === 0) {
        await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); });
      }
      try { await img.decode(); } catch { /* вече декодирано или неподдържано */ }

      const src = img.currentSrc || img.src;
      const isSvg = /^data:image\/svg\+xml/i.test(src) || /\.svg(\?|$)/i.test(src);
      if (!isSvg) return;

      // Растеризираме SVG → PNG през offscreen canvas (без външни услуги, §5).
      const rect = img.getBoundingClientRect();
      const scale = 3; // по-висока резолюция за остро лого в PDF
      const w = Math.max(1, Math.round((rect.width || img.naturalWidth || 180) * scale));
      const h = Math.max(1, Math.round((rect.height || img.naturalHeight || 56) * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const png = canvas.toDataURL("image/png");
      if (png && png.startsWith("data:image/png")) {
        originals.push({ img, src: img.getAttribute("src") || "" });
        img.setAttribute("src", png);
      }
    } catch { /* повредено/недостъпно лого → оставяме както е, PDF продължава */ }
  }));

  return () => { for (const o of originals) { try { o.img.setAttribute("src", o.src); } catch { /* ignore */ } } };
}

export function DownloadButtons({ filename = "document", selector = ".printable" }: { filename?: string; selector?: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  function printDoc() {
    document.body.classList.add("printing-doc");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-doc"), 500);
  }

  async function downloadPdf() {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) { alert(t("billing.pdfNotFound")); return; }
    setBusy(true);
    const restore = await prepareImagesForCapture(el);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = margin;
      pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
      heightLeft -= (pageH - margin * 2);
      while (heightLeft > 0) {
        position = margin - (imgH - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
        heightLeft -= (pageH - margin * 2);
      }
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
      alert(t("billing.pdfFailed"));
      printDoc();
    } finally {
      restore();
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8 }} className="no-print">
      <button onClick={printDoc} className="btn btn-ghost btn-sm"style={{display:"inline-flex",alignItems:"center",gap:6}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><rect x="7" y="15" width="10" height="6"/></svg> {t("billing.print")}</button>
      <button onClick={downloadPdf} className="btn btn-primary btn-sm" disabled={busy}>
        {busy ? t("billing.generating") : t("billing.downloadPdf")}
      </button>
    </div>
  );
}
