"use server";

/**
 * Backup e restauração completos do sistema (somente administradores).
 * Tudo é transferido em partes pequenas porque a Vercel limita cada
 * requisição a ~4,5 MB, e as imagens (fundos, logos) podem ser grandes.
 */

import { revalidatePath } from "next/cache";
import { ensureSchema, sql } from "./db";
import { assertAdmin } from "./session";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    await assertAdmin();
    await ensureSchema();
    return { ok: true, data: await fn() };
  } catch (e: any) {
    console.error(e);
    return { ok: false, error: e?.message || "Erro inesperado" };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (v: unknown) => {
  if (typeof v !== "string" || !UUID.test(v)) throw new Error("Arquivo de backup inválido (identificador).");
  return v;
};
const optUuid = (v: unknown) => (typeof v === "string" && UUID.test(v) ? v : null);
const str = (v: unknown, max = 500) => (v == null ? "" : String(v)).slice(0, max);
const bool = (v: unknown) => v === true || v === "true";
const ts = (v: unknown) => {
  const d = new Date(String(v ?? ""));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};
const img = (v: unknown) => {
  if (v == null || v === "") return null;
  const s = String(v);
  if (!/^data:image\/(png|jpe?g|webp|svg\+xml);base64,/.test(s)) throw new Error("Arquivo de backup inválido (imagem).");
  if (s.length > 4_400_000) throw new Error("Imagem grande demais no backup.");
  return s;
};
const iso = (v: any) => (v instanceof Date ? v.toISOString() : v);

export type ImageCol = "logo" | "front_bg" | "back_bg";
export type SettingsImageCol = "logo" | "login_bg";

/* =============================== EXPORTAR =============================== */

export async function backupManifest() {
  return run(async () => {
    const templates = await sql`select id, logo is not null as has_logo, front_bg is not null as has_front,
      back_bg is not null as has_back from templates order by created_at`;
    const courses = await sql`select id from courses order by created_at`;
    const s = await sql`select logo is not null as has_logo, login_bg is not null as has_bg from app_settings where id = 1`;
    const students = await sql`select count(*)::int as n from students`;
    return {
      templates: templates.map((t: any) => ({
        id: t.id as string,
        images: [t.has_logo && "logo", t.has_front && "front_bg", t.has_back && "back_bg"].filter(Boolean) as ImageCol[],
      })),
      courseIds: courses.map((c: any) => c.id as string),
      settingsImages: [s[0]?.has_logo && "logo", s[0]?.has_bg && "login_bg"].filter(Boolean) as SettingsImageCol[],
      studentCount: students[0]?.n ?? 0,
    };
  });
}

export async function backupSettingsAndUsers() {
  return run(async () => {
    const s = await sql`select data, help from app_settings where id = 1`;
    const users = await sql`select email, name, role, active, created_at from app_users order by email`;
    return {
      settings: { data: s[0]?.data ?? {}, help: s[0]?.help ?? null },
      users: users.map((u: any) => ({ ...u, created_at: iso(u.created_at) })),
    };
  });
}

export async function backupSettingsImage(col: SettingsImageCol) {
  return run(async () => {
    const rows =
      col === "logo"
        ? await sql`select logo as v from app_settings where id = 1`
        : await sql`select login_bg as v from app_settings where id = 1`;
    return (rows[0]?.v as string | null) ?? null;
  });
}

export async function backupTemplate(id: string) {
  return run(async () => {
    const rows = await sql`select id, name, primary_color, text_color, title_font, name_font, show_border, created_at, updated_at
      from templates where id = ${uuid(id)}`;
    const r: any = rows[0];
    if (!r) throw new Error("Modelo não encontrado");
    return { ...r, created_at: iso(r.created_at), updated_at: iso(r.updated_at) };
  });
}

export async function backupTemplateImage(id: string, col: ImageCol) {
  return run(async () => {
    const tid = uuid(id);
    const rows =
      col === "logo"
        ? await sql`select logo as v from templates where id = ${tid}`
        : col === "front_bg"
          ? await sql`select front_bg as v from templates where id = ${tid}`
          : await sql`select back_bg as v from templates where id = ${tid}`;
    return (rows[0]?.v as string | null) ?? null;
  });
}

export async function backupCourse(id: string) {
  return run(async () => {
    const cid = uuid(id);
    const rows = await sql`select * from courses where id = ${cid}`;
    const c: any = rows[0];
    if (!c) throw new Error("Curso não encontrado");
    const students = await sql`select id, name, cpf, created_at from students where course_id = ${cid} order by name`;
    return {
      ...c,
      created_at: iso(c.created_at),
      updated_at: iso(c.updated_at),
      students: students.map((s: any) => ({ ...s, created_at: iso(s.created_at) })),
    };
  });
}

/* =============================== RESTAURAR =============================== */

export async function restoreSettingsAndUsers(input: { settings?: any; users?: any[] }) {
  return run(async () => {
    const data = JSON.stringify(input.settings?.data ?? {});
    const help = input.settings?.help ? JSON.stringify(input.settings.help) : null;
    await sql`insert into app_settings (id, data, help) values (1, ${data}::jsonb, ${help}::jsonb)
      on conflict (id) do update set data = excluded.data, help = excluded.help, updated_at = now()`;
    for (const u of (input.users ?? []).slice(0, 5000)) {
      const email = str(u?.email, 200).toLowerCase().trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;
      await sql`insert into app_users (email, name, role, active, created_at)
        values (${email}, ${str(u?.name, 200)}, ${u?.role === "admin" ? "admin" : "coordenador"}, ${u?.active !== false}, ${ts(u?.created_at)})
        on conflict (email) do update set name = excluded.name, role = excluded.role, active = excluded.active`;
    }
  });
}

export async function restoreSettingsImage(col: SettingsImageCol, value: string | null) {
  return run(async () => {
    const v = img(value);
    if (col === "logo") await sql`update app_settings set logo = ${v}, updated_at = now() where id = 1`;
    else await sql`update app_settings set login_bg = ${v}, updated_at = now() where id = 1`;
  });
}

export async function restoreTemplate(t: any) {
  return run(async () => {
    const id = uuid(t?.id);
    await sql`insert into templates (id, name, primary_color, text_color, title_font, name_font, show_border, created_at, updated_at)
      values (${id}, ${str(t.name, 120) || "Modelo"}, ${str(t.primary_color, 7) || "#1d3557"}, ${str(t.text_color, 7) || "#1f2937"},
              ${t.title_font === "sans" ? "sans" : "serif"},
              ${["script", "serif", "sans"].includes(t.name_font) ? t.name_font : "script"},
              ${bool(t.show_border)}, ${ts(t.created_at)}, ${ts(t.updated_at)})
      on conflict (id) do update set name = excluded.name, primary_color = excluded.primary_color,
        text_color = excluded.text_color, title_font = excluded.title_font, name_font = excluded.name_font,
        show_border = excluded.show_border, updated_at = excluded.updated_at`;
  });
}

export async function restoreTemplateImage(id: string, col: ImageCol, value: string | null) {
  return run(async () => {
    const tid = uuid(id);
    const v = img(value);
    if (col === "logo") await sql`update templates set logo = ${v} where id = ${tid}`;
    else if (col === "front_bg") await sql`update templates set front_bg = ${v} where id = ${tid}`;
    else await sql`update templates set back_bg = ${v} where id = ${tid}`;
  });
}

export async function restoreCourse(c: any) {
  return run(async () => {
    const id = uuid(c?.id);
    // O modelo só é vinculado se existir no banco (evita erro de chave estrangeira)
    const tpl = optUuid(c.template_id);
    const tplOk = tpl ? (await sql`select 1 from templates where id = ${tpl}`).length > 0 : false;
    await sql`insert into courses (id, name, template_id, department, completion_date, workload, syllabus,
        instructor_name, instructor_specialization, instructor_registration, instructor_cpf, instructor_signature,
        extra_enabled, extra_name, extra_role, extra_registration, extra_cpf, extra_signature,
        created_by, created_at, updated_at)
      values (${id}, ${str(c.name, 200) || "Curso"}, ${tplOk ? tpl : null}, ${str(c.department, 120)},
        ${str(c.completion_date, 10)}, ${str(c.workload, 40)}, ${str(c.syllabus, 200_000)},
        ${str(c.instructor_name, 200)}, ${str(c.instructor_specialization, 200)}, ${str(c.instructor_registration, 200)},
        ${str(c.instructor_cpf, 20)}, ${img(c.instructor_signature)},
        ${bool(c.extra_enabled)}, ${str(c.extra_name, 200)}, ${str(c.extra_role, 200)}, ${str(c.extra_registration, 200)},
        ${str(c.extra_cpf, 20)}, ${img(c.extra_signature)},
        ${str(c.created_by, 200)}, ${ts(c.created_at)}, ${ts(c.updated_at)})
      on conflict (id) do update set name = excluded.name, template_id = excluded.template_id,
        department = excluded.department, completion_date = excluded.completion_date, workload = excluded.workload,
        syllabus = excluded.syllabus, instructor_name = excluded.instructor_name,
        instructor_specialization = excluded.instructor_specialization,
        instructor_registration = excluded.instructor_registration, instructor_cpf = excluded.instructor_cpf,
        instructor_signature = excluded.instructor_signature, extra_enabled = excluded.extra_enabled,
        extra_name = excluded.extra_name, extra_role = excluded.extra_role,
        extra_registration = excluded.extra_registration, extra_cpf = excluded.extra_cpf,
        extra_signature = excluded.extra_signature, updated_at = excluded.updated_at`;
  });
}

export async function restoreStudents(courseId: string, list: any[]) {
  return run(async () => {
    const cid = uuid(courseId);
    const clean = (list ?? []).slice(0, 1000).filter((s) => UUID.test(String(s?.id)) && s?.name);
    if (!clean.length) return;
    const ids = clean.map((s) => String(s.id));
    const names = clean.map((s) => str(s.name, 200));
    const cpfs = clean.map((s) => str(s.cpf, 20).replace(/\D/g, ""));
    const dates = clean.map((s) => ts(s.created_at));
    await sql`insert into students (id, course_id, name, cpf, created_at)
      select i::uuid, ${cid}::uuid, n, c, d::timestamptz
      from unnest(${ids}::text[], ${names}::text[], ${cpfs}::text[], ${dates}::text[]) as t(i, n, c, d)
      on conflict (id) do update set name = excluded.name, cpf = excluded.cpf, course_id = excluded.course_id`;
  });
}

export async function restoreFinish() {
  return run(async () => {
    revalidatePath("/", "layout");
  });
}
