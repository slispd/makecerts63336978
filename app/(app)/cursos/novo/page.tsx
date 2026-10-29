import Link from "next/link";
import { createCourse } from "@/lib/actions";
import { listTemplateNames } from "@/lib/data";
import { Card, Field, Input, PageHeader, Select } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  const templates = await listTemplateNames();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Novo curso" subtitle="Depois de criar, você preenche a ementa, as assinaturas e importa os alunos." />
      <Card className="p-6">
        {templates.length === 0 && (
          <div className="mb-5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Ainda não há modelos de certificado.{" "}
            <Link href="/modelos/novo" className="underline font-medium">Crie um modelo</Link> para escolher aqui (você pode
            definir depois).
          </div>
        )}
        <form action={createCourse} className="space-y-5">
          <Field label="Nome do curso">
            <Input name="name" required placeholder="Ex.: Segurança da Informação e LGPD" autoFocus />
          </Field>
          <Field label="Modelo de certificado">
            <Select name="templateId" defaultValue={templates[0]?.id || ""}>
              <option value="">— escolher depois —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Departamento">
              <Input name="department" placeholder="Ex.: RH" />
            </Field>
            <Field label="Data de conclusão">
              <Input name="completionDate" type="date" />
            </Field>
            <Field label="Carga horária">
              <Input name="workload" placeholder="Ex.: 8 horas" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/cursos" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</Link>
            <button className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900">
              Criar e continuar
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
