"use client";

import { useState } from "react";

export function DownloadButtons({ filename = "document", selector = ".printable" }: { filename?: string; selector?: string }) {
  const [busy, setBusy] = useState(false);

  function printDoc() {
    document.body.classList.add("printing-doc");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-doc"), 500);
  }

  async function downloadPdf() {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) { alert("Документът не е намерен за изтегляне."); return; }
    setBusy(true);
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
      alert("Неуспешно генериране на PDF. Отваряме диалога за печат — изберете „Запази като PDF“ (Save as PDF).");
      printDoc();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8 }} className="no-print">
      <button onClick={printDoc} className="btn btn-ghost btn-sm"style={{display:"inline-flex",alignItems:"center",gap:6}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><rect x="7" y="15" width="10" height="6"/></svg> Отпечатай</button>
      <button onClick={downloadPdf} className="btn btn-primary btn-sm" disabled={busy}>
        {busy ? "Генериране…" : "↓ Изтегли PDF"}
      </button>
    </div>
  );
}
