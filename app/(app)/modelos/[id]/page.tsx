import { notFound } from "next/navigation";
import { getTemplate } from "@/lib/data";
import { TemplateEditor } from "@/components/TemplateEditor";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();
  return <TemplateEditor template={template} />;
}
