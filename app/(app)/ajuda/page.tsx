import { getHelp } from "@/lib/help";
import { requireUser } from "@/lib/session";
import { HelpView } from "@/components/HelpView";

export default async function HelpPage() {
  const [user, help] = await Promise.all([requireUser(), getHelp()]);
  return <HelpView help={help} isAdmin={user.role === "admin"} />;
}
