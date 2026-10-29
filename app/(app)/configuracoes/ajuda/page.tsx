import { getHelp } from "@/lib/help";
import { HelpEditor } from "@/components/HelpEditor";

export default async function HelpSettingsPage() {
  const help = await getHelp();
  return <HelpEditor key={JSON.stringify(help)} initial={help} />;
}
