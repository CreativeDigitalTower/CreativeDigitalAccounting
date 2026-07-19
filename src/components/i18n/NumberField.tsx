"use client";

// Локализирано числово поле. Приема "," и "." като десетичен разделител,
// показва стойността според езика при blur, а навън подава каноничен string
// (десетичен "."), така че всички съществуващи parseFloat/Number работят.
//
// Употреба (string state):   <NumberField value={x} onChange={setX} />
// Употреба (number state):    <NumberField value={n} onValueChange={setN} />

import { useState, useId } from "react";
import { useI18n, useT } from "@/components/i18n/I18nProvider";
import { parseLocalizedNumber, formatLocalizedNumber, toEditableString } from "@/lib/number";

type Props = {
  value: string | number | null | undefined;
  onChange?: (canonical: string) => void;
  onValueChange?: (value: number | null) => void;
  /** Макс. дробни знаци при показване (blur). По подразбиране 2. */
  decimals?: number;
  /** Скрий локализираното форматиране на хиляди при показване. */
  noGrouping?: boolean;
  invalidMessage?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

export function NumberField({
  value, onChange, onValueChange, decimals = 2, noGrouping, invalidMessage,
  onBlur, onFocus, ...rest
}: Props) {
  const { locale } = useI18n();
  const t = useT();
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const errId = useId();

  const numeric = parseLocalizedNumber(value ?? "");
  const display = focused
    ? draft
    : numeric == null
      ? ""
      : formatLocalizedNumber(numeric, locale, { minimumFractionDigits: 0, maximumFractionDigits: decimals, useGrouping: !noGrouping });

  function emit(next: number | null) {
    onChange?.(next == null ? "" : String(next));
    onValueChange?.(next);
  }

  return (
    <>
      <input
        {...rest}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errId : undefined}
        onFocus={(e) => { setFocused(true); setInvalid(false); setDraft(toEditableString(numeric, locale)); onFocus?.(e); }}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          setInvalid(false); // без грешка по време на писане; валидираме при blur
          if (raw.trim() === "") { emit(null); return; }
          const n = parseLocalizedNumber(raw);
          if (n != null) emit(n); // подавай навън само при валидна стойност
        }}
        onBlur={(e) => {
          setFocused(false);
          const raw = draft.trim();
          if (raw === "") { setInvalid(false); emit(null); }
          else {
            const n = parseLocalizedNumber(raw);
            if (n != null) { setInvalid(false); emit(n); }
            else setInvalid(true);
          }
          onBlur?.(e);
        }}
      />
      {invalid && (
        <div id={errId} role="alert" style={{ fontSize: 11, color: "var(--brick)", marginTop: 3 }}>
          {invalidMessage ?? t("common.numberInvalid")}
        </div>
      )}
    </>
  );
}
