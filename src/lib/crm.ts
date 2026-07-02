// Споделени CRM константи — НЕ е "use client" модул, за да могат
// и сървърни, и клиентски компоненти да ги импортират като реални стойности.

export const STATUSES = [
  { id: "lead", label: "Потенциален", color: "var(--brass)" },
  { id: "active", label: "Активен", color: "var(--emerald)" },
  { id: "vip", label: "VIP", color: "var(--navy)" },
  { id: "inactive", label: "Неактивен", color: "var(--muted)" },
  { id: "lost", label: "Загубен", color: "var(--brick)" },
];

export const STAGES = [
  { id: "new", label: "Нов" },
  { id: "contacted", label: "Осъществен контакт" },
  { id: "proposal", label: "Изпратена оферта" },
  { id: "negotiation", label: "Преговори" },
  { id: "won", label: "Спечелен" },
  { id: "lost", label: "Загубен" },
];

// icon = ключ към UiIcon/NavIcon (рендерира се като SVG в ClientCrm), без емоджита
export const TASK_TYPES = [
  { id: "call", label: "Обади се", icon: "phone" },
  { id: "email", label: "Изпрати имейл", icon: "mail" },
  { id: "offer", label: "Изпрати оферта", icon: "doc" },
  { id: "contract", label: "Изпрати договор", icon: "contracts" },
  { id: "followup", label: "Потърси клиента", icon: "bell" },
  { id: "meeting", label: "Среща", icon: "handshake" },
  { id: "other", label: "Друго", icon: "dot" },
];
