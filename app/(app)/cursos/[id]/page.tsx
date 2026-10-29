import { notFound } from "next/navigation";
import { getCourse, listStudents, listTemplates } from "@/lib/data";
import { CourseEditor } from "@/components/CourseEditor";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();
  const [students, templates] = await Promise.all([listStudents(id), listTemplates()]);
  return <CourseEditor course={course} initialStudents={students} templates={templates} />;
}
