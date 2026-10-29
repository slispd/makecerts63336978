"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 transition ${active ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}
    >
      {children}
    </Link>
  );
}
