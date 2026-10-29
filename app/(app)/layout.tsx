import Link from "next/link";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { NavLink } from "@/components/NavLink";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 bg-brand-900 text-white">
        <div className="mx-auto max-w-[1500px] px-6 h-14 flex items-center gap-8">
          <Link href="/cursos" className="flex items-center gap-2.5 font-semibold tracking-wide">
            <span className="grid place-items-center w-7 h-7 rounded bg-white text-brand-900 text-sm font-bold">A</span>
            <span>Certificados</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/cursos">Cursos</NavLink>
            <NavLink href="/modelos">Modelos</NavLink>
            {user.role === "admin" && <NavLink href="/usuarios">Usuários</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <div className="text-right leading-tight hidden sm:block">
              <div className="font-medium">{user.name}</div>
              <div className="text-white/50 text-xs">{user.role === "admin" ? "Administrador" : "Coordenador"}</div>
            </div>
            <form action={logout}>
              <button className="rounded-md border border-white/20 px-3 py-1.5 hover:bg-white/10">Sair</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-6 py-8">{children}</main>
    </div>
  );
}
