/**
 * Централно, ЗАДЪЛЖИТЕЛНО потвърждение при изтриване на каквото и да било в
 * платформата (документ, фактура, клиент, доставчик, файл и т.н.).
 *
 * Връща Promise<boolean> — true само ако потребителят изрично потвърди.
 * Държим го като отделен helper, за да може по-късно лесно да се замени
 * браузърният `confirm` с красив модал, без да се пипат извикващите места.
 *
 * @param what Кратко описание на това, което ще се изтрие (напр. "клиента „X"").
 */
export function confirmDelete(what?: string): Promise<boolean> {
  const subject = what ? what : "този запис";
  const message = `Сигурни ли сте, че искате да изтриете ${subject}?\n\nТова действие е необратимо.`;
  return Promise.resolve(typeof window !== "undefined" ? window.confirm(message) : false);
}
