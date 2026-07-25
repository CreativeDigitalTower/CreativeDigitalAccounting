// ─────────────────────────────────────────────────────────────────────────
// Агрегиране на Document Tracking събития → статистики (за картата на клиента
// и за аналитиката на изпращанията). Чисти функции — тествани без база.
// ─────────────────────────────────────────────────────────────────────────

export type EvtLite = { type: string; at: string | Date };
export type DocWithEvents = { events: EvtLite[]; status?: string | null };

const ms = (v: string | Date) => new Date(v).getTime();
const firstAt = (evts: EvtLite[], types: string[]): number | null => {
  const times = evts.filter((e) => types.includes(e.type)).map((e) => ms(e.at)).sort((a, b) => a - b);
  return times.length ? times[0] : null;
};
const lastAt = (evts: EvtLite[], types: string[]): number | null => {
  const times = evts.filter((e) => types.includes(e.type)).map((e) => ms(e.at)).sort((a, b) => b - a);
  return times.length ? times[0] : null;
};
const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

const OPEN_TYPES = ["email_opened", "viewed"];

export type ClientTracking = {
  avgOpenMs: number | null;
  avgPayMs: number | null;
  lastOpen: number | null;
  lastDownload: number | null;
  lastPaid: number | null;
  openRate: number | null; // 0..100
  sentCount: number;
};

/** Статистики за проследяване, обобщени за конкретен клиент (по неговите документи). */
export function computeClientTracking(docs: DocWithEvents[]): ClientTracking {
  const openDur: number[] = [];
  const payDur: number[] = [];
  let sentCount = 0, openedCount = 0;
  let lastOpen: number | null = null, lastDownload: number | null = null, lastPaid: number | null = null;

  for (const d of docs) {
    const sent = firstAt(d.events, ["sent"]);
    if (sent == null) continue;
    sentCount++;
    const open = firstAt(d.events, OPEN_TYPES);
    if (open != null) { openedCount++; if (open >= sent) openDur.push(open - sent); }
    const paid = firstAt(d.events, ["paid"]);
    if (paid != null && paid >= sent) payDur.push(paid - sent);

    const lo = lastAt(d.events, OPEN_TYPES); if (lo != null && (lastOpen == null || lo > lastOpen)) lastOpen = lo;
    const ld = lastAt(d.events, ["downloaded"]); if (ld != null && (lastDownload == null || ld > lastDownload)) lastDownload = ld;
    const lp = lastAt(d.events, ["paid"]); if (lp != null && (lastPaid == null || lp > lastPaid)) lastPaid = lp;
  }

  return {
    avgOpenMs: mean(openDur),
    avgPayMs: mean(payDur),
    lastOpen, lastDownload, lastPaid,
    openRate: sentCount ? Math.round((openedCount / sentCount) * 100) : null,
    sentCount,
  };
}

export type SendingAnalytics = { sent: number; opened: number; unopened: number; avgOpenMs: number | null; avgPayMs: number | null };

/** Обобщена аналитика на всички изпращания (за заглавието на „Изпращания"). */
export function computeSendingAnalytics(docs: DocWithEvents[]): SendingAnalytics {
  const openDur: number[] = [];
  const payDur: number[] = [];
  let sent = 0, opened = 0;
  for (const d of docs) {
    const s = firstAt(d.events, ["sent"]);
    if (s == null) continue;
    sent++;
    const o = firstAt(d.events, OPEN_TYPES);
    if (o != null) { opened++; if (o >= s) openDur.push(o - s); }
    const p = firstAt(d.events, ["paid"]);
    if (p != null && p >= s) payDur.push(p - s);
  }
  return { sent, opened, unopened: sent - opened, avgOpenMs: mean(openDur), avgPayMs: mean(payDur) };
}

export type ClientDoc = { clientId: string | null; clientName: string | null; events: EvtLite[]; status?: string | null; dueDate?: string | Date | null };

export type ClientRankings = {
  fastestPaying: { clientId: string; name: string; avgPayMs: number; paidCount: number }[];
  neverOpen: { clientId: string; name: string; sentCount: number }[];
  mostOverdue: { clientId: string; name: string; overdueCount: number }[];
};

/** Класации по клиенти: най-бързо плащащи, никога неотварящи, най-много просрочия. */
export function computeClientRankings(docs: ClientDoc[], limit = 5): ClientRankings {
  const now = Date.now();
  type Agg = { name: string; payDur: number[]; sent: number; opened: number; overdue: number };
  const map = new Map<string, Agg>();
  for (const d of docs) {
    if (!d.clientId) continue;
    const a = map.get(d.clientId) ?? { name: d.clientName ?? "—", payDur: [], sent: 0, opened: 0, overdue: 0 };
    const sent = firstAt(d.events, ["sent"]);
    if (sent != null) {
      a.sent++;
      if (firstAt(d.events, OPEN_TYPES) != null) a.opened++;
      const paid = firstAt(d.events, ["paid"]);
      if (paid != null && paid >= sent) a.payDur.push(paid - sent);
    }
    const isPaid = d.status === "paid" || d.events.some((e) => e.type === "paid");
    const overdue = d.status === "overdue" || (!!d.dueDate && new Date(d.dueDate).getTime() < now && !isPaid);
    if (overdue) a.overdue++;
    map.set(d.clientId, a);
  }

  const entries = [...map.entries()];
  const fastestPaying = entries
    .filter(([, a]) => a.payDur.length > 0)
    .map(([clientId, a]) => ({ clientId, name: a.name, avgPayMs: a.payDur.reduce((s, x) => s + x, 0) / a.payDur.length, paidCount: a.payDur.length }))
    .sort((x, y) => x.avgPayMs - y.avgPayMs)
    .slice(0, limit);
  const neverOpen = entries
    .filter(([, a]) => a.sent > 0 && a.opened === 0)
    .map(([clientId, a]) => ({ clientId, name: a.name, sentCount: a.sent }))
    .sort((x, y) => y.sentCount - x.sentCount)
    .slice(0, limit);
  const mostOverdue = entries
    .filter(([, a]) => a.overdue > 0)
    .map(([clientId, a]) => ({ clientId, name: a.name, overdueCount: a.overdue }))
    .sort((x, y) => y.overdueCount - x.overdueCount)
    .slice(0, limit);
  return { fastestPaying, neverOpen, mostOverdue };
}

/** Форматира продължителност (ms) като „{n} ч." или „{n} дни" през подадени етикети. */
export function formatDuration(ms: number | null, labels: { hours: (n: number) => string; days: (n: number) => string; na: string }): string {
  if (ms == null) return labels.na;
  const hours = ms / 3600000;
  if (hours < 48) return labels.hours(Math.max(1, Math.round(hours)));
  return labels.days(Math.round(hours / 24));
}
