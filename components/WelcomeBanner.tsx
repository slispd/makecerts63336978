"use client";

import Link from "next/link";
import { useState } from "react";
import { dismissWelcome } from "@/lib/actions";

export function WelcomeBanner({ title, text, videoCount }: { title: string; text: string; videoCount: number }) {
  const [hidden, setHidden] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const [error, setError] = useState("");

  if (hidden) return null;

  // Grava a escolha assim que a caixa é marcada (vale em qualquer computador)
  async function toggle(checked: boolean) {
    setDontShow(checked);
    setError("");
    const r = await dismissWelcome(checked);
    if (!r.ok) {
      setDontShow(!checked);
      setError(r.error);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-brand-100 bg-brand-50 p-5 flex flex-wrap items-center gap-5">
      <div className="grid place-items-center w-12 h-12 rounded-full bg-brand-700 text-white shrink-0" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" />
        </svg>
      </div>
      <div className="flex-1 min-w-60">
        <div className="font-semibold text-slate-900">{title}</div>
        <div className="text-sm text-slate-600 mt-0.5">{text}</div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => toggle(e.target.checked)}
            className="h-4 w-4 accent-brand-700"
          />
          Não mostrar esta mensagem novamente
        </label>
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </div>
      <div className="flex gap-2">
        <Link href="/ajuda" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900">
          {videoCount > 0 ? "Assistir aos vídeos" : "Ver guia de uso"}
        </Link>
        <button onClick={() => setHidden(true)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">
          Fechar
        </button>
      </div>
    </div>
  );
}
