import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { microsoftEnabled, signIn } from "@/auth";
import { getUser, missingEnv } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { LoginHero } from "@/components/LoginHero";

const ERRORS: Record<string, string> = {
  CredentialsSignin: "E-mail ou senha incorretos.",
  AccessDenied: "Sua conta Microsoft não está autorizada. Peça acesso ao administrador.",
  Configuration: "Erro de configuração do login. Verifique as variáveis de ambiente.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getUser()) redirect("/cursos");
  const { error } = await searchParams;
  const missing = missingEnv();
  const settings = await getSettings();

  async function loginAdmin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/cursos",
      });
    } catch (e) {
      if (e instanceof AuthError) redirect(`/login?error=${e.type === "CredentialsSignin" ? "CredentialsSignin" : "Configuration"}`);
      throw e;
    }
  }

  async function loginMicrosoft() {
    "use server";
    await signIn("microsoft-entra-id", { redirectTo: "/cursos" });
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[1fr_480px]">
      <div className="hidden lg:flex [&>section]:flex-1">
        <LoginHero s={settings} />
      </div>

      <section className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {settings.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt="" className="h-10 w-auto mb-6 lg:hidden" />
          )}
          <h2 className="text-2xl font-semibold text-slate-900">Entrar</h2>
          <p className="text-slate-500 mt-1 mb-8">{settings.loginWelcome}</p>

          {missing.length > 0 && (
            <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <b>Configuração incompleta.</b> Faltam estas variáveis na Vercel:
              <ul className="list-disc pl-5 mt-1 font-mono text-xs">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <div className="mt-2">Depois de criá-las, faça um <b>Redeploy</b>.</div>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {ERRORS[error] || "Não foi possível entrar. Tente novamente."}
            </div>
          )}

          {microsoftEnabled && (
            <>
              <form action={loginMicrosoft}>
                <button className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-800 hover:bg-slate-50 transition">
                  <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden>
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  Entrar com Microsoft 365
                </button>
              </form>
              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
                <div className="h-px flex-1 bg-slate-200" /> administrador <div className="h-px flex-1 bg-slate-200" />
              </div>
            </>
          )}

          <form action={loginAdmin} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">E-mail</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Senha</span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
              />
            </label>
            <button className="w-full rounded-lg bg-brand-700 px-4 py-3 font-medium text-white hover:bg-brand-900 transition">
              Entrar
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
