"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SearchResult = { type: string; label: string; sub: string; href: string; icon: string };
type Notif = { id: string; type: string; title: string; body?: string | null; link?: string | null; read: boolean; createdAt: string };
type Alert = { icon: string; title: string; body?: string; href: string; tone: string };

export function AppTopBar({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  // ─── Search ───
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (r.ok) { setResults((await r.json()).results); setShowSearch(true); }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  // ─── Notifications ───
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);

  const loadNotifs = useCallback(async () => {
    const r = await fetch("/api/notifications");
    if (r.ok) { const d = await r.json(); setAlerts(d.alerts); setNotifs(d.notifications); setUnread(d.unread); }
  }, []);
  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  async function toggleBell() {
    const next = !open; setOpen(next);
    if (next) { await loadNotifs(); await fetch("/api/notifications/read", { method: "POST" }); setUnread(0); }
  }

  // затваряне при клик навън
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowSearch(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(href: string) { setShowSearch(false); setQ(""); router.push(href); }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 36px 0", justifyContent: "flex-end" }}>
      {/* Търсачка */}
      <div ref={boxRef} style={{ position: "relative", flex: 1, maxWidth: 440 }}>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => results.length && setShowSearch(true)}
          placeholder="🔍 Търси клиенти, фактури, доставчици…"
          style={{ width: "100%", padding: "9px 14px", borderRadius: 10, fontSize: 13.5 }}
        />
        {showSearch && results.length > 0 && (
          <div className="glass pop-in" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, borderRadius: 12, padding: 6, zIndex: 80, maxHeight: 380, overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,.14)" }}>
            {results.map((r, i) => (
              <button key={i} onClick={() => go(r.href)} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", borderRadius: 8, textAlign: "left" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(15,138,106,.07)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <span style={{ fontSize: 17 }}>{r.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.label}</span>
                  {r.sub && <span style={{ color: "var(--muted)", fontSize: 12 }}> · {r.sub}</span>}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{r.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Камбана */}
      <div ref={bellRef} style={{ position: "relative" }}>
        <button onClick={toggleBell} aria-label="Известия" style={{ position: "relative", width: 40, height: 40, borderRadius: 10, border: "1px solid var(--border)", background: "rgba(255,255,255,.6)", cursor: "pointer", fontSize: 18 }}>
          🔔
          {unread > 0 && <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: "var(--brick)", color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{unread}</span>}
        </button>
        {open && (
          <div className="glass pop-in" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, borderRadius: 14, zIndex: 80, boxShadow: "0 12px 40px rgba(0,0,0,.16)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 14, fontFamily: "'Fraunces', serif" }}>Известия</div>
            <div style={{ maxHeight: 420, overflowY: "auto" }}>
              {alerts.length === 0 && notifs.length === 0 && (
                <div style={{ padding: "26px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Няма нови известия 🎉</div>
              )}
              {alerts.map((a, i) => (
                <Link key={`a${i}`} href={a.href} onClick={() => setOpen(false)} style={row(a.tone === "warn")}>
                  <span style={{ fontSize: 17 }}>{a.icon}</span>
                  <span style={{ flex: 1 }}><span style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</span>{a.body && <div style={{ fontSize: 12, color: "var(--muted)" }}>{a.body}</div>}</span>
                </Link>
              ))}
              {notifs.map((n) => (
                <Link key={n.id} href={n.link ?? "/dashboard/inbox"} onClick={() => setOpen(false)} style={row(false)}>
                  <span style={{ fontSize: 17 }}>{n.type === "incoming_document" ? "📥" : "🔔"}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</span>
                    {n.body && <div style={{ fontSize: 12, color: "var(--muted)" }}>{n.body}</div>}
                    <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{new Date(n.createdAt).toLocaleString("bg-BG")}</div>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function row(warn: boolean): React.CSSProperties {
  return { display: "flex", gap: 11, alignItems: "flex-start", padding: "11px 16px", borderBottom: "1px solid rgba(217,215,200,.4)", textDecoration: "none", color: "inherit", background: warn ? "rgba(178,59,59,.04)" : "transparent" };
}
