"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UiIcon } from "@/components/app/NavIcons";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/I18nProvider";
import { renderNotif } from "@/lib/i18n/notif";

const searchIcon = (type: string) => {
  if (type === "Клиент") return <UiIcon.people width={17} height={17} />;
  if (type === "Доставчик") return <UiIcon.truck width={17} height={17} />;
  return <UiIcon.doc width={17} height={17} />;
};

type SearchResult = { type: string; label: string; sub: string; href: string; icon: string };
type Vars = Record<string, string | number>;
type Notif = { id: string; type: string; titleKey?: string | null; bodyKey?: string | null; data?: unknown; title?: string | null; body?: string | null; link?: string | null; read: boolean; createdAt: string };
type Alert = { icon: string; titleKey: string; titleVars?: Vars; bodyKey?: string; bodyVars?: Vars; href: string; tone: string };

export function AppTopBar({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const { t, locale } = useI18n();
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
  // Броят за камбанката: непрочетени известия + активни предупреждения
  const badgeCount = unread + alerts.length;

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
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "inline-flex", pointerEvents: "none" }}><UiIcon.search width={16} height={16} /></span>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => results.length && setShowSearch(true)}
          placeholder={t("notifications.topbar.searchPlaceholder")}
          style={{ width: "100%", padding: "9px 14px 9px 34px", borderRadius: 10, fontSize: 13.5 }}
        />
        {showSearch && results.length > 0 && (
          <div className="glass pop-in" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, borderRadius: 12, padding: 6, zIndex: 80, maxHeight: 380, overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,.14)" }}>
            {results.map((r, i) => (
              <button key={i} onClick={() => go(r.href)} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", borderRadius: 8, textAlign: "left" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(15,138,106,.07)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <span style={{ display: "inline-flex", color: "var(--muted)" }}>{searchIcon(r.type)}</span>
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

      {/* Език */}
      <LanguageSwitcher />

      {/* Камбана */}
      <div ref={bellRef} style={{ position: "relative" }}>
        <button onClick={toggleBell} aria-label={t("notifications.topbar.bell")} style={{ position: "relative", width: 40, height: 40, borderRadius: 10, border: "1px solid var(--border)", background: "rgba(255,255,255,.6)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: badgeCount > 0 ? "var(--brick)" : "var(--ink)" }}>
          <span className={badgeCount > 0 && !open ? "bell-ring" : ""} style={{ display: "inline-flex", transformOrigin: "50% 0" }}><UiIcon.bell width={18} height={18} /></span>
          {badgeCount > 0 && <span className="bell-badge" style={{ position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, background: "var(--brick)", color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", border: "2px solid #fff" }}>{badgeCount > 99 ? "99+" : badgeCount}</span>}
        </button>
        {open && (
          <div className="glass pop-in" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, borderRadius: 14, zIndex: 80, boxShadow: "0 12px 40px rgba(0,0,0,.16)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 14, fontFamily: "'Fraunces', serif" }}>{t("notifications.topbar.title")}</div>
            <div style={{ maxHeight: 420, overflowY: "auto" }}>
              {alerts.length === 0 && notifs.length === 0 && (
                <div style={{ padding: "26px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><UiIcon.party width={22} height={22} />{t("notifications.topbar.empty")}</div>
              )}
              {alerts.map((a, i) => (
                <Link key={`a${i}`} href={a.href} onClick={() => setOpen(false)} style={row(a.tone === "warn")}>
                  <span style={{ display: "inline-flex", color: a.tone === "warn" ? "var(--brick)" : "var(--brass)" }}>{a.tone === "warn" ? <UiIcon.warning width={17} height={17} /> : <UiIcon.bell width={17} height={17} />}</span>
                  <span style={{ flex: 1 }}><span style={{ fontWeight: 600, fontSize: 13 }}>{t(a.titleKey, a.titleVars)}</span>{a.bodyKey && <div style={{ fontSize: 12, color: "var(--muted)" }}>{t(a.bodyKey, a.bodyVars)}</div>}</span>
                </Link>
              ))}
              {notifs.map((n) => {
                const { title, body } = renderNotif(t, n);
                return (
                <Link key={n.id} href={n.link ?? "/dashboard/inbox"} onClick={() => setOpen(false)} style={row(false)}>
                  <span style={{ display: "inline-flex", color: "var(--emerald-dark)" }}>{n.type === "incoming_document" ? <UiIcon.doc width={17} height={17} /> : <UiIcon.bell width={17} height={17} />}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
                    {body && <div style={{ fontSize: 12, color: "var(--muted)" }}>{body}</div>}
                    <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{new Date(n.createdAt).toLocaleString(locale)}</div>
                  </span>
                </Link>
              );})}
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
