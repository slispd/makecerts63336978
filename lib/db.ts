import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const sql = neon(url || "postgres://missing:missing@localhost/missing");

let ready: Promise<void> | null = null;

/**
 * Cria as tabelas na primeira execução — não é preciso rodar migração
 * manual depois do deploy na Vercel.
 */
export function ensureSchema(): Promise<void> {
  if (!url) {
    throw new Error("DATABASE_URL não configurada. Conecte o Neon ao projeto na Vercel.");
  }
  if (!ready) {
    ready = (async () => {
      await sql`create table if not exists app_users (
        email text primary key,
        name text not null default '',
        role text not null default 'coordenador',
        active boolean not null default true,
        created_at timestamptz not null default now()
      )`;
      await sql`create table if not exists templates (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        logo text,
        front_bg text,
        back_bg text,
        primary_color text not null default '#1d3557',
        text_color text not null default '#1f2937',
        title_font text not null default 'serif',
        name_font text not null default 'script',
        show_border boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`;
      await sql`create table if not exists courses (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        template_id uuid references templates(id) on delete set null,
        department text not null default '',
        completion_date text not null default '',
        workload text not null default '',
        syllabus text not null default '',
        instructor_name text not null default '',
        instructor_specialization text not null default '',
        instructor_registration text not null default '',
        instructor_signature text,
        extra_enabled boolean not null default false,
        extra_name text not null default '',
        extra_role text not null default '',
        extra_signature text,
        created_by text not null default '',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`;
      await sql`create table if not exists students (
        id uuid primary key default gen_random_uuid(),
        course_id uuid not null references courses(id) on delete cascade,
        name text not null,
        cpf text not null default '',
        created_at timestamptz not null default now()
      )`;
      await sql`create index if not exists students_course_idx on students(course_id)`;
      await sql`create table if not exists app_settings (
        id int primary key default 1 check (id = 1),
        data jsonb not null default '{}'::jsonb,
        logo text,
        login_bg text,
        updated_at timestamptz not null default now()
      )`;
      await sql`alter table app_settings add column if not exists help jsonb`;
      await sql`create table if not exists user_prefs (
        email text primary key,
        welcome_dismissed boolean not null default false,
        updated_at timestamptz not null default now()
      )`;
      await sql`create table if not exists login_attempts (
        key text primary key,
        failures int not null default 0,
        window_start timestamptz not null default now(),
        locked_until timestamptz
      )`;
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
