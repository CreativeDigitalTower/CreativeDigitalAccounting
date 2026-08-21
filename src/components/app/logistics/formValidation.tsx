"use client";
import { useCallback, useRef, useState } from "react";

/**
 * Лек validation слой за Logistics формите (§5–§16). Няма зависимости.
 * - field-level съобщения под полето (+ aria-invalid / aria-describedby);
 * - общ banner при submit;
 * - focus/scroll към първото невалидно поле;
 * - въведените данни не се губят (errors са отделно от стойностите).
 */
export type FieldErrors = Record<string, string>;

export function useFieldErrors() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string>("");
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const register = useCallback((key: string) => (el: HTMLElement | null) => { refs.current[key] = el; }, []);
  const clearField = useCallback((key: string) => setErrors((e) => { if (!e[key]) return e; const n = { ...e }; delete n[key]; return n; }), []);
  const clearAll = useCallback(() => { setErrors({}); setBanner(""); }, []);

  /** Задава грешките, показва banner и фокусира първото невалидно поле. Връща дали е валидно. */
  const fail = useCallback((fields: FieldErrors, bannerMsg: string) => {
    setErrors(fields);
    setBanner(bannerMsg);
    const firstKey = Object.keys(fields)[0];
    if (firstKey) {
      const el = refs.current[firstKey];
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); (el as HTMLElement).focus?.(); }
    }
    return Object.keys(fields).length === 0;
  }, []);

  return { errors, banner, register, clearField, clearAll, fail, setBanner };
}

/** Звездичка за задължително поле. */
export function Req() {
  return <span aria-hidden style={{ color: "var(--brick)", marginLeft: 2 }}>*</span>;
}

/** Съобщение за грешка под поле. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <div id={id} role="alert" style={{ color: "var(--brick)", fontSize: 11, marginTop: 3 }}>{message}</div>;
}

/** Общ banner над формата. */
export function ValidationBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" style={{ background: "rgba(178,72,42,.1)", border: "1px solid rgba(178,72,42,.35)", color: "var(--brick)", fontSize: 12.5, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
      {message}
    </div>
  );
}

/** Само aria атрибути (безопасно за spread до отделен style). */
export function ariaProps(key: string, errors: FieldErrors) {
  const has = !!errors[key];
  return {
    "aria-invalid": has || undefined,
    "aria-describedby": has ? `err-${key}` : undefined,
  };
}

/** Error border стил за merge в съществуващ style обект. */
export function errStyle(key: string, errors: FieldErrors): React.CSSProperties {
  return errors[key] ? { outline: "1px solid var(--brick)", borderRadius: 6 } : {};
}
