"use client";
import { useT } from "@/components/i18n/I18nProvider";

/** Read-only печат чрез съществуващия рендер (browser print на текущия invoice layout). */
export function PrintButton({ style }: { style?: React.CSSProperties }) {
  const t = useT();
  return (
    <button className="btn btn-ghost btn-sm" style={style} onClick={() => window.print()}>
      {t("logistics.export.printPdf")}
    </button>
  );
}
