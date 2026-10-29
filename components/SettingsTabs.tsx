"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/configuracoes", label: "Aparência" },
  { href: "/configuracoes/ajuda", label: "Ajuda e treinamento" },
];

export function SettingsTabs() {
  const path = usePathname();
  return (
    <div className="mt-3 mb-6 flex gap-1 border-b border-slate-200">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              active ? "border-brand-700 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
