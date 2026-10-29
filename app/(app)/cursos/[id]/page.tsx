import { notFound } from "next/navigation";
import { getCourse, listStudents, listTemplates } from "@/lib/data";
import { CourseEditor } from "@/components/CourseEditor";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();
  const [students, templates, settings] = await Promise.all([listStudents(id), listTemplates(), getSettings()]);
  return <CourseEditor course={course} initialStudents={students} templates={templates} issuerText={settings.issuerText} />;
}
