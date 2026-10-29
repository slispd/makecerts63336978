import { requireAdminPage } from "@/lib/session";
import { SettingsTabs } from "@/components/SettingsTabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Configurações</h1>
      <SettingsTabs />
      {children}
    </div>
  );
}
