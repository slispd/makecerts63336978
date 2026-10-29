import Link from "next/link";
import { listTemplateNames } from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const [templates, user] = await Promise.all([listTemplateNames(), requireUser()]);
  const isAdmin = user.role === "admin";
  return (
    <>
      <PageHeader
        title="Modelos de certificado"
        subtitle={
          isAdmin
            ? "Defina logo, cores, fontes e artes de fundo. Cada curso escolhe um modelo."
            : "Modelos disponíveis para os cursos. Clique para visualizar."
        }
        actions={
          isAdmin && <Link href="/modelos/novo" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900">
            + Novo modelo
          </Link>
        }
      />
      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg font-medium text-slate-800">Nenhum modelo ainda</p>
          <p className="text-slate-500 mt-1">
            {isAdmin ? "Crie o primeiro modelo enviando o logo da ABIX." : "Peça ao administrador para cadastrar um modelo."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((t) => (
            <Link key={t.id} href={`/modelos/${t.id}`}>
              <Card className="p-5 hover:border-brand-500 hover:shadow-sm transition h-full">
                <div className="h-20 grid place-items-center rounded-lg bg-slate-50 mb-4">
                  {t.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.logo} alt="" className="max-h-14 max-w-[80%] object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400">sem logo</span>
                  )}
                </div>
                <div className="font-medium text-slate-900">{t.name}</div>
                <div className="text-sm text-slate-500">
                  {t.courseCount} curso{t.courseCount === 1 ? "" : "s"}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
