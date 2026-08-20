/**
 * Реалният автопарк на клиента с цимент (от текущия работен регистър). Company-scoped —
 * импортира се САМО за конкретния Logistics tenant, идемпотентно (§33). Липсващи данни
 * остават празни — не се изобретяват (§34). Комбо „ВЛЕКАЧ / РЕМАРКЕ" се разделя при импорт.
 */
export type FleetConfig = {
  combo: string;              // „TRUCK / TRAILER"
  driver?: string | null;
  phone?: string | null;
  maxPayloadTons?: number | null;
  cargoMode?: "bulk" | "bags" | "";
};
export type FleetCarrier = { carrier: string; configs: FleetConfig[] };

const BAGS = 23.8; // стандартен товар при торби (17×56×25kg)

export const CEMENT_FLEET: FleetCarrier[] = [
  { carrier: "ТргоМетал", configs: [
    { combo: "SK3362AB / SK939TH", driver: "Сашо Митковски", maxPayloadTons: 26.5, cargoMode: "bulk" },
    { combo: "SK498SL / SK5020AE", driver: "Слободан Митковски", maxPayloadTons: 26.5, cargoMode: "bulk" },
    { combo: "SK501TO / SK5022AE", driver: "Борис Николовски", maxPayloadTons: 26.5, cargoMode: "bulk" },
    { combo: "SK581TO / SK728SV", driver: "Митко Трайковски", maxPayloadTons: 26.5, cargoMode: "bulk" },
    { combo: "SK6539AO / SK891TR", driver: "Душко Алексовски", maxPayloadTons: 26.5, cargoMode: "bulk" },
    { combo: "SK7331AU / SK842SV", driver: "Аце Николовски", maxPayloadTons: 26, cargoMode: "bulk" },
    { combo: "SK7503BV / SK1986AB", driver: "Деян Стояновски", maxPayloadTons: 26, cargoMode: "bulk" },
    { combo: "SK832UU / SK5021AE", driver: "Лазе Стефковски", maxPayloadTons: 26.5, cargoMode: "bulk" },
    { combo: "SK349TF / SK1986AB", driver: "Лазе Стефковски", maxPayloadTons: 26, cargoMode: "bulk" },
    { combo: "SK583VR / SK1984AB", driver: "Бранко Блажевски", maxPayloadTons: 26.5, cargoMode: "bulk" },
    { combo: "SK987RN / SK842SV", driver: "Душко Алексовски", maxPayloadTons: 26.5, cargoMode: "bulk" },
  ]},
  { carrier: "Гриц", configs: [
    { combo: "SK3832BO / SK7430BI", driver: "Сашо Кочовски", maxPayloadTons: 28, cargoMode: "bulk" },
    { combo: "SK9891BD / SK9836AD", driver: "Драги Блажевски", maxPayloadTons: 27.5, cargoMode: "bulk" },
    { combo: "SK8565BD / SK9373AS", driver: "Игор Кръстановски", maxPayloadTons: 27.5, cargoMode: "bulk" },
    { combo: "SK5189BA / SK4233BL", driver: "Бобан Кръстановски", maxPayloadTons: 27.5, cargoMode: "bulk" },
    { combo: "SK2562AB / SK9836AD", driver: "Трайче Димишковски", maxPayloadTons: 27.5, cargoMode: "bulk" },
    { combo: "SK0325AN / SK838TR", driver: "Енвер Карбардович", maxPayloadTons: 27.5, cargoMode: "bulk" },
  ]},
  { carrier: "Trans", configs: [
    { combo: "СВ0024СА / С6811ЕМ", driver: "ТОДОР ТОДОРОВ", phone: "0893517172" },
    { combo: "СВ0638АТ / СВ2763ЕА", driver: "АНДРЕЙ АНДРЕЕВ", phone: "0887592212" },
    { combo: "CB0639AT / CB2649EA", driver: "МИРОСЛАВ ВАСИЛЕВ", phone: "0886511145" },
    { combo: "CB1522CK / CB3478EA", driver: "ИВАЙЛО АНГЕЛОВ", phone: "0877475660" },
    { combo: "CB1639AH / CB2944EA", driver: "Радостин Димитров", phone: "0886887585" },
    { combo: "CB4986PX / C5826EM", driver: "СВЕТОМИР ПЕТРОВ", phone: "0882023141" },
    { combo: "СВ5038BB / СB2762EA", driver: "ТРАЯН ВЪРБАНОВ", phone: "0899611640" },
    { combo: "CB6215AH / CB2945EA", driver: "ВИКТОР НИНОВ", phone: "0877660539" },
    { combo: "СВ7765PP / C5985EM", driver: "ХРИСТО СПИРИДОНОВ", phone: "0898930483" },
    { combo: "СВ8055CK / CB0094EA", driver: "Димитър Даскалов", phone: "0888407275" },
    { combo: "СВ8296HE / B5248EH", driver: "АНГЕЛ АЛЕКСАНДРОВ", phone: "0878645247" },
    { combo: "СВ9927PH / C5826EM", driver: "ИВАЙЛО АНГЕЛОВ", phone: "0884893762" },
  ]},
  { carrier: "Адо", configs: [
    { combo: "SK264PU / SK6982AV", driver: "Адмир Личина", maxPayloadTons: 27, cargoMode: "bulk" },
  ]},
  { carrier: "Ископ", configs: [
    { combo: "ST2899AE / ST9339AD", driver: "Ненад Стаменковски", maxPayloadTons: 26.5, cargoMode: "bulk" },
  ]},
  { carrier: "Tanigo Sped", configs: [
    { combo: "SK3771BU / SK4315BT", driver: "Бранко Блажевски", maxPayloadTons: 28.5, cargoMode: "bulk" },
    { combo: "SK0952AR / SK4736AN", driver: "Виктор Горгиевски", maxPayloadTons: 27.5, cargoMode: "bulk" },
  ]},
  { carrier: "Ненад ПОКО", configs: [
    { combo: "SR5455AE / SR1096AE", driver: "Боро Ристов", maxPayloadTons: 24.5, cargoMode: "bulk" },
    { combo: "SR5330AE / OS23GF", driver: "Георги Захов", maxPayloadTons: 26.5, cargoMode: "bulk" },
  ]},
  { carrier: "ДАЦ-МИ", configs: [
    { combo: "ST8344AC / ST8717AD", driver: "Роберт Лазаров", maxPayloadTons: 26, cargoMode: "bulk" },
    { combo: "ST5052AD / ST8717AD", driver: "Никола Кръстевски", maxPayloadTons: 26, cargoMode: "bulk" },
    { combo: "ST1344AD / ST0215AE", driver: "Благой Яневски", maxPayloadTons: 26.5, cargoMode: "bulk" },
    { combo: "ST9838AC / ST8648AC", driver: "Горан Янков", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "ST6044AC / ST5153AD", driver: "Никола Кръстевски", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "ST6044AC / ST6831AB", driver: "Никола Кръстевски", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "ST5052AD / ST8741AD", driver: "Коле Грбев", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "ST1344AD / ST8648AC", driver: "Никола Кръстевски", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "ST6044AC / ST8741AD", driver: "Горан Янков", maxPayloadTons: BAGS, cargoMode: "bags" },
  ]},
  { carrier: "UNIK", configs: [
    { combo: "KO2670AC / KO7098AB", driver: "Иле Ефремов", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "KH7175KB / KH2551EE", driver: "Дарко Павловски", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "KP4622AC / KP8465AB", driver: null, maxPayloadTons: BAGS, cargoMode: "bags" },
  ]},
  { carrier: "ПЦ ТРАНС", configs: [
    { combo: "KH7406BA / KH0271EE", driver: "Тони Ристовски", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "KH7406BA / CB2137EA", driver: "Тони Ристовски", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "CB7559KA / KH1631EE", driver: "Зоран Вучевски", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PS3388AB / PS1205AB", driver: null, maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PS3477AB / PS4141AB", driver: null, maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "KP4622AC / KP8465AB", driver: null, maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "KH6769KB / KH1704EE", driver: null, maxPayloadTons: BAGS, cargoMode: "bags" },
  ]},
  { carrier: "ЛАВ СПЕД", configs: [
    { combo: "KH8165KA / KH1296EE", driver: "Александър Пешовски", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "KH4788KB / KH2765EE", driver: "Филип Пешовски", maxPayloadTons: BAGS, cargoMode: "bags" },
  ]},
  { carrier: "Дако Шпед", configs: [
    { combo: "KH2069BM / KH0190EE", driver: "Далибор Китановски", maxPayloadTons: BAGS, cargoMode: "bags" },
  ]},
  { carrier: "ВАР", configs: [
    { combo: "05-971-FE / 05-506-TA", driver: "Mentor curri", phone: "00383 49143994" },
  ]},
  { carrier: "Косово", configs: [
    { combo: "PK-080-DJ / 01-144-XD", driver: "Миодраг Стошич", maxPayloadTons: 26.5, cargoMode: "bulk" },
    { combo: "PK-080-ES / AC-306-PK", driver: "Миодраг Стошич", maxPayloadTons: null, cargoMode: "bulk" },
    { combo: "04-817-KE / 05-721-XB", driver: null, maxPayloadTons: null, cargoMode: "bulk" },
    { combo: "05-969-FB / 05-816-TA", driver: null, maxPayloadTons: null, cargoMode: "bulk" },
    { combo: "PK-092-PD / 05-721-XB", driver: null, maxPayloadTons: null, cargoMode: "bulk" },
    { combo: "01-139-PK / 01-772-TA", driver: "Миодраг Стошич", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "01-216-PO / 01-566-TA", driver: "Гани Зумери", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "04-817-KE / 05-721-VB", driver: "Масар Шейху", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "SK6918BN / SK5812AJ", driver: "Горан Митрович", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "SK7644BL / SK5227BK", driver: "Синиша Стоянов", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "SK9010BG / SK9105BE", driver: "Периша Пешевски", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "05-150-FE / 05-702-TA", driver: "Мухарем Ферати", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "05-168-FK / 05-727-TA", driver: "Мирсад Хюсеней", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "05-157-GQ / 05-787-TA", driver: "Шукри Салиху", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "01-138-SQ / 01-225-XC", driver: "Шукри Салиху", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "01-316-GQ / 01-110-TA", driver: "Шукри Салиху", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PK-060-NL / AC-283-PK", driver: "Шукри Салиху", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PK-067-XD / AB-881-PK", driver: "Миодраг Стошич", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PK-080-ES / AC-306-PK", driver: "Миодраг Стошич", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PK-081-AE / AA-925-PK", driver: "Александър Драмичанин", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PK-089-ZD / AC-287-PK", driver: "Шукри Салиху", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PK-090-AX / AC-283-PK", driver: "Шукри Салиху", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PK-090-MI / AC-167-PK", driver: "Шукри Салиху", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PK-092-PD / AB-881-PK", driver: "Никола Милосавлевич", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PK-093-PA / AC-111-PK", driver: "Шукри Салиху", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PK-099-AX / AC-099-PK", driver: "Шукри Салиху", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "PK-102-SN / AC-310-PK", driver: "Шукри Салиху", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "VB-450-UZ / AA-815-VB", driver: "Йован Аршич", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "VB-038-ZF / AA-677-VB", driver: "Йован Аршич", maxPayloadTons: BAGS, cargoMode: "bags" },
    { combo: "VR-144-DP / AC-645-VR", driver: "Йован Аршич", maxPayloadTons: BAGS, cargoMode: "bags" },
  ]},
  { carrier: "Дони", configs: [
    { combo: "DB6847AB / DB5873AB", driver: null, maxPayloadTons: 28, cargoMode: "bulk" },
  ]},
  { carrier: "Мусала", configs: [
    { combo: "CB5959AM / C2927EC", driver: "Стефан Василев", maxPayloadTons: 26, cargoMode: "bulk" },
    { combo: "CB5175CM / C7351EK", driver: "Йордан Йовчев", maxPayloadTons: 26.5, cargoMode: "bulk" },
    { combo: "CB4979PC / C9515EH", driver: "Росен Айвазов", maxPayloadTons: 26.5, cargoMode: "bulk" },
    { combo: "CB4941BT / C2288EC", driver: "Петър Христов", maxPayloadTons: 26.5, cargoMode: "bulk" },
  ]},
];

/** Циментови продукти от регистъра (§6) — насипни и за торби. */
export const CEMENT_PRODUCTS = {
  bulk: ["CEM I 52.5 R", "CEM II A-LL 42.5 R", "CEM II 52.5 N", "CEM II B-V 42.5 R"],
  bags: ["CEM II / B-LL 42.5 R", "CEM II 42.5 R", "CEM II C-M 42.5 N", "CEM IV / B(V) 42.5 N", "CEM II / B-LL 32.5 R"],
};
