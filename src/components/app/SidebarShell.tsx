"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/app/Sidebar";
import type { SwitcherCompany } from "@/components/app/CompanySwitcher";

type Props = { companyName: string; plan: string; isSuperAdmin?: boolean; logoUrl?: string | null; inboxUnread?: number; companyEik?: string | null; companies?: SwitcherCompany[]; activeCompanyId?: string; logisticsEnabled?: boolean };

export function SidebarShell(props: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // затваряне при навигация
  useEffect(() => { setOpen(false); }, [pathname]);
  // заключване на скрола при отворено меню (мобилно)
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Хамбургер — само на мобилни (виж globals.css) */}
      <button className="mobile-menu-btn" aria-label="Меню" onClick={() => setOpen(true)}>☰</button>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <div className={`sidebar-wrap${open ? " open" : ""}`} onClick={() => setOpen(false)}>
        <Sidebar {...props} />
      </div>
    </>
  );
}
