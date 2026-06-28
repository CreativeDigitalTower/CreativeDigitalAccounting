import { applyVariables, resolveVariables, type VariableContext } from "./variables";

export type Complexity = "easy" | "medium" | "detailed";

export type TemplateDef = {
  title: string;
  description?: string;
  whenToUse?: string;
  complexity?: Complexity;
  estMinutes?: string;
  userFields?: string[];
  build?: (v: Record<string, string>) => string;
};

export type CategoryDef = {
  id: string;
  title: string;
  icon: string;
  description: string;
  templates: TemplateDef[];
};

export type Template = TemplateDef & {
  id: string;
  categoryId: string;
  categoryTitle: string;
  categoryIcon: string;
  version: number;
  description: string;
  whenToUse: string;
  complexity: Complexity;
  estMinutes: string;
  autoFields: string[];
  userFields: string[];
};

// ─── Помощни функции за изграждане на тялото на документа ───
const P = "margin:0 0 10px;line-height:1.6;";
const H = "font-family:'Fraunces',serif;text-align:center;font-size:18px;font-weight:700;margin:0 0 4px;text-transform:uppercase;";

function head(extra = ""): string {
  return `<p style="${P}"><strong>{{Фирма.Име}}</strong>, ЕИК {{Фирма.ЕИК}}, {{Фирма.Адрес}}, {{Фирма.Град}}, представлявано от {{Фирма.Управител}}${extra}</p>`;
}
function meta(): string {
  return `<p style="text-align:center;color:#555;font-size:13px;margin:0 0 18px;">№ {{Документ.Номер}} · {{Място}}, {{ТекущаДата}}</p>`;
}
function signatures(left = "Възложител", right = "Изпълнител"): string {
  return `<table style="width:100%;margin-top:48px;border-collapse:collapse;"><tr>
<td style="width:50%;text-align:center;padding-top:6px;border-top:1px solid #16201C;">${left}: ............................</td>
<td style="width:6%;"></td>
<td style="width:44%;text-align:center;padding-top:6px;border-top:1px solid #16201C;">${right}: ............................</td></tr></table>`;
}

// Универсален генератор — професионален структуриран документ, ако няма специфичен builder
function genericBody(title: string): string {
  return `
    <h1 style="${H}">${title}</h1>
    ${meta()}
    ${head()}
    <p style="${P}">Настоящият документ „${title}" се издава от {{Фирма.Име}} за целите на стопанската ѝ дейност.</p>
    <p style="${P}"><strong>Предмет:</strong> {{Предмет}}</p>
    <p style="${P}">Съдържание и условия:</p>
    <ol>
      <li style="margin-bottom:6px;">{{Предмет}}</li>
      <li style="margin-bottom:6px;">Срок: {{Срок}}</li>
      <li style="margin-bottom:6px;">Стойност / условия: {{Сума}}</li>
      <li style="margin-bottom:6px;">Допълнителни уговорки: ........................................................</li>
    </ol>
    <p style="${P}">Документът е съставен и подписан на {{ТекущаДата}} в {{Място}}.</p>
    ${signatures()}
  `;
}

// ─── Специфични шаблони (професионална структура) ───
const CUSTOM: Record<string, (v: Record<string, string>) => string> = {
  "Споразумение за конфиденциалност (NDA)": () => `
    <h1 style="${H}">Споразумение за конфиденциалност (NDA)</h1>
    ${meta()}
    <p style="${P}">Днес, {{ТекущаДата}} в {{Място}}, между:</p>
    <p style="${P}"><strong>1. {{Фирма.Име}}</strong>, ЕИК {{Фирма.ЕИК}}, със седалище {{Фирма.Адрес}}, представлявано от {{Фирма.Управител}} (наричана „Разкриваща страна"), и</p>
    <p style="${P}"><strong>2. {{Клиент.Име}}</strong>, ЕИК {{Клиент.ЕИК}}, адрес {{Клиент.Адрес}} (наричана „Получаваща страна"),</p>
    <p style="${P}">се сключи настоящото споразумение за следното:</p>
    <p style="${P}"><strong>Чл. 1. Поверителна информация.</strong> Страните се задължават да пазят в тайна всяка търговска, техническа, финансова и друга информация, разменена във връзка със сътрудничеството им.</p>
    <p style="${P}"><strong>Чл. 2. Задължения.</strong> Получаващата страна няма право да разкрива, копира или използва поверителната информация за цели извън договореното сътрудничество.</p>
    <p style="${P}"><strong>Чл. 3. Срок.</strong> Задължението за конфиденциалност е валидно за срок от {{Срок}} след прекратяване на отношенията между страните.</p>
    <p style="${P}"><strong>Чл. 4. Отговорност.</strong> При нарушение виновната страна дължи обезщетение за всички претърпени вреди.</p>
    ${signatures("Разкриваща страна", "Получаваща страна")}
  `,
  "Пълномощно": () => `
    <h1 style="${H}">Пълномощно</h1>
    ${meta()}
    <p style="${P}">Долуподписаният <strong>{{Фирма.Управител}}</strong>, в качеството си на управител на <strong>{{Фирма.Име}}</strong>, ЕИК {{Фирма.ЕИК}}, със седалище {{Фирма.Адрес}},</p>
    <p style="${P}">с настоящото <strong>УПЪЛНОМОЩАВАМ</strong>:</p>
    <p style="${P}"><span class="cda-fill" style="background:#FCEFC7;">[Име на упълномощеното лице]</span>, ЕГН <span class="cda-fill" style="background:#FCEFC7;">[ЕГН]</span>, с лична карта № <span class="cda-fill" style="background:#FCEFC7;">[№]</span>,</p>
    <p style="${P}">да представлява дружеството пред: <span class="cda-fill" style="background:#FCEFC7;">[институции / лица]</span> и да извършва следните действия от негово име:</p>
    <ol><li>........................................................</li><li>........................................................</li></ol>
    <p style="${P}">Пълномощното е валидно до {{Срок}}.</p>
    <p style="${P}" >Дата: {{ТекущаДата}}</p>
    <p style="margin-top:40px;text-align:right;">Упълномощител: ............................ ({{Фирма.Управител}})</p>
  `,
  "Решение на едноличния собственик": () => `
    <h1 style="${H}">Решение на едноличния собственик на капитала</h1>
    ${meta()}
    <p style="${P}">Долуподписаният {{Фирма.Управител}}, в качеството си на едноличен собственик на капитала на <strong>{{Фирма.Име}}</strong>, ЕИК {{Фирма.ЕИК}}, със седалище и адрес на управление {{Фирма.Адрес}}, {{Фирма.Град}},</p>
    <p style="${P}">на основание чл. 147 от Търговския закон, взех следното</p>
    <p style="text-align:center;font-weight:700;margin:14px 0;">РЕШЕНИЕ:</p>
    <ol>
      <li style="margin-bottom:8px;">........................................................</li>
      <li style="margin-bottom:8px;">........................................................</li>
    </ol>
    <p style="${P}">Настоящото решение е съставено на {{ТекущаДата}} в {{Място}}.</p>
    <p style="margin-top:40px;text-align:right;">Едноличен собственик: ............................ ({{Фирма.Управител}})</p>
  `,
  "Заповед": () => `
    <h1 style="${H}">Заповед № {{Документ.Номер}}</h1>
    ${meta()}
    ${head()}
    <p style="${P}">На основание правомощията ми като управител на {{Фирма.Име}},</p>
    <p style="text-align:center;font-weight:700;margin:14px 0;">НАРЕЖДАМ:</p>
    <ol><li style="margin-bottom:8px;">........................................................</li><li style="margin-bottom:8px;">Контрол по изпълнението възлагам на ........................................................</li></ol>
    <p style="${P}">Заповедта влиза в сила от {{ТекущаДата}}.</p>
    <p style="margin-top:40px;text-align:right;">Управител: ............................ ({{Фирма.Управител}})</p>
  `,
  "Трудов договор": () => `
    <h1 style="${H}">Трудов договор № {{Документ.Номер}}</h1>
    ${meta()}
    <p style="${P}">Днес, {{ТекущаДата}} в {{Място}}, на основание чл. 67, ал. 1 от Кодекса на труда, между:</p>
    <p style="${P}"><strong>РАБОТОДАТЕЛ:</strong> {{Фирма.Име}}, ЕИК {{Фирма.ЕИК}}, представлявано от {{Фирма.Управител}}, и</p>
    <p style="${P}"><strong>СЛУЖИТЕЛ:</strong> {{Служител.Име}}, ЕГН {{Служител.ЕГН}}, се сключи настоящият договор:</p>
    <p style="${P}"><strong>Чл. 1.</strong> Служителят се назначава на длъжност <strong>{{Служител.Длъжност}}</strong>.</p>
    <p style="${P}"><strong>Чл. 2.</strong> Основно месечно трудово възнаграждение: {{Сума}} лв.</p>
    <p style="${P}"><strong>Чл. 3.</strong> Работно време: пълно, 8 часа дневно. Платен годишен отпуск: 20 работни дни.</p>
    <p style="${P}"><strong>Чл. 4.</strong> Договорът влиза в сила от {{Срок}}.</p>
    ${signatures("Работодател", "Служител")}
  `,
  "Оферта": () => `
    <h1 style="${H}">Оферта № {{Документ.Номер}}</h1>
    ${meta()}
    <p style="${P}"><strong>От:</strong> {{Фирма.Име}}, ЕИК {{Фирма.ЕИК}}, {{Фирма.Адрес}} · тел. {{Фирма.Телефон}} · {{Фирма.Email}}</p>
    <p style="${P}"><strong>До:</strong> {{Клиент.Име}}</p>
    <p style="${P}">Уважаеми клиенти, представяме Ви нашата оферта:</p>
    <table style="width:100%;border-collapse:collapse;margin:10px 0;">
      <tr style="background:#0F8A6A;color:#fff;"><th style="padding:6px;border:1px solid #ccc;text-align:left;">Описание</th><th style="padding:6px;border:1px solid #ccc;">Кол.</th><th style="padding:6px;border:1px solid #ccc;">Ед. цена</th><th style="padding:6px;border:1px solid #ccc;">Сума</th></tr>
      <tr><td style="padding:6px;border:1px solid #ccc;">{{Предмет}}</td><td style="padding:6px;border:1px solid #ccc;text-align:center;">1</td><td style="padding:6px;border:1px solid #ccc;text-align:right;">{{Сума}}</td><td style="padding:6px;border:1px solid #ccc;text-align:right;">{{Сума}}</td></tr>
    </table>
    <p style="${P}">Срок на валидност на офертата: {{Срок}}.</p>
    <p style="margin-top:40px;text-align:right;">С уважение, {{Фирма.Управител}} ({{Фирма.Име}})</p>
  `,
  "Искане за плащане": () => `
    <h1 style="${H}">Искане за плащане № {{Документ.Номер}}</h1>
    ${meta()}
    <p style="${P}"><strong>От:</strong> {{Фирма.Име}}, ЕИК {{Фирма.ЕИК}}</p>
    <p style="${P}"><strong>До:</strong> {{Клиент.Име}}</p>
    <p style="${P}">Уважаеми партньори, моля да преведете дължимата сума в размер на <strong>{{Сума}}</strong> за {{Предмет}}.</p>
    <p style="${P}">Срок за плащане: {{Срок}}. Плащането може да бъде извършено по банков път по сметката на дружеството.</p>
    <p style="margin-top:40px;text-align:right;">{{Фирма.Управител}}, {{Фирма.Име}}</p>
  `,
  "Молба за отпуск": () => `
    <p style="${P}text-align:right;">До Управителя на<br/>{{Фирма.Име}}</p>
    <h1 style="${H}">Молба за отпуск</h1>
    ${meta()}
    <p style="${P}">От {{Служител.Име}}, на длъжност {{Служител.Длъжност}}.</p>
    <p style="${P}">Моля да ми бъде разрешен платен годишен отпуск в размер на <span class="cda-fill" style="background:#FCEFC7;">[брой]</span> работни дни, считано от <span class="cda-fill" style="background:#FCEFC7;">[дата]</span> до <span class="cda-fill" style="background:#FCEFC7;">[дата]</span>.</p>
    <p style="${P}">Дата: {{ТекущаДата}}</p>
    <p style="margin-top:36px;text-align:right;">Подпис: ............................</p>
  `,
  "SWOT анализ": () => `
    <h1 style="${H}">SWOT анализ — {{Фирма.Име}}</h1>
    ${meta()}
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:50%;border:1px solid #0F8A6A;padding:12px;vertical-align:top;"><strong style="color:#0F8A6A;">Силни страни (Strengths)</strong><ul><li>........................</li><li>........................</li></ul></td>
        <td style="width:50%;border:1px solid #A23B2B;padding:12px;vertical-align:top;"><strong style="color:#A23B2B;">Слаби страни (Weaknesses)</strong><ul><li>........................</li><li>........................</li></ul></td>
      </tr>
      <tr>
        <td style="border:1px solid #2C4A66;padding:12px;vertical-align:top;"><strong style="color:#2C4A66;">Възможности (Opportunities)</strong><ul><li>........................</li><li>........................</li></ul></td>
        <td style="border:1px solid #A5812E;padding:12px;vertical-align:top;"><strong style="color:#A5812E;">Заплахи (Threats)</strong><ul><li>........................</li><li>........................</li></ul></td>
      </tr>
    </table>
  `,
};

// ─── Категории и техните шаблони ───
export const CATEGORIES: CategoryDef[] = [
  { id: "company", title: "Фирмени документи", icon: "🏢", description: "Решения, заповеди, протоколи и пълномощни.",
    templates: ["Решение на едноличния собственик", "Решение на управителя", "Протокол от общо събрание", "Заповед", "Вътрешна заповед", "Пълномощно", "Служебна бележка", "Вътрешно уведомление", "Декларация", "Протокол"].map((t) => ({ title: t })) },
  { id: "contracts", title: "Договори", icon: "📝", description: "Готови договори за услуги, доставка, наем и партньорство.",
    templates: ["Договор за услуга", "Договор за покупко-продажба", "Договор за доставка", "Договор за наем", "Договор за консултантски услуги", "Договор за маркетингови услуги", "Договор за абонаментно обслужване", "Договор с доставчик", "Договор за партньорство", "Споразумение за конфиденциалност (NDA)", "Договор за поверителност", "Анекс към договор", "Прекратяване на договор"].map((t) => ({ title: t, complexity: "detailed" as Complexity })) },
  { id: "hr", title: "Персонал", icon: "👔", description: "Трудови и граждански договори, заповеди и характеристики.",
    templates: ["Трудов договор", "Граждански договор", "Длъжностна характеристика", "Молба за отпуск", "Заповед за отпуск", "Заповед за командировка", "Заповед за прекратяване", "Атестация на служител", "Приемо-предавателен протокол", "Служебна характеристика"].map((t) => ({ title: t })) },
  { id: "finance", title: "Финансови документи", icon: "💶", description: "Бизнес финансови документи — искания, разписки, отчети.",
    templates: ["Искане за плащане", "Потвърждение за плащане", "Разписка", "Искане за аванс", "Бюджет", "Отчет за разходи", "Отчет за паричен поток"].map((t) => ({ title: t })) },
  { id: "clients", title: "Клиенти", icon: "🤝", description: "Оферти, ценови предложения и протоколи към клиенти.",
    templates: ["Оферта", "Ценово предложение", "Потвърждение на поръчка", "Приемо-предавателен протокол (клиент)", "Констативен протокол"].map((t) => ({ title: t })) },
  { id: "suppliers", title: "Доставчици", icon: "🚚", description: "Заявки, поръчки и приемане на доставки.",
    templates: ["Заявка", "Поръчка", "Договор с доставчик", "Приемане на доставка", "Протокол (доставчик)"].map((t) => ({ title: t })) },
  { id: "gdpr", title: "GDPR", icon: "🔏", description: "Документи за защита на личните данни.",
    templates: ["Съгласие за обработване на лични данни", "Информационно уведомление", "Искане за достъп до лични данни", "Искане за изтриване на лични данни", "Регистър за обработване"].map((t) => ({ title: t, complexity: "medium" as Complexity })) },
  { id: "inventory", title: "Инвентаризация", icon: "📦", description: "Описи и протоколи за инвентаризация.",
    templates: ["Инвентаризационен опис", "Опис на наличности", "Протокол за липси", "Протокол за излишъци", "Протокол за бракуване"].map((t) => ({ title: t })) },
  { id: "vehicles", title: "Автомобили", icon: "🚗", description: "Пътни листове, отчети за гориво и командировки.",
    templates: ["Пътен лист", "Отчет за гориво", "Командировка", "Приемо-предаване на автомобил"].map((t) => ({ title: t })) },
  { id: "construction", title: "Строителство", icon: "🏗️", description: "Протоколи за приемане и извършени дейности.",
    templates: ["Констативен протокол (строителство)", "Протокол за приемане", "Протокол за извършени дейности", "Протокол за завършен обект"].map((t) => ({ title: t })) },
  { id: "production", title: "Производство", icon: "🏭", description: "Производствени поръчки и контролни листове.",
    templates: ["Производствена поръчка", "Производствен лист", "Контролен лист (производство)"].map((t) => ({ title: t })) },
  { id: "projects", title: "Проекти", icon: "📋", description: "Планове, задания и отчети по проекти.",
    templates: ["План на проект", "Протокол от среща", "Задание", "Отчет по проект"].map((t) => ({ title: t })) },
  { id: "marketing", title: "Маркетинг", icon: "📣", description: "Брифове, медийни планове и отчети за кампании.",
    templates: ["Маркетингов бриф", "Креативен бриф", "Медиен план", "Отчет за кампания", "Контент план"].map((t) => ({ title: t })) },
  { id: "legal", title: "Правни документи", icon: "⚖️", description: "Покани, уведомления, предизвестия и искания.",
    templates: ["Покана", "Уведомление", "Предизвестие", "Искане"].map((t) => ({ title: t })) },
  { id: "bank", title: "Банкови документи", icon: "🏦", description: "Искания за банкови гаранции и потвърждения.",
    templates: ["Искане за банкова гаранция", "Банково потвърждение", "Платежно нареждане (информационен шаблон)"].map((t) => ({ title: t })) },
  { id: "iso", title: "ISO документи", icon: "✅", description: "Контролни листове, доклади и вътрешни одити.",
    templates: ["Контролен лист (ISO)", "Доклад за несъответствие", "Вътрешен одит"].map((t) => ({ title: t })) },
  { id: "policies", title: "Фирмени политики", icon: "📑", description: "Политики за сигурност, GDPR, отпуски и етичен кодекс.",
    templates: ["Политика за сигурност", "Политика за защита на личните данни", "Политика за отпуските", "Етичен кодекс", "Вътрешни правила"].map((t) => ({ title: t, complexity: "detailed" as Complexity })) },
  { id: "analysis", title: "Бизнес анализи", icon: "📊", description: "SWOT, PESTEL, Canvas и матрици на риска.",
    templates: ["SWOT анализ", "PESTEL анализ", "Business Model Canvas", "Lean Canvas", "Матрица на риска", "KPI отчет"].map((t) => ({ title: t })) },
  { id: "letters", title: "Писма", icon: "✉️", description: "Делови писма до клиенти, доставчици и институции.",
    templates: ["Писмо до клиент", "Писмо до доставчик", "Писмо до служител", "Писмо до институция"].map((t) => ({ title: t, complexity: "easy" as Complexity })) },
  { id: "protocols", title: "Протоколи", icon: "🗒️", description: "Приемо-предавателни и констативни протоколи.",
    templates: ["Приемо-предавателен протокол", "Констативен протокол", "Протокол от среща", "Приемателен протокол"].map((t) => ({ title: t })) },
  { id: "forms", title: "Формуляри", icon: "📋", description: "Заявления, искания, жалби и сигнали.",
    templates: ["Заявление", "Искане (формуляр)", "Жалба", "Сигнал"].map((t) => ({ title: t, complexity: "easy" as Complexity })) },
  { id: "declarations", title: "Декларации", icon: "📜", description: "Най-често използваните бизнес декларации.",
    templates: ["Декларация по образец", "Декларация за съгласие", "Декларация за свързани лица", "Декларация за достоверност", "Декларация за липса на конфликт на интереси"].map((t) => ({ title: t })) },
  { id: "correspondence", title: "Кореспонденция", icon: "💬", description: "Имейл шаблони, покани и благодарствени писма.",
    templates: ["Имейл шаблон", "Покана", "Благодарствено писмо"].map((t) => ({ title: t, complexity: "easy" as Complexity })) },
];

const DEFAULT_AUTO = ["Име на фирмата", "ЕИК", "Адрес", "Управител", "Дата", "Номер на документа"];

// Плоска, индексирана библиотека (id-та са стабилни докато редът не се променя — добавяй в края)
export const TEMPLATES: Template[] = CATEGORIES.flatMap((cat) =>
  cat.templates.map((t, i): Template => ({
    ...t,
    id: `${cat.id}-${i + 1}`,
    categoryId: cat.id,
    categoryTitle: cat.title,
    categoryIcon: cat.icon,
    version: 1,
    description: t.description ?? `Готов професионален шаблон „${t.title}", който се попълва автоматично с данните на вашата фирма.`,
    whenToUse: t.whenToUse ?? `Използвайте „${t.title}", когато Ви е необходим официален документ от този тип за дейността на фирмата.`,
    complexity: t.complexity ?? "medium",
    estMinutes: t.estMinutes ?? "около 2–3 минути",
    autoFields: DEFAULT_AUTO,
    userFields: t.userFields ?? ["Конкретни данни според случая", "Страни / получател", "Предмет и условия"],
  }))
);

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getCategory(id: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

/** Генерира HTML на документа от шаблон + автоматично попълнени фирмени данни. */
export function buildDocumentHtml(template: Template, ctx: VariableContext): string {
  const vars = resolveVariables(ctx);
  const raw = (CUSTOM[template.title] ?? (() => genericBody(template.title)))(vars);
  return applyVariables(raw, vars);
}

export const RECOMMENDED_IDS = ["contracts-1", "contracts-10", "hr-1", "company-6", "clients-1", "finance-1"];
