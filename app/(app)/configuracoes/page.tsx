import { requireAdminPage } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { SettingsEditor } from "@/components/SettingsEditor";

export default async function SettingsPage() {
  await requireAdminPage();
  const settings = await getSettings();
  return <SettingsEditor key={JSON.stringify(settings)} initial={settings} />;
}
