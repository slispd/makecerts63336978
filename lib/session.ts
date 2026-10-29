import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ensureSchema, sql } from "./db";
import type { Role } from "./types";

export interface SessionUser {
  email: string;
  name: string;
  role: Role;
}

/** Variáveis obrigatórias que ainda não foram configuradas na Vercel. */
export function missingEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) missing.push("AUTH_SECRET");
  if (!process.env.ADMIN_EMAIL) missing.push("ADMIN_EMAIL");
  if (!process.env.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD");
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) missing.push("DATABASE_URL (banco Neon)");
  return missing;
}

/**
 * Usuário da sessão, revalidado no banco a cada requisição: bloquear alguém
 * ou mudar o perfil em "Usuários" vale imediatamente, sem esperar novo login.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  let session;
  try {
    session = await auth();
  } catch (e) {
    console.error("Falha ao ler a sessão:", e);
    return null;
  }
  const email = String(session?.user?.email || "").toLowerCase();
  if (!email) return null;
  const name = session?.user?.name || email;

  // Administrador pré-definido (variáveis de ambiente)
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (adminEmail && email === adminEmail) return { email, name, role: "admin" };

  // Contas Microsoft: precisam existir e estar ativas
  try {
    await ensureSchema();
    const rows = await sql`select role, active from app_users where email = ${email}`;
    const row: any = rows[0];
    if (!row || !row.active) return null;
    return { email, name, role: row.role === "admin" ? "admin" : "coordenador" };
  } catch (e) {
    console.error("Falha ao validar o usuário:", e);
    return null; // na dúvida, nega o acesso
  }
});

/** Para páginas: redireciona para o login se não houver sessão. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/cursos");
  return user;
}

/** Para server actions: lança erro em vez de redirecionar. */
export async function assertUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) throw new Error("Sessão expirada. Entre novamente.");
  return user;
}

export async function assertAdmin(): Promise<SessionUser> {
  const user = await assertUser();
  if (user.role !== "admin") throw new Error("Apenas administradores podem fazer isso.");
  return user;
}
