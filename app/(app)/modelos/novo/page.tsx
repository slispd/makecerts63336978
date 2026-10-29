import { TemplateEditor } from "@/components/TemplateEditor";
import { getSettings } from "@/lib/settings";
import { requireAdminPage } from "@/lib/session";

export default async function NewTemplatePage() {
  await requireAdminPage();
  const s = await getSettings();
  return <TemplateEditor issuerText={s.issuerText} />;
}
