import { ensureSchema, sql } from "./db";
import type { AppUser, Course, CourseSummary, Student, Template } from "./types";

const iso = (v: any) => (v instanceof Date ? v.toISOString() : String(v ?? ""));

export function mapTemplate(r: any): Template {
  return {
    id: r.id,
    name: r.name,
    logo: r.logo ?? null,
    frontBg: r.front_bg ?? null,
    backBg: r.back_bg ?? null,
    primaryColor: r.primary_color,
    textColor: r.text_color,
    titleFont: r.title_font === "sans" ? "sans" : "serif",
    nameFont: ["script", "serif", "sans"].includes(r.name_font) ? r.name_font : "script",
    showBorder: !!r.show_border,
    updatedAt: iso(r.updated_at),
  };
}

export function mapCourse(r: any): Course {
  return {
    id: r.id,
    name: r.name,
    templateId: r.template_id ?? null,
    department: r.department ?? "",
    completionDate: r.completion_date ?? "",
    workload: r.workload ?? "",
    syllabus: r.syllabus ?? "",
    instructorName: r.instructor_name ?? "",
    instructorSpecialization: r.instructor_specialization ?? "",
    instructorRegistration: r.instructor_registration ?? "",
    instructorSignature: r.instructor_signature ?? null,
    extraEnabled: !!r.extra_enabled,
    extraName: r.extra_name ?? "",
    extraRole: r.extra_role ?? "",
    extraSignature: r.extra_signature ?? null,
    createdBy: r.created_by ?? "",
    updatedAt: iso(r.updated_at),
  };
}

export function mapStudent(r: any): Student {
  return { id: r.id, courseId: r.course_id, name: r.name, cpf: r.cpf };
}

export async function listTemplates(): Promise<Template[]> {
  await ensureSchema();
  const rows = await sql`select * from templates order by name`;
  return rows.map(mapTemplate);
}

/** Lista leve (sem imagens) para selects e tabelas. */
export async function listTemplateNames(): Promise<{ id: string; name: string; courseCount: number; logo: string | null }[]> {
  await ensureSchema();
  const rows = await sql`
    select t.id, t.name, t.logo, (select count(*) from courses c where c.template_id = t.id)::int as course_count
    from templates t order by t.name`;
  return rows.map((r: any) => ({ id: r.id, name: r.name, logo: r.logo, courseCount: r.course_count }));
}

export async function getTemplate(id: string): Promise<Template | null> {
  await ensureSchema();
  if (!isUuid(id)) return null;
  const rows = await sql`select * from templates where id = ${id}`;
  return rows[0] ? mapTemplate(rows[0]) : null;
}

export async function listCourses(): Promise<CourseSummary[]> {
  await ensureSchema();
  const rows = await sql`
    select c.id, c.name, c.department, c.completion_date, c.updated_at, t.name as template_name,
      (select count(*) from students s where s.course_id = c.id)::int as student_count
    from courses c left join templates t on t.id = c.template_id
    order by c.updated_at desc`;
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    department: r.department,
    completionDate: r.completion_date,
    templateName: r.template_name ?? null,
    studentCount: r.student_count,
    updatedAt: iso(r.updated_at),
  }));
}

export async function getCourse(id: string): Promise<Course | null> {
  await ensureSchema();
  if (!isUuid(id)) return null;
  const rows = await sql`select * from courses where id = ${id}`;
  return rows[0] ? mapCourse(rows[0]) : null;
}

export async function listStudents(courseId: string): Promise<Student[]> {
  await ensureSchema();
  const rows = await sql`select * from students where course_id = ${courseId} order by name`;
  return rows.map(mapStudent);
}

export async function listUsers(): Promise<AppUser[]> {
  await ensureSchema();
  const rows = await sql`select * from app_users order by name, email`;
  return rows.map((r: any) => ({ email: r.email, name: r.name, role: r.role, active: r.active }));
}

export function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
