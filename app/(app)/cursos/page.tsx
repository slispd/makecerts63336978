import Link from "next/link";
import { listCourses } from "@/lib/data";
import { formatDateLong } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await listCourses();
  return (
    <>
      <PageHeader
        title="Cursos"
        subtitle="Cada curso reúne a ementa, o instrutor e a lista de alunos que recebem certificado."
        actions={
          <Link
            href="/cursos/novo"
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
          >
            + Novo curso
          </Link>
        }
      />
      {courses.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg font-medium text-slate-800">Nenhum curso cadastrado ainda</p>
          <p className="text-slate-500 mt-1">
            Comece criando um <Link href="/modelos/novo" className="text-brand-600 underline">modelo de certificado</Link> e depois
            um curso.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Curso</th>
                <th className="px-5 py-3 font-medium">Departamento</th>
                <th className="px-5 py-3 font-medium">Conclusão</th>
                <th className="px-5 py-3 font-medium">Modelo</th>
                <th className="px-5 py-3 font-medium text-right">Alunos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/cursos/${c.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{c.department || "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{formatDateLong(c.completionDate) || "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{c.templateName || <span className="text-amber-600">Sem modelo</span>}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.studentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
