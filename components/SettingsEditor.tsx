"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { saveSettings } from "@/lib/actions";
import { DEFAULT_SETTINGS, brandCss, type AppSettings, type SettingsView } from "@/lib/settings-shared";
import { ImageInput } from "./ImageInput";
import { LoginHero } from "./LoginHero";
import { Button, Card, Field, Input, PageHeader, inputCls } from "./ui";

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {desc && <p className="text-sm text-slate-500">{desc}</p>}
      </div>
      {children}
    </Card>
  );
}

function ColorField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded border border-slate-300" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

export function SettingsEditor({ initial }: { initial: SettingsView }) {
  const router = useRouter();
  const { logoUrl, bgUrl, ...rest } = initial;
  const [form, setForm] = useState<AppSettings>(rest);
  const [logo, setLogo] = useState<string | null>(logoUrl);
  const [bg, setBg] = useState<string | null>(bgUrl);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Pré-visualiza as cores na própria página enquanto edita
  useEffect(() => {
    const el = document.getElementById("brand-colors");
    if (!el || !/^#[0-9a-f]{6}$/i.test(form.primaryColor) || !/^#[0-9a-f]{6}$/i.test(form.darkColor)) return;
    const old = el.innerHTML;
    el.innerHTML = brandCss(form);
    return () => {
      el.innerHTML = old;
    };
  }, [form.primaryColor, form.darkColor]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    JSON.stringify(form) !== JSON.stringify(rest) || logo !== logoUrl || bg !== bgUrl;

  function save() {
    setMsg(null);
    start(async () => {
      // undefined = manter a imagem atual; null = remover; data: = nova
      const logoArg = logo === logoUrl ? undefined : logo;
      const bgArg = bg === bgUrl ? undefined : bg;
      const r = await saveSettings(form, logoArg, bgArg);
      if (!r.ok) return setMsg({ type: "err", text: r.error });
      setMsg({ type: "ok", text: "Configurações salvas." });
      router.refresh();
    });
  }

  function restoreDefaults() {
    if (!confirm("Voltar textos e cores ao padrão? (logo e imagem de fundo são mantidos)")) return;
    setForm(DEFAULT_SETTINGS);
  }

  const preview: SettingsView = { ...form, logoUrl: logo, bgUrl: bg };

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Personalize o nome, os textos, as cores e a tela de login do sistema."
        actions={
          <>
            <Button variant="ghost" onClick={restoreDefaults}>Restaurar padrão</Button>
            <Button onClick={save} disabled={pending || !dirty}>{pending ? "Salvando…" : "Salvar"}</Button>
          </>
        }
      />
      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${msg.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
        <div className="space-y-5">
          <Section title="Identidade">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nome da empresa" hint="Aparece no topo da tela de login e na aba do navegador.">
                <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
              </Field>
              <Field label="Nome do sistema" hint="Aparece no cabeçalho, ao lado do logo.">
                <Input value={form.appName} onChange={(e) => set("appName", e.target.value)} />
              </Field>
            </div>
            <ImageInput
              label="Logo do sistema"
              hint="Usado no cabeçalho e na tela de login. Prefira PNG com fundo transparente e versão clara (o fundo é escuro)."
              value={logo}
              onChange={setLogo}
              maxW={800}
              maxH={300}
            />
          </Section>

          <Section title="Tela de login" desc="Textos do painel ao lado do formulário de entrada.">
            <Field label="Título" hint="Use Enter para quebrar a linha.">
              <textarea rows={2} className={inputCls} value={form.loginTitle} onChange={(e) => set("loginTitle", e.target.value)} />
            </Field>
            <Field label="Descrição">
              <textarea rows={2} className={inputCls} value={form.loginSubtitle} onChange={(e) => set("loginSubtitle", e.target.value)} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Rodapé">
                <Input value={form.loginFooter} onChange={(e) => set("loginFooter", e.target.value)} />
              </Field>
              <Field label="Texto abaixo de “Entrar”">
                <Input value={form.loginWelcome} onChange={(e) => set("loginWelcome", e.target.value)} />
              </Field>
            </div>
            <ImageInput
              label="Imagem de fundo"
              hint="Foto ou arte horizontal (ex.: 1920 × 1200 px). Fica atrás do painel com a cor escura por cima."
              value={bg}
              onChange={setBg}
              maxW={2400}
              maxH={1600}
              keepAlpha={false}
            />
            {bg && (
              <Field label={`Escurecimento sobre a imagem: ${form.bgOverlay}%`} hint="Aumente se o texto estiver difícil de ler.">
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={form.bgOverlay}
                  onChange={(e) => set("bgOverlay", Number(e.target.value))}
                  className="w-full accent-brand-700"
                />
              </Field>
            )}
          </Section>

          <Section title="Cores" desc="Valem para o sistema todo: cabeçalho, botões, links e tela de login.">
            <div className="grid sm:grid-cols-2 gap-4">
              <ColorField label="Cor principal" hint="Botões, links e destaques." value={form.primaryColor} onChange={(v) => set("primaryColor", v)} />
              <ColorField label="Cor escura" hint="Cabeçalho e painel da tela de login." value={form.darkColor} onChange={(v) => set("darkColor", v)} />
            </div>
          </Section>

          <Section title="Certificado" desc="Frase exibida na frente de todos os certificados, antes do nome do aluno.">
            <Field label="Texto de certificação">
              <Input value={form.issuerText} onChange={(e) => set("issuerText", e.target.value)} />
            </Field>
            <p className="text-xs text-slate-500">
              Exemplo: <i>{form.issuerText || DEFAULT_SETTINGS.issuerText}</i> <b>João da Silva</b>…
            </p>
          </Section>
        </div>

        <div className="xl:sticky xl:top-20 space-y-2">
          <div className="text-sm font-medium text-slate-600">Pré-visualização da tela de login</div>
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white grid grid-cols-[1.6fr_1fr] aspect-[16/10]">
            <LoginHero s={preview} compact />
            <div className="flex items-center justify-center p-5">
              <div className="w-full space-y-2">
                <div className="text-sm font-semibold text-slate-900">Entrar</div>
                <div className="text-[10px] text-slate-500 mb-3">{form.loginWelcome}</div>
                <div className="h-6 rounded border border-slate-300" />
                <div className="h-6 rounded border border-slate-300" />
                <div className="h-7 rounded text-[10px] text-white grid place-items-center" style={{ backgroundColor: form.primaryColor }}>
                  Entrar
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">As cores do cabeçalho desta página já mostram como ficará. Clique em Salvar para aplicar a todos.</p>
        </div>
      </div>
    </div>
  );
}
