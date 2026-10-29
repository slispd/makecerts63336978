import type { SettingsView } from "@/lib/settings-shared";

/** Painel esquerdo da tela de login (também usado na pré-visualização das configurações). */
export function LoginHero({ s, compact = false }: { s: SettingsView; compact?: boolean }) {
  const lines = s.loginTitle.split("\n");
  return (
    <section
      className={`flex flex-col justify-between text-white relative overflow-hidden ${compact ? "p-7 h-full" : "p-14"}`}
      style={{ backgroundColor: s.darkColor }}
    >
      {s.bgUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ backgroundColor: s.darkColor, opacity: s.bgOverlay / 100 }} />
        </>
      )}
      <div className={`absolute border border-white/15 ${compact ? "inset-5" : "inset-10"}`} />
      <div className={`absolute border border-white/10 ${compact ? "inset-7" : "inset-14"}`} />

      <div className="relative flex items-center gap-3">
        {s.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.logoUrl} alt="" className={`${compact ? "h-6" : "h-10"} w-auto object-contain`} />
        )}
        <span className={`${compact ? "text-[9px]" : "text-sm"} tracking-[0.3em] uppercase text-white/70`}>{s.companyName}</span>
      </div>
      <div className="relative">
        <h1 className={`font-[family-name:var(--font-serif)] leading-tight ${compact ? "text-2xl" : "text-6xl"}`}>
          {lines.map((l, i) => (
            <span key={i}>
              {l}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </h1>
        {s.loginSubtitle && (
          <p className={`text-white/75 max-w-md ${compact ? "mt-3 text-[11px]" : "mt-6 text-lg"}`}>{s.loginSubtitle}</p>
        )}
      </div>
      <div className={`relative text-white/50 ${compact ? "text-[9px]" : "text-sm"}`}>{s.loginFooter}</div>
    </section>
  );
}
