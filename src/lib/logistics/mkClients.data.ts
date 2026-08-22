/**
 * 19-те клиента на македонската фирма SEM INTERNATIONAL DOOEL (§8). Имената са ТОЧНО
 * както са предоставени — без агресивна нормализация/транслитерация (§9). Company-scoped
 * import; dedupe по ЕДБ, иначе по нормализирано име (§7). BEKO TRANS е без ЕДБ (null, §4).
 */
export type MkClientSeed = { name: string; address: string; eik: string | null; country: string };

export const MK_CLIENTS: MkClientSeed[] = [
  { name: "АЦЕ ТРАНС - КОМПАНИ ДООЕЛ", address: 'ул."Вера Радосављевиќ" бр.6/9, 1000 Скопjе', eik: "4043011507404", country: "North Macedonia" },
  { name: "АЛЕМ КОМПАНИ ДООЕЛ", address: "ул.3, бр.6,с.Долно Коњари, Петровец", eik: "4030994367545", country: "North Macedonia" },
  { name: "ARADIKO KOP DOOEL", address: "ul.4, br.11, s.Rzanicino, Skopje", eik: "4069010500430", country: "North Macedonia" },
  { name: "BEKO TRANS DOOEL", address: "ul.Ilindenska 263\nGostivar", eik: null, country: "North Macedonia" },
  { name: "BEROVIC BETON", address: "с.Батинци, СКОПJЕ", eik: "4030996360475", country: "North Macedonia" },
  { name: "ДПГУ БЕТОН ГРАДБА ДООЕЛ", address: "ул. Биљановска ББ, Куманово", eik: "4017010513779", country: "North Macedonia" },
  { name: "БОНИ ИНТЕРГРАДБА ДОО", address: "Агроберза бр.40\nСТРУМИЦА", eik: "4029008501656", country: "North Macedonia" },
  { name: "JOВАНОВ ТРАНС ДООЕЛ", address: "с.JАКИМОВО\nВИНИЦА", eik: "4005013503393", country: "North Macedonia" },
  { name: "JJU BAU DOOEL", address: "ul.Ilindenska br.2, TETOVO", eik: "4028023551647", country: "North Macedonia" },
  { name: "ДИНЕ-ТРЕJД ДОО", address: "ул.11-ти Октомври бр.45\nКрива Паланка", eik: "4015001103344", country: "North Macedonia" },
  { name: "ДМ-ПРЕЦИЗ ДОО", address: "Индустриска зона Македонка бр.18\nШТИП", eik: "4029998115950", country: "North Macedonia" },
  { name: "EUROPAL-GRADBA DOOEL", address: "nas.Gramagje b.b\nKriva Palanka", eik: "4015005104604", country: "North Macedonia" },
  { name: "GRADIS-KOO DOOEL", address: "Nikushtak, Lipkovo", eik: "4017993149246", country: "North Macedonia" },
  { name: "КАЛИНА ДООЕЛ", address: "ул.Царка Георгиева бр.6\nОризари, КОЧАНИ", eik: "4013000111340", country: "North Macedonia" },
  { name: "МАК-БЕТ ДОО", address: "ул.8, бр.14, Визбегово, Скопjе", eik: "4030991189794", country: "North Macedonia" },
  { name: "ОГРАЖДЕН-МИКРОМИКС ДООЕЛ", address: "ул.Маршал Тито бр.239\nСТРУМИЦА", eik: "4027007154615", country: "North Macedonia" },
  { name: "ПЕЛАГОНИJА-ИНЖИНЕРИНГ ДООЕЛ", address: "ул.Слободан Jовановски бр.43\nШТИП", eik: "4029001121939", country: "North Macedonia" },
  { name: "ТЕХКОМ ДООЕЛ", address: "ул.Кирил Змбов бр.6\nКОЧАНИ", eik: "4013000112592", country: "North Macedonia" },
  { name: "ТРИ БРАЌА ДОО", address: "ул.Боца Иванова ББ, Бутел, Скопjе", eik: "4030000395960", country: "North Macedonia" },
];
