import Link from "next/link";
import { createCourse } from "@/lib/actions";
import { Card, Field, Input, PageHeader } from "@/components/ui";

export default function NewCoursePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Novo curso"
        subtitle="Depois de criar, você escolhe o modelo do certificado, preenche a ementa, as assinaturas e importa os alunos."
      />
      <Card className="p-6">
        <form action={createCourse} className="space-y-5">
          <Field label="Nome do curso">
            <Input name="name" required placeholder="Ex.: Segurança da Informação e LGPD" autoFocus />
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
            <Link href="/cursos" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
              Cancelar
            </Link>
            <button className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900">
              Criar e continuar
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
