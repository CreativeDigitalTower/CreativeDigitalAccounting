"use client";

import { useState } from "react";
import Link from "next/link";

export function TrialEndedPopup({ wasTrial, periodEnd }: { wasTrial: boolean; periodEnd: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,20,18,.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={() => setOpen(false)}>
      <div className="glass panel" style={{ maxWidth: 460, padding: "30px 32px", textAlign: "center", borderTop: "4px solid var(--brass)" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>
          {wasTrial ? "Безплатният Ви период приключи" : "Абонаментът Ви изтече"}
        </h2>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6, margin: "0 0 20px" }}>
          Профилът Ви беше върнат към <strong>Безплатен</strong> план{periodEnd ? ` на ${new Date(periodEnd).toLocaleDateString("bg-BG")}` : ""}.
          Абонирайте се, за да продължите да ползвате всички функции на избрания от Вас план.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>По-късно</button>
          <Link href="/dashboard/subscription" className="btn btn-primary" onClick={() => setOpen(false)}>Виж плановете →</Link>
        </div>
      </div>
    </div>
  );
}
