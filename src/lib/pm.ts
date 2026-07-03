// Project Management — статуси, приоритети и връзки (на български)

export const PM_STATUSES = [
  { id: "pending", label: "Очаква възлагане", color: "#8A8578", bg: "rgba(138,133,120,.14)" },
  { id: "assigned", label: "Възложена", color: "#2C4A66", bg: "rgba(44,74,102,.12)" },
  { id: "in_progress", label: "Изпълнява се", color: "#A5812E", bg: "rgba(166,130,47,.14)" },
  { id: "review", label: "За преглед", color: "#7A5CB0", bg: "rgba(122,92,176,.14)" },
  { id: "returned", label: "Върната за корекция", color: "#A23B2B", bg: "rgba(162,59,43,.12)" },
  { id: "done", label: "Изпълнена", color: "#0F8A6A", bg: "rgba(15,138,106,.14)" },
] as const;

export const PM_PRIORITIES = [
  { id: "low", label: "Нисък", color: "#8A8578" },
  { id: "normal", label: "Нормален", color: "#2C4A66" },
  { id: "high", label: "Висок", color: "#A5812E" },
  { id: "urgent", label: "Спешен", color: "#A23B2B" },
] as const;

export const PM_STATUS_IDS = PM_STATUSES.map((s) => s.id);
export const PM_PRIORITY_IDS = PM_PRIORITIES.map((p) => p.id);

export function pmStatus(id: string) { return PM_STATUSES.find((s) => s.id === id) ?? PM_STATUSES[0]; }
export function pmPriority(id: string) { return PM_PRIORITIES.find((p) => p.id === id) ?? PM_PRIORITIES[1]; }

// Социални/уеб връзки за фирма
export const PM_LINK_FIELDS: { key: string; label: string }[] = [
  { key: "site", label: "Уебсайт" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "google", label: "Google отзиви" },
  { key: "tiktok", label: "TikTok" },
  { key: "viber", label: "Viber канал" },
  { key: "youtube", label: "YouTube канал" },
  { key: "other", label: "Други" },
];

export type BoardLinks = Record<string, string>;
export type TaskLink = { label: string; url: string };

export function parseBoardLinks(json: string | null | undefined): BoardLinks {
  if (!json) return {};
  try { const o = JSON.parse(json); return typeof o === "object" && o ? o : {}; } catch { return {}; }
}
export function parseTaskLinks(json: string | null | undefined): TaskLink[] {
  if (!json) return [];
  try { const a = JSON.parse(json); return Array.isArray(a) ? a.filter((x) => x && x.url) : []; } catch { return []; }
}
