import { listUsers } from "@/lib/data";
import { requireAdminPage } from "@/lib/session";
import { microsoftEnabled } from "@/auth";
import { UsersManager } from "@/components/UsersManager";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAdminPage();
  const users = await listUsers();
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Usuários autorizados"
        subtitle="Contas Microsoft 365 que podem entrar no sistema. O administrador pré-definido entra por e-mail e senha."
      />
      {!microsoftEnabled && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          O login Microsoft 365 ainda não está configurado. Preencha as variáveis <code>AUTH_MICROSOFT_ENTRA_ID_*</code> na Vercel
          (veja o README) para os coordenadores conseguirem entrar.
        </div>
      )}
      {process.env.ALLOW_ALL_TENANT_USERS === "true" && (
        <div className="mb-5 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Qualquer conta do tenant pode entrar como coordenador (ALLOW_ALL_TENANT_USERS=true). Desative um usuário para bloqueá-lo.
        </div>
      )}
      <UsersManager users={users} />
    </div>
  );
}
