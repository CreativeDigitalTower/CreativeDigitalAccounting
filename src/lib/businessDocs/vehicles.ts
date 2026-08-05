// ─────────────────────────────────────────────────────────────────────────
// Автомобилни документи по българската практика — пътни листове, отчет за
// разход на гориво по разходни норми, заповед за разходни норми, командировка
// с автомобил, приемо-предаване и дневник за пробег.
//
// Съдържат задължителните реквизити (данни за автомобила, водач, маршрут,
// начален/краен километраж, изминати км, заредено гориво, разход по норма,
// остатък, подписи). Фирмените данни и данните за автомобила се попълват
// автоматично (dataSource "vehicle"); записите се водят ръчно.
//
// Модулно: не пипа съществуващите шаблони. Регистрира се в templates.ts.
// ─────────────────────────────────────────────────────────────────────────
import type { CategoryDef, TemplateDef } from "./templates";

const P = "margin:0 0 8px;line-height:1.55;font-size:13px;";
const H = "font-family:'Fraunces',serif;text-align:center;font-size:17px;font-weight:700;margin:0 0 4px;text-transform:uppercase;";
const CELL = "border:1px solid #C9C7B6;height:24px;";
const THS = "border:1px solid #16201C;padding:5px 6px;font-size:11px;background:#F3EFE4;";

/** Хедър с фирма (авто) + данни за автомобила (авто, ако е избран). */
function vehHead(): string {
  return `
    <p style="${P}"><strong>{{Фирма.Име}}</strong>, ЕИК {{Фирма.ЕИК}}, {{Фирма.Адрес}}, {{Фирма.Град}}</p>
    <p style="${P}color:#444;">Автомобил: <strong>{{Автомобил.Марка}} {{Автомобил.Модел}}</strong>, рег. № <strong>{{Автомобил.Регистрация}}</strong> · Гориво: {{Автомобил.Гориво}} · Разходна норма: {{Автомобил.РазходнаНорма}} л/100 км</p>`;
}
function sign(left = "Съставил", right = "Управител"): string {
  return `<table style="width:100%;margin-top:26px;border-collapse:collapse;"><tr>
    <td style="width:50%;padding-top:6px;border-top:1px solid #16201C;font-size:12px;">${left}: ....................</td>
    <td style="width:6%;"></td>
    <td style="width:44%;padding-top:6px;border-top:1px solid #16201C;font-size:12px;">${right}: .................... ({{Фирма.Управител}})</td>
  </tr></table>`;
}
function tableRows(cols: number, rows: number): string {
  const tds = Array.from({ length: cols }).map(() => `<td style="${CELL}"></td>`).join("");
  return Array.from({ length: rows }).map((_, i) => `<tr><td style="border:1px solid #C9C7B6;text-align:center;font-size:11px;height:24px;">${i + 1}</td>${tds}</tr>`).join("");
}
function thead(labels: { label: string; w?: string }[]): string {
  return `<tr><th style="${THS}width:30px;">№</th>${labels.map((c) => `<th style="${THS}${c.w ? `width:${c.w};` : ""}">${c.label}</th>`).join("")}</tr>`;
}

export const VEHICLE_BUILDERS: Record<string, (v: Record<string, string>) => string> = {
  "Пътен лист (лек автомобил)": () => `
    <h1 style="${H}">Пътен лист № {{Документ.Номер}}</h1>
    <p style="text-align:center;color:#555;font-size:12px;margin:0 0 12px;">за {{ТекущаДата}} г.</p>
    ${vehHead()}
    <p style="${P}color:#444;">Водач: <span class="cda-fill" style="background:#FCEFC7;">[име на водача]</span> · Св. управление №: <span class="cda-fill" style="background:#FCEFC7;">[№]</span></p>
    <table style="width:100%;border-collapse:collapse;margin-top:8px;table-layout:fixed;">
      <thead>${thead([
        { label: "Дата", w: "10%" }, { label: "Маршрут (от – до)", w: "24%" }, { label: "Цел на пътуването", w: "16%" },
        { label: "Начален км", w: "10%" }, { label: "Краен км", w: "10%" }, { label: "Изминати км", w: "10%" },
        { label: "Заредено гориво (л)", w: "10%" },
      ])}</thead>
      <tbody>${tableRows(7, 12)}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr><td style="${THS}width:34%;">Общо изминати км</td><td style="${CELL}"></td><td style="${THS}width:34%;">Разход по норма (л)</td><td style="${CELL}"></td></tr>
      <tr><td style="${THS}">Заредено гориво общо (л)</td><td style="${CELL}"></td><td style="${THS}">Остатък в резервоара (л)</td><td style="${CELL}"></td></tr>
    </table>
    <p style="${P}margin-top:8px;color:#444;font-size:11.5px;">Разходът на гориво се изчислява по разходната норма на автомобила съгласно заповед на управителя. Пътният лист е основание за отчитане на разходите за гориво.</p>
    ${sign("Водач", "Управител")}`,

  "Пътен лист (товарен автомобил)": () => `
    <h1 style="${H}">Пътен лист — товарен автомобил № {{Документ.Номер}}</h1>
    <p style="text-align:center;color:#555;font-size:12px;margin:0 0 12px;">за {{ТекущаДата}} г.</p>
    ${vehHead()}
    <p style="${P}color:#444;">Водач: <span class="cda-fill" style="background:#FCEFC7;">[име]</span> · Ремарке рег. №: <span class="cda-fill" style="background:#FCEFC7;">[№]</span></p>
    <table style="width:100%;border-collapse:collapse;margin-top:8px;table-layout:fixed;">
      <thead>${thead([
        { label: "Дата", w: "9%" }, { label: "Маршрут (от – до)", w: "20%" }, { label: "Товар / курс", w: "15%" },
        { label: "Начален км", w: "9%" }, { label: "Краен км", w: "9%" }, { label: "Изминати км", w: "9%" },
        { label: "Тегло (т)", w: "8%" }, { label: "Гориво (л)", w: "10%" },
      ])}</thead>
      <tbody>${tableRows(8, 12)}</tbody>
    </table>
    ${sign("Водач", "Управител")}`,

  "Отчет за разход на гориво (месечен)": () => `
    <h1 style="${H}">Отчет за разход на гориво</h1>
    <p style="text-align:center;color:#555;font-size:12px;margin:0 0 12px;">за месец <span class="cda-fill" style="background:#FCEFC7;">[месец]</span> {{ТекущаГодина}} г. · № {{Документ.Номер}}</p>
    ${vehHead()}
    <p style="${P}font-weight:600;margin-top:10px;">1. Зареждания на гориво</p>
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <thead>${thead([
        { label: "Дата", w: "14%" }, { label: "Обект / бензиностанция", w: "24%" }, { label: "Количество (л)", w: "14%" },
        { label: "Ед. цена", w: "12%" }, { label: "Стойност", w: "13%" }, { label: "Фактура №", w: "16%" },
      ])}</thead>
      <tbody>${tableRows(6, 10)}</tbody>
    </table>
    <p style="${P}font-weight:600;margin-top:14px;">2. Изчисление на разхода</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="${THS}width:40%;">Начален пробег (км)</td><td style="${CELL}"></td><td style="${THS}width:40%;">Краен пробег (км)</td><td style="${CELL}"></td></tr>
      <tr><td style="${THS}">Изминати километри</td><td style="${CELL}"></td><td style="${THS}">Разходна норма (л/100 км)</td><td style="${CELL}">{{Автомобил.РазходнаНорма}}</td></tr>
      <tr><td style="${THS}">Разход по норма (л)</td><td style="${CELL}"></td><td style="${THS}">Фактически заредено (л)</td><td style="${CELL}"></td></tr>
      <tr><td style="${THS}">Остатък в резервоара — начало (л)</td><td style="${CELL}"></td><td style="${THS}">Остатък в резервоара — край (л)</td><td style="${CELL}"></td></tr>
      <tr><td style="${THS}">Признат разход за месеца (л)</td><td style="${CELL}"></td><td style="${THS}">Разлика (преразход/икономия)</td><td style="${CELL}"></td></tr>
    </table>
    <p style="${P}margin-top:8px;color:#444;font-size:11.5px;">Признатият разход се определя по разходната норма и действително изминатите километри съгласно пътните листове. Отчетът се придружава от пътните листове и фактурите за заредено гориво.</p>
    ${sign("Съставил", "Управител")}`,

  "Заповед за определяне на разходни норми за гориво": () => `
    <h1 style="${H}">Заповед № {{Документ.Номер}}</h1>
    <p style="text-align:center;color:#555;font-size:12px;margin:0 0 14px;">{{Фирма.Град}}, {{ТекущаДата}} г.</p>
    <p style="${P}">На основание чл. 10, ал. 6 от Закона за корпоративното подоходно облагане и с цел правилно отчитане на разходите за гориво,</p>
    <p style="text-align:center;font-weight:700;margin:12px 0;">ОПРЕДЕЛЯМ:</p>
    <p style="${P}"><strong>1.</strong> Разходна норма за гориво на автомобил <strong>{{Автомобил.Марка}} {{Автомобил.Модел}}</strong>, рег. № <strong>{{Автомобил.Регистрация}}</strong>, както следва:</p>
    <table style="width:100%;border-collapse:collapse;margin:6px 0;">
      <tr><td style="${THS}width:50%;">Базова разходна норма (по данни на производителя)</td><td style="${CELL}"><span class="cda-fill" style="background:#FCEFC7;">[л/100 км]</span></td></tr>
      <tr><td style="${THS}">Завишение за градско движение</td><td style="${CELL}"><span class="cda-fill" style="background:#FCEFC7;">[%]</span></td></tr>
      <tr><td style="${THS}">Завишение за зимни условия</td><td style="${CELL}"><span class="cda-fill" style="background:#FCEFC7;">[%]</span></td></tr>
      <tr><td style="${THS}">Утвърдена разходна норма</td><td style="${CELL}"><span class="cda-fill" style="background:#FCEFC7;">[л/100 км]</span></td></tr>
    </table>
    <p style="${P}"><strong>2.</strong> Разходът на гориво да се отчита на база пътни листове и действително изминати километри по утвърдената норма.</p>
    <p style="${P}"><strong>3.</strong> Контролът по изпълнението възлагам на <span class="cda-fill" style="background:#FCEFC7;">[длъжност/лице]</span>.</p>
    <p style="${P}">Заповедта влиза в сила от {{ТекущаДата}} г.</p>
    <p style="margin-top:36px;text-align:right;">Управител: .................... ({{Фирма.Управител}})</p>`,

  "Заповед за командировка с автомобил": () => `
    <h1 style="${H}">Заповед за командировка № {{Документ.Номер}}</h1>
    <p style="text-align:center;color:#555;font-size:12px;margin:0 0 14px;">{{Фирма.Град}}, {{ТекущаДата}} г.</p>
    <p style="${P}">Командировам <span class="cda-fill" style="background:#FCEFC7;">[име и длъжност]</span> до <span class="cda-fill" style="background:#FCEFC7;">[населено място]</span> за периода от <span class="cda-fill" style="background:#FCEFC7;">[дата]</span> до <span class="cda-fill" style="background:#FCEFC7;">[дата]</span> г.</p>
    <p style="${P}">Цел на командировката: <span class="cda-fill" style="background:#FCEFC7;">[цел]</span>.</p>
    <p style="${P}">Пътуването се извършва със служебен автомобил <strong>{{Автомобил.Марка}} {{Автомобил.Модел}}</strong>, рег. № <strong>{{Автомобил.Регистрация}}</strong>.</p>
    <p style="${P}">Пътните разходи (гориво по разходна норма) и дневните командировъчни са за сметка на дружеството съгласно Наредбата за командировките в страната.</p>
    <p style="margin-top:36px;text-align:right;">Управител: .................... ({{Фирма.Управител}})</p>`,

  "Приемо-предавателен протокол за автомобил": () => `
    <h1 style="${H}">Приемо-предавателен протокол за автомобил</h1>
    <p style="text-align:center;color:#555;font-size:12px;margin:0 0 12px;">№ {{Документ.Номер}} · {{Фирма.Град}}, {{ТекущаДата}} г.</p>
    <p style="${P}">Днес, {{ТекущаДата}} г., долуподписаните предаващ <span class="cda-fill" style="background:#FCEFC7;">[име]</span> и приемащ <span class="cda-fill" style="background:#FCEFC7;">[име]</span> съставиха настоящия протокол за предаване на автомобил:</p>
    <table style="width:100%;border-collapse:collapse;margin:6px 0;">
      <tr><td style="${THS}width:34%;">Марка / модел</td><td style="${CELL}">{{Автомобил.Марка}} {{Автомобил.Модел}}</td></tr>
      <tr><td style="${THS}">Регистрационен номер</td><td style="${CELL}">{{Автомобил.Регистрация}}</td></tr>
      <tr><td style="${THS}">Рама (VIN)</td><td style="${CELL}">{{Автомобил.VIN}}</td></tr>
      <tr><td style="${THS}">Показания на километража (км)</td><td style="${CELL}"></td></tr>
      <tr><td style="${THS}">Ниво на гориво</td><td style="${CELL}"></td></tr>
      <tr><td style="${THS}">Брой ключове</td><td style="${CELL}"></td></tr>
      <tr><td style="${THS}">Документи (талон, застраховки, ГТП)</td><td style="${CELL}"></td></tr>
      <tr><td style="${THS}">Видими повреди / забележки</td><td style="${CELL}"></td></tr>
    </table>
    ${sign("Предал", "Приел")}`,

  "Дневник за пробег и експлоатация": () => `
    <h1 style="${H}">Дневник за пробег и експлоатация</h1>
    <p style="text-align:center;color:#555;font-size:12px;margin:0 0 12px;">№ {{Документ.Номер}}</p>
    ${vehHead()}
    <table style="width:100%;border-collapse:collapse;margin-top:8px;table-layout:fixed;">
      <thead>${thead([
        { label: "Дата", w: "11%" }, { label: "Водач", w: "16%" }, { label: "Начален км", w: "11%" },
        { label: "Краен км", w: "11%" }, { label: "Изминати км", w: "11%" }, { label: "Гориво (л)", w: "10%" },
        { label: "Забележка", w: "20%" },
      ])}</thead>
      <tbody>${tableRows(7, 16)}</tbody>
    </table>
    ${sign("Съставил", "Управител")}`,
};

const VEHICLE_TITLES = Object.keys(VEHICLE_BUILDERS);

export const VEHICLE_CATEGORY: CategoryDef = {
  id: "vehicles",
  title: "Автомобили и гориво",
  icon: "",
  description: "Пътни листове, отчет за разход на гориво по разходни норми, заповеди за разходни норми, командировки и приемо-предаване — по българската практика.",
  country: "BG",
  dataSource: "vehicle",
  templates: VEHICLE_TITLES.map((title): TemplateDef => ({
    title,
    complexity: "medium",
    estMinutes: "2–3 минути",
    userFields: ["Водач и маршрут", "Километраж и заредено гориво", "Подписи"],
    dataSource: "vehicle",
  })),
};
