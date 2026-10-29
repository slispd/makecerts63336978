import { cache } from "react";
import { ensureSchema, sql } from "./db";
import { DEFAULT_SETTINGS, normalizeSettings, type SettingsView } from "./settings-shared";

export * from "./settings-shared";

/** Lê as configurações (uma vez por requisição). Nunca lança erro: usa o padrão. */
export const getSettings = cache(async (): Promise<SettingsView> => {
  try {
    await ensureSchema();
    const rows = await sql`select data, logo is not null as has_logo, login_bg is not null as has_bg,
      floor(extract(epoch from updated_at))::bigint as v from app_settings where id = 1`;
    const r: any = rows[0];
    if (!r) return { ...DEFAULT_SETTINGS, logoUrl: null, bgUrl: null };
    return {
      ...normalizeSettings(r.data),
      logoUrl: r.has_logo ? `/branding/logo?v=${r.v}` : null,
      bgUrl: r.has_bg ? `/branding/fundo?v=${r.v}` : null,
    };
  } catch (e) {
    console.error("Falha ao ler configurações:", e);
    return { ...DEFAULT_SETTINGS, logoUrl: null, bgUrl: null };
  }
});
