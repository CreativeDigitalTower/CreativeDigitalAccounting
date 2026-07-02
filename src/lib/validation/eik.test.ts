/**
 * Тестови примери за ЕИК/БУЛСТАT валидацията.
 *
 * Няма конфигуриран test runner в проекта, затова файлът е самостоятелен —
 * може да се пусне с:  npx tsx src/lib/validation/eik.test.ts
 * Валидните номера се генерират чрез computeCheckDigit* (не зависим от реални
 * фирмени ЕИК), за да са тестовете детерминистични.
 */
import { validateEik, normalizeEik, computeCheckDigit9, computeCheckDigit13 } from "./eik";

let passed = 0;
let failed = 0;
function assert(name: string, cond: boolean) {
  if (cond) { passed++; }
  else { failed++; console.error(`✗ FAIL: ${name}`); }
}

// ── Генерираме валиден 9-цифрен ЕИК ──
const base8 = "83164179";
const valid9 = base8 + String(computeCheckDigit9(base8)); // напр. 831641790
// невалиден: подменяме контролната цифра
const wrongDigit = (Number(valid9[8]) + 1) % 10;
const invalid9 = base8 + String(wrongDigit);

// ── Генерираме валиден 13-цифрен БУЛСTAT (валиден 9-цифрен префикс + 4 цифри + контрола) ──
const first12 = valid9 + "123"; // 9-цифрен префикс + 3 цифри = 12; 13-та е контролна
const valid13 = first12 + String(computeCheckDigit13(first12));
const invalid13 = first12 + String((Number(valid13[12]) + 1) % 10);

// 1) Валиден 9-цифрен ЕИК
assert("валиден 9-цифрен ЕИК", validateEik(valid9).isValid === true);

// 2) Невалиден 9-цифрен ЕИК (грешна контролна цифра)
assert("невалиден 9-цифрен ЕИК", validateEik(invalid9).isValid === false);

// 3) Валиден 13-цифрен БУЛСTAT
assert("валиден 13-цифрен БУЛСTAT", validateEik(valid13).isValid === true);

// 4) Невалиден 13-цифрен БУЛСTAT
assert("невалиден 13-цифрен БУЛСTAT", validateEik(invalid13).isValid === false);

// 5) Стойност с интервали/тирета/точки → нормализира се и е валидна
assert("интервали/тирета се нормализират", validateEik(` ${valid9.slice(0, 3)}-${valid9.slice(3, 6)}.${valid9.slice(6)} `).isValid === true);
assert("нормализация маха разделители", normalizeEik(" 831-641.790 ") === "831641790");

// 6) Стойност с букви → невалидна
assert("букви са невалидни", validateEik("83164179X").isValid === false);

// 7) Празна стойност → невалидна (когато е задължителна), валидна (когато не е)
assert("празна стойност (задължителна) е невалидна", validateEik("").isValid === false);
assert("празна стойност (по избор) е валидна", validateEik("", { required: false }).isValid === true);

// Допълнителни: грешна дължина
assert("10 цифри са невалидни", validateEik("1234567890").isValid === false);
assert("8 цифри са невалидни", validateEik("12345678").isValid === false);

console.log(`\nЕИК тестове: ${passed} успешни, ${failed} провалени.`);
console.log(`Примерни валидни: 9-цифрен=${valid9}, 13-цифрен=${valid13}`);
if (failed > 0) process.exit(1);
