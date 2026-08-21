"use client";
import { forwardRef } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { parseQuantity, fmtQuantity } from "@/lib/i18n/format";

/**
 * Input за мерни КОЛИЧЕСТВА (§ въвеждане). Приема точка ИЛИ запетая („28“, „28,5“,
 * „28.500“). При blur визуализира стойността с точно 3 знака според locale.
 * Стойността се държи като string в родителя; парсването за изчисления става с
 * parseQuantity. type="text" inputMode="decimal", за да не пречи браузърът на запетаята.
 */
type Props = {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  describedById?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  id?: string;
};

export const QuantityInput = forwardRef<HTMLInputElement, Props>(function QuantityInput(
  { value, onChange, error, describedById, style, placeholder, id }, ref,
) {
  const { locale } = useI18n();
  function handleBlur() {
    const n = parseQuantity(value);
    if (n != null) onChange(fmtQuantity(n, locale));
  }
  return (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      aria-invalid={error || undefined}
      aria-describedby={error ? describedById : undefined}
      style={{ ...style, ...(error ? { outline: "1px solid var(--brick)", borderColor: "var(--brick)" } : null) }}
    />
  );
});
