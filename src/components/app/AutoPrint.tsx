"use client";

import { useEffect } from "react";

/**
 * Отваря диалога за печат/сваляне на PDF. `fileTitle` става document.title, така че
 * при „Save as PDF" браузърът предлага смислено име (напр. Ispratnica-9654-2026).
 * Един и същ canonical layout се ползва и за печат, и за сваляне (визуална консистентност).
 */
export function AutoPrint({ auto = true, fileTitle, printBodyClass }: { auto?: boolean; fileTitle?: string; printBodyClass?: string }) {
  function print() {
    document.body.classList.add("printing-multi");
    if (printBodyClass) document.body.classList.add(printBodyClass);
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-multi");
      if (printBodyClass) document.body.classList.remove(printBodyClass);
    }, 800);
  }
  useEffect(() => {
    if (fileTitle) {
      const prev = document.title;
      document.title = fileTitle;
      return () => { document.title = prev; };
    }
  }, [fileTitle]);
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(print, 400); // изчакваме документите да се изрисуват
    return () => clearTimeout(t);
  }, [auto]);
  return (
    <div className="no-print" style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 18 }}>
      <button className="btn btn-primary btn-sm" onClick={print}>↓ Изтегли / Принтирай PDF</button>
      <button className="btn btn-ghost btn-sm" onClick={() => window.close()}>Затвори</button>
    </div>
  );
}
