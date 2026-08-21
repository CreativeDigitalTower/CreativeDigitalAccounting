/**
 * Малък, чист CSV builder (без зависимости, тестируем). RFC 4180-съвместим:
 * кавички се удвояват; стойности с кавичка/запетая/нов ред/точка и запетая се ограждат.
 * Разделител по подразбиране е запетая; за Excel-BG може да се подаде ';'.
 */
export function csvEscape(value: unknown, delimiter = ","): string {
  const s = value == null ? "" : String(value);
  return /["\n\r]|,|;/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (unknown[])[], delimiter = ","): string {
  const line = (cells: unknown[]) => cells.map((c) => csvEscape(c, delimiter)).join(delimiter);
  return [line(headers), ...rows.map(line)].join("\r\n");
}

/** CSV текст → Blob с BOM (за да се отвори коректно с кирилица в Excel). */
export function csvBlob(csv: string): Blob {
  return new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
}
