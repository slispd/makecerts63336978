import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "./types";

export interface SessionUser {
  email: string;
  name: string;
  role: Role;
}

export async function getUser(): Promise<SessionUser | null> {
  const session = await auth();
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
