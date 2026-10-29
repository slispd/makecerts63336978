"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTemplate, saveTemplate } from "@/lib/actions";
import type { Template, TemplateInput } from "@/lib/types";
import { CertificateBack, CertificateFront, DEFAULT_TEMPLATE, ScaledPage } from "./Certificate";
import { ImageInput } from "./ImageInput";
import { Button, Card, Field, Input, Select } from "./ui";

const SAMPLE = {
  courseName: "Segurança da Informação e LGPD",
  completionDate: "2024-10-25",
  workload: "8 horas",
  syllabus:
    "<h3>Objetivo</h3><p>Capacitar os colaboradores para identificar riscos e proteger dados pessoais no dia a dia.</p><h3>Conteúdo programático</h3><ul><li><p>Conceitos de segurança da informação</p></li><li><p>Lei Geral de Proteção de Dados (LGPD)</p></li><li><p>Engenharia social e phishing</p></li><li><p>Senhas, autenticação e boas práticas</p></li><li><p>Resposta a incidentes</p></li></ul>",
  instructorName: "Mariana Albuquerque Ribeiro",
  instructorSpecialization: "Especialista em Segurança da Informação",
  instructorRegistration: "Registro 123456",
  instructorSignature: null,
  extraEnabled: true,
  extraName: "Roberto Mendes",
  extraRole: "Diretor de Operações",
  extraSignature: null,
  studentName: "João Pedro da Silva Santos",
  studentCpf: "52998224725",
};

export function TemplateEditor({ template }: { template?: Template }) {
  const router = useRouter();
  const [form, setForm] = useState<TemplateInput>(() =>
    template
      ? { ...template }
      : { name: "", ...DEFAULT_TEMPLATE }
  );
  const [side, setSide] = useState<"frente" | "verso">("frente");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof TemplateInput>(k: K, v: TemplateInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  function save() {
    setError("");
    start(async () => {
      const r = await saveTemplate({ ...form, id: template?.id });
      if (!r.ok) return setError(r.error);
      router.push("/modelos");
      router.refresh();
    });
  }

  function remove() {
    if (!template || !confirm("Excluir este modelo? Os cursos que o usam ficarão sem modelo.")) return;
    start(async () => {
      const r = await deleteTemplate(template.id);
      if (!r.ok) return setError(r.error);
      router.push("/modelos");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/modelos" className="text-sm text-slate-500 hover:text-slate-800">← Modelos</Link>
          <h1 className="text-2xl font-semibold text-slate-900">{template ? "Editar modelo" : "Novo modelo"}</h1>
        </div>
        <div className="flex gap-2">
          {template && (
            <Button variant="danger" onClick={remove} disabled={pending}>Excluir</Button>
          )}
          <Button onClick={save} disabled={pending}>{pending ? "Salvando…" : "Salvar modelo"}</Button>
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)] items-start">
        <Card className="p-5 space-y-5">
          <Field label="Nome do modelo">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: ABIX institucional" autoFocus={!template} />
          </Field>
          <ImageInput
            label="Logo"
            hint="PNG com fundo transparente. Aparece no topo da frente."
            value={form.logo}
            onChange={(v) => set("logo", v)}
            maxW={900}
            maxH={400}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cor principal">
              <div className="flex gap-2">
                <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="h-9 w-12 rounded border border-slate-300" />
                <Input value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} />
              </div>
            </Field>
            <Field label="Cor do texto">
              <div className="flex gap-2">
                <input type="color" value={form.textColor} onChange={(e) => set("textColor", e.target.value)} className="h-9 w-12 rounded border border-slate-300" />
                <Input value={form.textColor} onChange={(e) => set("textColor", e.target.value)} />
              </div>
            </Field>
            <Field label="Fonte dos títulos">
              <Select value={form.titleFont} onChange={(e) => set("titleFont", e.target.value as any)}>
                <option value="serif">Clássica (serifada)</option>
                <option value="sans">Moderna (sem serifa)</option>
              </Select>
            </Field>
            <Field label="Fonte do nome do aluno">
              <Select value={form.nameFont} onChange={(e) => set("nameFont", e.target.value as any)}>
                <option value="script">Caligrafia</option>
                <option value="serif">Clássica</option>
                <option value="sans">Moderna</option>
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.showBorder} onChange={(e) => set("showBorder", e.target.checked)} className="h-4 w-4" />
            Moldura decorativa
          </label>
          <ImageInput
            label="Fundo da frente (opcional)"
            hint="Arte A4 paisagem (3508 × 2480 px). Deixe uma área livre no centro para os textos."
            value={form.frontBg}
            onChange={(v) => { set("frontBg", v); setSide("frente"); }}
            maxW={3508}
            maxH={2480}
            keepAlpha={false}
          />
          <ImageInput
            label="Fundo do verso (opcional)"
            hint="Use uma arte bem clara para não atrapalhar a leitura da ementa."
            value={form.backBg}
            onChange={(v) => { set("backBg", v); setSide("verso"); }}
            maxW={3508}
            maxH={2480}
            keepAlpha={false}
          />
        </Card>

        <div className="xl:sticky xl:top-20 space-y-3">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
            {(["frente", "verso"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize ${side === s ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <ScaledPage>
            {side === "frente" ? <CertificateFront t={form} d={SAMPLE} /> : <CertificateBack t={form} d={SAMPLE} />}
          </ScaledPage>
          <p className="text-xs text-slate-500">Exemplo com dados fictícios.</p>
        </div>
      </div>
    </div>
  );
}
