import { notFound } from "next/navigation";
import { getTemplate } from "@/lib/data";
import { TemplateEditor } from "@/components/TemplateEditor";
import { getSettings } from "@/lib/settings";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();
  const [s, user] = await Promise.all([getSettings(), requireUser()]);
  return <TemplateEditor template={template} issuerText={s.issuerText} readOnly={user.role !== "admin"} />;
}
