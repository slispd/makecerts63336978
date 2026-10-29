"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { resetWelcome, saveHelp } from "@/lib/actions";
import { DEFAULT_STEPS, parseVideoUrl, type HelpContent, type HelpVideo } from "@/lib/help-shared";
import { VideoPlayer } from "./HelpView";
import { RichTextEditor } from "./RichTextEditor";
import { Button, Card, Field, Input, inputCls } from "./ui";

const newId = () => Math.random().toString(36).slice(2, 10);

function Section({ title, desc, children, actions }: { title: string; desc?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {desc && <p className="text-sm text-slate-500">{desc}</p>}
        </div>
        {actions}
      </div>
      {children}
    </Card>
  );
}

function VideoCard({
  v,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  v: HelpVideo;
  index: number;
  total: number;
  onChange: (v: HelpVideo) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState(false);
  const embed = parseVideoUrl(v.url);
  const iconBtn = "h-8 w-8 grid place-items-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30";
  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="grid place-items-center w-7 h-7 rounded-full bg-brand-700 text-white text-xs font-semibold shrink-0">{index + 1}</span>
        <input
          className={`${inputCls} font-medium`}
          placeholder="Título do vídeo (ex.: Como cadastrar um curso)"
          value={v.title}
          onChange={(e) => onChange({ ...v, title: e.target.value })}
        />
        <button type="button" className={iconBtn} title="Mover para cima" disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
        <button type="button" className={iconBtn} title="Mover para baixo" disabled={index === total - 1} onClick={() => onMove(1)}>↓</button>
        <button type="button" className="h-8 w-8 grid place-items-center rounded-md text-red-600 hover:bg-red-50" title="Remover vídeo" onClick={onRemove}>✕</button>
      </div>
      <div>
        <input
          className={inputCls}
          placeholder="Link do vídeo no Vimeo (ou YouTube)"
          value={v.url}
          onChange={(e) => onChange({ ...v, url: e.target.value })}
        />
        <div className="mt-1 flex items-center gap-3 text-xs">
          {!v.url ? (
            <span className="text-slate-400">Cole o link da página do vídeo, por exemplo https://vimeo.com/123456789</span>
          ) : embed ? (
            <>
              <span className="text-emerald-600">✓ Link do {embed.provider} reconhecido</span>
              <button type="button" className="text-brand-600 underline" onClick={() => setPreview((p) => !p)}>
                {preview ? "Ocultar prévia" : "Ver prévia"}
              </button>
            </>
          ) : (
            <span className="text-red-600">Link não reconhecido. Use um link do Vimeo ou do YouTube.</span>
          )}
        </div>
      </div>
      {preview && embed && (
        <div className="max-w-lg">
          <VideoPlayer url={v.url} title={v.title} />
        </div>
      )}
      <textarea
        rows={2}
        className={inputCls}
        placeholder="Descrição curta (opcional)"
        value={v.description}
        onChange={(e) => onChange({ ...v, description: e.target.value })}
      />
    </div>
  );
}

export function HelpEditor({ initial }: { initial: HelpContent }) {
  const router = useRouter();
  const [form, setForm] = useState<HelpContent>(initial);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof HelpContent>(k: K, v: HelpContent[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const setVideo = (i: number, v: HelpVideo) => set("videos", form.videos.map((x, j) => (j === i ? v : x)));
  const moveVideo = (i: number, dir: -1 | 1) => {
    const list = [...form.videos];
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
    set("videos", list);
  };
  const invalid = form.videos.filter((v) => v.url && !parseVideoUrl(v.url)).length;

  function save() {
    setMsg(null);
    if (invalid) return setMsg({ type: "err", text: "Há vídeo(s) com link não reconhecido. Corrija antes de salvar." });
    start(async () => {
      const r = await saveHelp({ ...form, videos: form.videos.filter((v) => v.url || v.title) });
      if (!r.ok) return setMsg({ type: "err", text: r.error });
      setMsg({ type: "ok", text: "Página de ajuda salva." });
      router.refresh();
    });
  }

  function reset() {
    if (!confirm("O aviso de boas-vindas voltará a aparecer para todos os usuários, inclusive quem marcou “não mostrar novamente”. Continuar?")) return;
    start(async () => {
      const r = await resetWelcome();
      setMsg(r.ok ? { type: "ok", text: "O aviso voltará a aparecer para todos." } : { type: "err", text: r.error });
    });
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Conteúdo da página <b>Ajuda</b>, visível para todos os usuários.
          {dirty && <span className="text-amber-600"> · Alterações não salvas</span>}
        </p>
        <div className="flex gap-2">
          <Link href="/ajuda" target="_blank" className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm hover:bg-slate-50">
            Ver página
          </Link>
          <Button onClick={save} disabled={pending || !dirty}>{pending ? "Salvando…" : "Salvar"}</Button>
        </div>
      </div>
      {msg && (
        <div className={`rounded-lg px-4 py-2 text-sm ${msg.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <Section title="Cabeçalho da página">
        <Field label="Título">
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Introdução">
          <textarea rows={2} className={inputCls} value={form.intro} onChange={(e) => set("intro", e.target.value)} />
        </Field>
      </Section>

      <Section
        title="Vídeos de treinamento"
        desc="Aparecem em lista, na ordem abaixo. No Vimeo, deixe o vídeo como “não listado” e permita a incorporação neste site."
        actions={
          <Button
            variant="secondary"
            onClick={() => set("videos", [...form.videos, { id: newId(), title: "", description: "", url: "" }])}
          >
            + Adicionar vídeo
          </Button>
        }
      >
        {form.videos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Nenhum vídeo ainda. Clique em <b>+ Adicionar vídeo</b> e cole o link do Vimeo.
          </div>
        ) : (
          <div className="space-y-3">
            {form.videos.map((v, i) => (
              <VideoCard
                key={v.id}
                v={v}
                index={i}
                total={form.videos.length}
                onChange={(nv) => setVideo(i, nv)}
                onMove={(dir) => moveVideo(i, dir)}
                onRemove={() => {
                  if (!v.url && !v.title ? true : confirm(`Remover o vídeo “${v.title || "sem título"}”?`))
                    set("videos", form.videos.filter((_, j) => j !== i));
                }}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Passo a passo"
        desc="Guia em texto exibido abaixo dos vídeos."
        actions={
          <Button
            variant="ghost"
            onClick={() => confirm("Substituir pelo passo a passo padrão?") && set("steps", DEFAULT_STEPS)}
          >
            Restaurar texto padrão
          </Button>
        }
      >
        <RichTextEditor value={form.steps} onChange={(v) => set("steps", v)} />
      </Section>

      <Section title="Aviso de boas-vindas" desc="Mensagem no topo da tela de Cursos, com a opção “Não mostrar esta mensagem novamente”.">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={form.welcomeEnabled}
            onChange={(e) => set("welcomeEnabled", e.target.checked)}
            className="h-4 w-4 accent-brand-700"
          />
          Exibir o aviso para usuários que ainda não o dispensaram
        </label>
        {form.welcomeEnabled && (
          <>
            <Field label="Título do aviso">
              <Input value={form.welcomeTitle} onChange={(e) => set("welcomeTitle", e.target.value)} />
            </Field>
            <Field label="Texto do aviso">
              <textarea rows={2} className={inputCls} value={form.welcomeText} onChange={(e) => set("welcomeText", e.target.value)} />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span>Publicou vídeos novos? Mostre o aviso de novo para todos, inclusive quem já o dispensou.</span>
              <Button variant="secondary" onClick={reset} disabled={pending}>
                Mostrar novamente para todos
              </Button>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
