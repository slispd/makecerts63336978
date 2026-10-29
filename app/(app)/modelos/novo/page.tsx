import { TemplateEditor } from "@/components/TemplateEditor";
import { getSettings } from "@/lib/settings";

export default async function NewTemplatePage() {
  const s = await getSettings();
  return <TemplateEditor issuerText={s.issuerText} />;
}
