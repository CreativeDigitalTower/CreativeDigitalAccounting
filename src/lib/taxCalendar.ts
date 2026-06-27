// Стандартни данъчни и осигурителни срокове (България)
export type TaxDeadline = { title: string; date: Date; law: string };

export function upcomingStandard(limit = 14): TaxDeadline[] {
  const now = new Date();
  const y = now.getFullYear();
  const items: TaxDeadline[] = [];

  for (let k = 0; k < 3; k++) {
    const base = new Date(y, now.getMonth() + k, 1);
    const my = base.getFullYear(), mm = base.getMonth();
    items.push({ title: "Подаване на справка-декларация по ДДС и VIES + плащане", date: new Date(my, mm, 14), law: "ЗДДС" });
    items.push({ title: "Интрастат декларации", date: new Date(my, mm, 14), law: "Интрастат" });
    items.push({ title: "Авансови вноски по ЗКПО", date: new Date(my, mm, 15), law: "ЗКПО" });
    items.push({ title: "Осигуровки и авансов данък по ЗДДФЛ (за предходния месец)", date: new Date(my, mm, 25), law: "КСО/ЗДДФЛ" });
  }
  items.push({ title: "Годишна данъчна декларация по чл. 50 ЗДДФЛ (физ. лица/ЕТ)", date: new Date(y, 3, 30), law: "ЗДДФЛ" });
  items.push({ title: "Годишна данъчна декларация по ЗКПО + годишен финансов отчет", date: new Date(y, 5, 30), law: "ЗКПО" });
  items.push({ title: "Деклариране и плащане на данък върху разходите", date: new Date(y, 5, 30), law: "ЗКПО" });
  items.push({ title: "Обявяване на ГФО в Търговския регистър", date: new Date(y, 8, 30), law: "ЗСч" });

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return items.filter((i) => i.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, limit);
}
