"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { deleteCourse, duplicateCourse, saveCourse } from "@/lib/actions";
import type { Course, CourseInput, Student, Template } from "@/lib/types";
import { CertificateBack, CertificateFront, DEFAULT_TEMPLATE, ScaledPage, type CertTemplate } from "./Certificate";
import { useCertificateExporter } from "./Exporter";
import { ImageInput } from "./ImageInput";
import { RichTextEditor } from "./RichTextEditor";
import { StudentsPanel } from "./StudentsPanel";
import { Button, Card, Field, Input, Select } from "./ui";

type Tab = "dados" | "ementa" | "assinaturas" | "alunos";

function toInput(c: Course): CourseInput {
  const { id: _i, createdBy: _c, updatedAt: _u, ...rest } = c;
  return rest;
}

export function CourseEditor({
  course,
  initialStudents,
  templates,
  issuerText,
  isAdmin = false,
}: {
  issuerText?: string;
  isAdmin?: boolean;
  course: Course;
  initialStudents: Student[];
  templates: Template[];
}) {
  const [saved, setSaved] = useState<CourseInput>(() => toInput(course));
  const [form, setForm] = useState<CourseInput>(() => toInput(course));
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [tab, setTab] = useState<Tab>("dados");
  const [side, setSide] = useState<"frente" | "verso">("frente");
  const [previewId, setPreviewId] = useState<string | null>(initialStudents[0]?.id ?? null);
  const [fit, setFit] = useState<{ fontSize: number; columns: number; overflow: boolean } | null>(null);
  const [status, setStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, startSave] = useTransition();

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof CourseInput>(k: K, v: CourseInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const tpl = templates.find((t) => t.id === form.templateId);
  const certTemplate: CertTemplate = tpl ?? DEFAULT_TEMPLATE;

  const base = useMemo(
    () => ({
      courseName: form.name,
      completionDate: form.completionDate,
      workload: form.workload,
      syllabus: form.syllabus,
      instructorName: form.instructorName,
      instructorSpecialization: form.instructorSpecialization,
      instructorRegistration: form.instructorRegistration,
      instructorSignature: form.instructorSignature,
      extraEnabled: form.extraEnabled,
      extraName: form.extraName,
      extraRole: form.extraRole,
      extraSignature: form.extraSignature,
      issuerText,
    }),
    [form, issuerText]
  );

  const previewStudent = students.find((s) => s.id === previewId) ?? students[0];
  const data = { ...base, studentName: previewStudent?.name ?? "", studentCpf: previewStudent?.cpf ?? "" };
  const exporter = useCertificateExporter(certTemplate, base);

  function save(after?: () => void) {
    startSave(async () => {
      const r = await saveCourse(course.id, form);
      if (r.ok) {
        setSaved(form);
        setStatus({ type: "ok", text: "Alterações salvas" });
        setTimeout(() => setStatus(null), 2500);
        after?.();
      } else setStatus({ type: "err", text: r.error });
    });
  }

  // Ctrl+S para salvar
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) save();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const missing = [
    !form.templateId && "modelo",
    !form.completionDate && "data de conclusão",
    !form.syllabus && "ementa",
    !form.instructorName && "instrutor",
    students.length === 0 && "alunos",
  ].filter(Boolean) as string[];

  const tabs: { id: Tab; label: string }[] = [
    { id: "dados", label: "Dados do curso" },
    { id: "ementa", label: "Ementa" },
    { id: "assinaturas", label: "Assinaturas" },
    { id: "alunos", label: `Alunos (${students.length})` },
  ];

  return (
    <div>
      {exporter.stage}

      {/* Cabeçalho */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/cursos" className="text-sm text-slate-500 hover:text-slate-800">← Cursos</Link>
          <h1 className="text-2xl font-semibold text-slate-900 truncate">{form.name || "Curso sem nome"}</h1>
          <div className="text-sm mt-0.5 h-5">
            {status ? (
              <span className={status.type === "ok" ? "text-emerald-600" : "text-red-600"}>{status.text}</span>
            ) : dirty ? (
              <span className="text-amber-600">Alterações não salvas</span>
            ) : (
              <span className="text-slate-400">Tudo salvo</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            title="Cria um novo curso com a mesma ementa e assinaturas (sem alunos)"
            onClick={() => startSave(async () => { await duplicateCourse(course.id); })}
          >
            Duplicar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Excluir este curso e toda a lista de alunos? Isso não pode ser desfeito."))
                startSave(async () => { await deleteCourse(course.id); });
            }}
          >
            Excluir
          </Button>
          <Button onClick={() => save()} disabled={!dirty || saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Barra de emissão */}
      <Card className="mb-5 p-4 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <div className="font-medium text-slate-900">Emitir certificados</div>
          <div className="text-sm text-slate-500">
            {missing.length ? (
              <span className="text-amber-700">Falta preencher: {missing.join(", ")}</span>
            ) : (
              `${students.length} certificado(s) prontos · A4 paisagem, frente e verso`
            )}
          </div>
        </div>
        {exporter.progress ? (
          <div className="flex items-center gap-3 min-w-64">
            <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: `${(exporter.progress.done / exporter.progress.total) * 100}%` }}
              />
            </div>
            <span className="text-sm tabular-nums text-slate-600">
              {exporter.progress.done}/{exporter.progress.total}
            </span>
          </div>
        ) : (
          <>
            <Button disabled={!students.length} onClick={() => exporter.run(students, "combined")}>
              Baixar todos em um PDF
            </Button>
            <Button variant="secondary" disabled={!students.length} onClick={() => exporter.run(students, "zip")}>
              PDFs individuais (.zip)
            </Button>
            <Button
              variant="secondary"
              disabled={!students.length}
              title="Abre a versão para impressão — escolha “Salvar como PDF” para um arquivo com texto em alta definição"
              onClick={() => {
                const open = () => window.open(`/imprimir/${course.id}`, "_blank");
                if (dirty) save(open);
                else open();
              }}
            >
              Imprimir
            </Button>
          </>
        )}
        {exporter.error && <div className="w-full text-sm text-red-600">{exporter.error}</div>}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-start">
        {/* Formulário */}
        <Card className="overflow-hidden">
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  if (t.id === "ementa") setSide("verso");
                  if (t.id === "dados") setSide("frente");
                }}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
                  tab === t.id ? "border-brand-700 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === "dados" && (
              <div className="space-y-4">
                <Field label="Nome do curso">
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
                </Field>
                <Field label="Modelo de certificado" hint="Os modelos definem logo, cores, fontes e imagens de fundo.">
                  <Select
                    value={form.templateId ?? ""}
                    onChange={(e) => set("templateId", e.target.value || null)}
                    className={form.templateId ? "" : "ring-2 ring-amber-300"}
                  >
                    <option value="">Selecione um modelo…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                </Field>
                {templates.length === 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                    Nenhum modelo cadastrado ainda.{" "}
                    {isAdmin ? (
                      <Link href="/modelos/novo" className="underline font-medium">Criar um modelo</Link>
                    ) : (
                      "Peça ao administrador para cadastrar um."
                    )}
                  </div>
                )}
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="Data de conclusão">
                    <Input type="date" value={form.completionDate} onChange={(e) => set("completionDate", e.target.value)} />
                  </Field>
                  <Field label="Carga horária">
                    <Input value={form.workload} placeholder="Ex.: 8 horas" onChange={(e) => set("workload", e.target.value)} />
                  </Field>
                  <Field label="Departamento">
                    <Input value={form.department} onChange={(e) => set("department", e.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {tab === "ementa" && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-[1fr_180px] gap-4">
                  <div className="text-sm text-slate-600 self-end">
                    Escreva ou cole o conteúdo programático. O texto é ajustado automaticamente para caber no verso.
                  </div>
                  <Field label="Carga horária">
                    <Input value={form.workload} placeholder="Ex.: 8 horas" onChange={(e) => set("workload", e.target.value)} />
                  </Field>
                </div>
                <RichTextEditor value={form.syllabus} onChange={(v) => set("syllabus", v)} />
                {fit && (
                  <div className={`text-xs ${fit.overflow ? "text-red-600 font-medium" : "text-slate-500"}`}>
                    {fit.overflow
                      ? "A ementa está grande demais e foi cortada no verso. Resuma o texto para caber."
                      : `Ajuste automático: fonte ${fit.fontSize}px${fit.columns > 1 ? ", 2 colunas" : ""}.`}
                  </div>
                )}
              </div>
            )}

            {tab === "assinaturas" && (
              <div className="space-y-6">
                <section className="space-y-3">
                  <h3 className="font-semibold text-slate-800">Instrutor(a)</h3>
                  <Field label="Nome completo">
                    <Input value={form.instructorName} onChange={(e) => set("instructorName", e.target.value)} />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Especialização">
                      <Input
                        value={form.instructorSpecialization}
                        placeholder="Ex.: Engenheiro de Segurança do Trabalho"
                        onChange={(e) => set("instructorSpecialization", e.target.value)}
                      />
                    </Field>
                    <Field label="Carteirinha / registro no órgão">
                      <Input
                        value={form.instructorRegistration}
                        placeholder="Ex.: CREA-PR 123456/D"
                        onChange={(e) => set("instructorRegistration", e.target.value)}
                      />
                    </Field>
                  </div>
                  <ImageInput
                    label="Assinatura digitalizada (opcional)"
                    hint="PNG com fundo transparente fica melhor. Deixe vazio para assinar à mão."
                    value={form.instructorSignature}
                    onChange={(v) => set("instructorSignature", v)}
                    maxW={700}
                    maxH={250}
                  />
                </section>

                <section className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                  <h3 className="font-semibold text-slate-800">Discente</h3>
                  O nome completo e o CPF de cada aluno são preenchidos automaticamente a partir da lista de alunos.
                </section>

                <section className="space-y-3">
                  <label className="flex items-center gap-2 font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={form.extraEnabled}
                      onChange={(e) => set("extraEnabled", e.target.checked)}
                      className="h-4 w-4"
                    />
                    Incluir terceira assinatura (diretor, aprovador, organizador…)
                  </label>
                  {form.extraEnabled && (
                    <>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Nome completo">
                          <Input value={form.extraName} onChange={(e) => set("extraName", e.target.value)} />
                        </Field>
                        <Field label="Cargo / papel">
                          <Input
                            value={form.extraRole}
                            placeholder="Ex.: Diretor de Operações"
                            onChange={(e) => set("extraRole", e.target.value)}
                          />
                        </Field>
                      </div>
                      <ImageInput
                        label="Assinatura digitalizada (opcional)"
                        value={form.extraSignature}
                        onChange={(v) => set("extraSignature", v)}
                        maxW={700}
                        maxH={250}
                      />
                    </>
                  )}
                </section>
              </div>
            )}

            {tab === "alunos" && (
              <StudentsPanel
                courseId={course.id}
                students={students}
                setStudents={(s) => {
                  setStudents(s);
                  if (!s.find((x) => x.id === previewId)) setPreviewId(s[0]?.id ?? null);
                }}
                previewId={previewStudent?.id ?? null}
                onPreview={(id) => setPreviewId(id)}
                onDownload={(s) => exporter.run([s], "single")}
                busy={exporter.busy}
              />
            )}
          </div>
        </Card>

        {/* Pré-visualização */}
        <div className="xl:sticky xl:top-20 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
              {(["frente", "verso"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize ${
                    side === s ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {students.length > 0 && (
              <select
                value={previewStudent?.id}
                onChange={(e) => setPreviewId(e.target.value)}
                className="ml-auto max-w-64 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                title="Aluno exibido na pré-visualização"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
          <ScaledPage>
            {side === "frente" ? (
              <CertificateFront t={certTemplate} d={data} />
            ) : (
              <CertificateBack t={certTemplate} d={data} onFit={setFit} />
            )}
          </ScaledPage>
          {/* mantém o ajuste da ementa calculado mesmo exibindo a frente */}
          {side === "frente" && (
            <div style={{ position: "fixed", left: -20000, top: 0 }} aria-hidden>
              <CertificateBack t={certTemplate} d={data} onFit={setFit} />
            </div>
          )}
          <p className="text-xs text-slate-500">Pré-visualização em escala. O PDF sai em A4 paisagem (297 × 210 mm).</p>
        </div>
      </div>
    </div>
  );
}
