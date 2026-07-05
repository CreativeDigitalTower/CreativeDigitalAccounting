"use client";

import { useEffect } from "react";

/** Отваря диалога за печат/сваляне на PDF за няколко документа наведнъж. */
export function AutoPrint({ auto = true }: { auto?: boolean }) {
  function print() {
    document.body.classList.add("printing-multi");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-multi"), 800);
  }
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
