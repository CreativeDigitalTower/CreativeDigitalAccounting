"use client";
import { signOut } from "next-auth/react";

export function PortalSignOut() {
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => signOut({ callbackUrl: "/login" })}>Изход</button>
  );
}
