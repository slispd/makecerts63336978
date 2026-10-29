import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

export async function getUser(): Promise<SessionUser | null> {
  let session;
  try {
    session = await auth();
  } catch (e) {
    console.error("Falha ao ler a sessão:", e);
    return null;
  }
  if (!session?.user?.email) return null;
  return {
    email: session.user.email,
    name: session.user.name || session.user.email,
    role: ((session.user as any).role as Role) || "coordenador",
  };
}

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
