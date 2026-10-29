"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureSchema, sql } from "./db";
import { assertAdmin, assertUser } from "./session";
import { isUuid, listStudents, mapStudent, mapTemplate } from "./data";
import { normalizeCpf, titleCaseName } from "./format";
import type { CourseInput, Role, Student, TemplateInput } from "./types";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e: any) {
    if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
    console.error(e);
    return { ok: false, error: e?.message || "Erro inesperado" };
  }
}

const str = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);
const img = (v: unknown) => {
  const s = typeof v === "string" ? v : "";
  if (!s) return null;
  if (!/^data:image\/(png|jpe?g|webp|svg\+xml);base64,/.test(s)) throw new Error("Imagem inválida");
  if (s.length > 4_500_000) throw new Error("Imagem muito grande (máx. ~3 MB)");
  return s;
};
const color = (v: unknown, fallback: string) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : fallback);
const uuid = (v: string) => {
  if (!isUuid(v)) throw new Error("Identificador inválido");
  return v;
};

/* ------------------------------ Modelos ------------------------------ */

export async function saveTemplate(input: TemplateInput) {
  return run(async () => {
    await assertUser();
    await ensureSchema();
    const name = str(input.name, 120);
    if (!name) throw new Error("Dê um nome ao modelo");
    const v = {
      name,
      logo: img(input.logo),
      frontBg: img(input.frontBg),
      backBg: img(input.backBg),
      primary: color(input.primaryColor, "#1d3557"),
      text: color(input.textColor, "#1f2937"),
      titleFont: input.titleFont === "sans" ? "sans" : "serif",
      nameFont: ["script", "serif", "sans"].includes(input.nameFont) ? input.nameFont : "script",
      border: !!input.showBorder,
    };
    let rows;
    if (input.id) {
      rows = await sql`update templates set name=${v.name}, logo=${v.logo}, front_bg=${v.frontBg}, back_bg=${v.backBg},
        primary_color=${v.primary}, text_color=${v.text}, title_font=${v.titleFont}, name_font=${v.nameFont},
        show_border=${v.border}, updated_at=now() where id=${uuid(input.id)} returning *`;
    } else {
      rows = await sql`insert into templates (name, logo, front_bg, back_bg, primary_color, text_color, title_font, name_font, show_border)
        values (${v.name}, ${v.logo}, ${v.frontBg}, ${v.backBg}, ${v.primary}, ${v.text}, ${v.titleFont}, ${v.nameFont}, ${v.border})
        returning *`;
    }
    revalidatePath("/modelos");
    return mapTemplate(rows[0]);
  });
}

export async function deleteTemplate(id: string) {
  return run(async () => {
    await assertUser();
    await sql`delete from templates where id = ${uuid(id)}`;
    revalidatePath("/modelos");
  });
}

/* ------------------------------ Cursos ------------------------------ */

export async function createCourse(formData: FormData) {
  const user = await assertUser();
  await ensureSchema();
  const name = str(formData.get("name"), 200);
  const templateId = str(formData.get("templateId"));
  if (!name) throw new Error("Informe o nome do curso");
  const rows = await sql`insert into courses (name, template_id, department, completion_date, workload, created_by)
    values (${name}, ${isUuid(templateId) ? templateId : null}, ${str(formData.get("department"), 120)},
            ${str(formData.get("completionDate"), 10)}, ${str(formData.get("workload"), 40)}, ${user.email})
    returning id`;
  revalidatePath("/cursos");
  redirect(`/cursos/${rows[0].id}`);
}

export async function saveCourse(id: string, input: CourseInput) {
  return run(async () => {
    await assertUser();
    const name = str(input.name, 200);
    if (!name) throw new Error("Informe o nome do curso");
    const tpl = input.templateId && isUuid(input.templateId) ? input.templateId : null;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(input.completionDate) ? input.completionDate : "";
    const syllabus = String(input.syllabus ?? "").slice(0, 200_000);
    await sql`update courses set
      name=${name}, template_id=${tpl}, department=${str(input.department, 120)},
      completion_date=${date}, workload=${str(input.workload, 40)}, syllabus=${syllabus},
      instructor_name=${str(input.instructorName, 200)},
      instructor_specialization=${str(input.instructorSpecialization, 200)},
      instructor_registration=${str(input.instructorRegistration, 200)},
      instructor_signature=${img(input.instructorSignature)},
      extra_enabled=${!!input.extraEnabled}, extra_name=${str(input.extraName, 200)},
      extra_role=${str(input.extraRole, 200)}, extra_signature=${img(input.extraSignature)},
      updated_at=now()
      where id=${uuid(id)}`;
    revalidatePath("/cursos");
    revalidatePath(`/cursos/${id}`);
  });
}

export async function deleteCourse(id: string) {
  await assertUser();
  await sql`delete from courses where id = ${uuid(id)}`;
  revalidatePath("/cursos");
  redirect("/cursos");
}

export async function duplicateCourse(id: string) {
  const user = await assertUser();
  const rows = await sql`insert into courses (name, template_id, department, completion_date, workload, syllabus,
      instructor_name, instructor_specialization, instructor_registration, instructor_signature,
      extra_enabled, extra_name, extra_role, extra_signature, created_by)
    select name || ' (cópia)', template_id, department, '', workload, syllabus,
      instructor_name, instructor_specialization, instructor_registration, instructor_signature,
      extra_enabled, extra_name, extra_role, extra_signature, ${user.email}
    from courses where id = ${uuid(id)} returning id`;
  if (!rows[0]) throw new Error("Curso não encontrado");
  revalidatePath("/cursos");
  redirect(`/cursos/${rows[0].id}`);
}

/* ------------------------------ Alunos ------------------------------ */

export async function addStudent(courseId: string, name: string, cpf: string) {
  return run<Student>(async () => {
    await assertUser();
    const n = titleCaseName(str(name, 200));
    if (!n) throw new Error("Informe o nome do aluno");
    const rows = await sql`insert into students (course_id, name, cpf)
      values (${uuid(courseId)}, ${n}, ${normalizeCpf(cpf)}) returning *`;
    return mapStudent(rows[0]);
  });
}

export async function updateStudent(id: string, name: string, cpf: string) {
  return run<Student>(async () => {
    await assertUser();
    const n = titleCaseName(str(name, 200));
    if (!n) throw new Error("Informe o nome do aluno");
    const rows = await sql`update students set name=${n}, cpf=${normalizeCpf(cpf)} where id=${uuid(id)} returning *`;
    return mapStudent(rows[0]);
  });
}

export async function deleteStudent(id: string) {
  return run(async () => {
    await assertUser();
    await sql`delete from students where id = ${uuid(id)}`;
  });
}

export async function importStudents(courseId: string, list: { name: string; cpf: string }[], replace: boolean) {
  return run<Student[]>(async () => {
    await assertUser();
    const cid = uuid(courseId);
    const clean = list
      .slice(0, 2000)
      .map((s) => ({ name: titleCaseName(str(s.name, 200)), cpf: normalizeCpf(str(s.cpf, 20)) }))
      .filter((s) => s.name);
    if (replace) await sql`delete from students where course_id = ${cid}`;
    if (clean.length) {
      const names = clean.map((s) => s.name);
      const cpfs = clean.map((s) => s.cpf);
      await sql`insert into students (course_id, name, cpf)
        select ${cid}::uuid, n, c from unnest(${names}::text[], ${cpfs}::text[]) as t(n, c)`;
    }
    return listStudents(cid);
  });
}

/* ------------------------------ Usuários ------------------------------ */

export async function saveUser(email: string, name: string, role: Role) {
  return run(async () => {
    await assertAdmin();
    await ensureSchema();
    const e = str(email, 200).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error("E-mail inválido");
    const r = role === "admin" ? "admin" : "coordenador";
    await sql`insert into app_users (email, name, role) values (${e}, ${str(name, 200)}, ${r})
      on conflict (email) do update set name = excluded.name, role = excluded.role`;
    revalidatePath("/usuarios");
  });
}

export async function setUserActive(email: string, active: boolean) {
  return run(async () => {
    await assertAdmin();
    await sql`update app_users set active = ${active} where email = ${email}`;
    revalidatePath("/usuarios");
  });
}

export async function deleteUser(email: string) {
  return run(async () => {
    await assertAdmin();
    await sql`delete from app_users where email = ${email}`;
    revalidatePath("/usuarios");
  });
}
