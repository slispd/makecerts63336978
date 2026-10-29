import { cache } from "react";
import { ensureSchema, sql } from "./db";
import { DEFAULT_HELP, normalizeHelp, type HelpContent } from "./help-shared";

export * from "./help-shared";

export const getHelp = cache(async (): Promise<HelpContent> => {
  try {
    await ensureSchema();
    const rows = await sql`select help from app_settings where id = 1`;
    return rows[0]?.help ? normalizeHelp(rows[0].help) : DEFAULT_HELP;
  } catch (e) {
    console.error("Falha ao ler a ajuda:", e);
    return DEFAULT_HELP;
  }
});

/** O usuário marcou "não mostrar novamente" no aviso de boas-vindas? */
export async function isWelcomeDismissed(email: string): Promise<boolean> {
  try {
    await ensureSchema();
    const rows = await sql`select 1 from user_prefs where email = ${email.toLowerCase()} and welcome_dismissed`;
    return rows.length > 0;
  } catch {
    return false;
  }
}
