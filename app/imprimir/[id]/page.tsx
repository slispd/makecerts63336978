import { notFound } from "next/navigation";
import { getCourse, getTemplate, listStudents } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { PrintView } from "@/components/PrintView";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aluno?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { aluno } = await searchParams;
  const course = await getCourse(id);
  if (!course) notFound();
  const [students, template] = await Promise.all([
    listStudents(id),
    course.templateId ? getTemplate(course.templateId) : Promise.resolve(null),
  ]);
  const list = aluno ? students.filter((s) => s.id === aluno) : students;
  const settings = await getSettings();
  return <PrintView course={course} students={list} template={template} issuerText={settings.issuerText} />;
}
