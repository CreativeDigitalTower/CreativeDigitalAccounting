"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Рендира печатния документ в ПОРТАЛ директно под <body>, ИЗВЪН dashboard shell-а
 * (sidebar/topbar/app container). Така печатът не зависи от layout-а на приложението:
 *   - на екран: чист centered A4 preview върху сива основа (същото съдържание като печата);
 *   - при печат (@media print + body.printing-portal): всичко останало в body е display:none,
 *     а порталът е нормален block flow → целият документ на 1 A4, без clipping/absolute хакове.
 * Детерминистично: без position:absolute върху документа, без overflow-clipping на съдържание.
 */
export function PrintDocPortal({ children }: { children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const div = document.createElement("div");
    div.className = "print-portal-root";
    document.body.appendChild(div);
    setEl(div);
    return () => { document.body.removeChild(div); };
  }, []);
  if (!el) return null;
  return createPortal(children, el);
}
