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
    if (!el) return;
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`${filename}.pdf`);
    } catch {
      // Резервен вариант — диалог за печат (запази като PDF)
      printDoc();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8 }} className="no-print">
      <button onClick={printDoc} className="btn btn-ghost btn-sm">🖨 Отпечатай</button>
      <button onClick={downloadPdf} className="btn btn-primary btn-sm" disabled={busy}>
        {busy ? "Генериране…" : "↓ Изтегли PDF"}
      </button>
    </div>
  );
}
