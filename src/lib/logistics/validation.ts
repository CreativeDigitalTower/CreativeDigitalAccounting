import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Структуриран validation отговор за Logistics API (никакъв silent failure):
 *   { error: "VALIDATION_ERROR", fields: { quantity: "…", clientId: "…" } }
 * Клиентът маркира съответните полета и показва съобщенията под тях.
 */
export type FieldErrors = Record<string, string>;

export function validationError(fields: FieldErrors) {
  return NextResponse.json({ error: "VALIDATION_ERROR", fields }, { status: 400 });
}

/** Съобщения (BG default — API конвенцията в модула е на BG). */
export const VMSG = {
  client: "Моля, изберете клиент.",
  product: "Моля, изберете продукт.",
  quantity: "Моля, въведете количество.",
  quantityPositive: "Количеството трябва да бъде по-голямо от 0.",
  quantityInvalid: "Въведете валидно количество.",
  date: "Моля, въведете дата.",
  vehicle: "Моля, изберете автомобил.",
  trailer: "Моля, изберете ремарке.",
  carrier: "Моля, изберете превозвач.",
  supplier: "Моля, изберете доставчик.",
  docNumber: "Моля, въведете номер на документ.",
  required: "Полето е задължително.",
  name: "Моля, въведете наименование.",
  amount: "Моля, въведете стойност.",
  payload: (max: string) => `Количеството надвишава максималния товар на автомобила – ${max} t.`,
} as const;

/** Превръща ZodError в { поле: съобщение } (взима първото съобщение на поле). */
export function zodFieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Изисква непразна стойност; добавя съобщение към errors, ако липсва. Връща дали е ок. */
export function requireField(errors: FieldErrors, key: string, value: unknown, message: string): boolean {
  const empty = value == null || (typeof value === "string" && value.trim() === "");
  if (empty) { errors[key] = message; return false; }
  return true;
}
