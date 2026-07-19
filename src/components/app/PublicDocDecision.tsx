"use client";
import { useState } from "react";

export function PublicDocDecision({ token, decision, from, labels }: {
  token: string; decision: string | null; from: string;
  labels: { sentReview: string; accepted: string; rejected: string; accept: string; reject: string; download: string };
}) {
  const [state, setState] = useState<string | null>(decision);
  const [busy, setBusy] = useState(false);

  async function decide(d: "accepted" | "rejected") {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/public/documents/${token}/decision`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: d }),
    });
    setBusy(false);
    if (res.ok) setState(d);
  }

  function download() {
    window.print();
  }

  if (state) {
    return (
      <div style={{ background: "#fff", border: "1px solid #E7ECE9", borderRadius: 14, padding: "20px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 30, marginBottom: 6 }}>{state === "accepted" ? "✓" : "✕"}</div>
        <div style={{ fontWeight: 700, color: state === "accepted" ? "#0B5E4A" : "#B23B3B", fontSize: 16 }}>
          {state === "accepted" ? labels.accepted : labels.rejected}
        </div>
        <button onClick={download} className="no-print" style={{ marginTop: 14, padding: "9px 20px", borderRadius: 9, border: "1px solid #0B5E4A", background: "transparent", color: "#0B5E4A", fontWeight: 600, cursor: "pointer", display:"inline-flex",alignItems:"center",gap:6 }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16"/></svg> {labels.download}</button>
      </div>
    );
  }

  return (
    <div className="no-print" style={{ background: "#fff", border: "1px solid #E7ECE9", borderRadius: 14, padding: "18px 24px" }}>
      <div style={{ fontSize: 14, color: "#384842", marginBottom: 14, textAlign: "center" }}>
        <strong>{from}</strong> {labels.sentReview}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={() => decide("accepted")} disabled={busy} style={{ padding: "11px 26px", borderRadius: 10, border: "none", background: "#0F8A6A", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>{labels.accept}</button>
        <button onClick={() => decide("rejected")} disabled={busy} style={{ padding: "11px 26px", borderRadius: 10, border: "1px solid #D9534F", background: "transparent", color: "#D9534F", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>{labels.reject}</button>
        <button onClick={download} style={{ padding: "11px 22px", borderRadius: 10, border: "1px solid #C9D2CE", background: "transparent", color: "#384842", fontWeight: 600, cursor: "pointer", fontSize: 14, display:"inline-flex",alignItems:"center",gap:6 }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16"/></svg> {labels.download}</button>
      </div>
    </div>
  );
}
