// Tipos e funções de configuração usados no servidor e no navegador.

export interface AppSettings {
  companyName: string;
  appName: string;
  loginTitle: string;
  loginSubtitle: string;
  loginFooter: string;
  loginWelcome: string;
  issuerText: string;
  primaryColor: string;
  darkColor: string;
  bgOverlay: number; // 0–90 (%)
}

export interface SettingsView extends AppSettings {
  logoUrl: string | null;
  bgUrl: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: "ABIX Tecnologia",
  appName: "Certificados",
  loginTitle: "Certificados\nde treinamentos",
  loginSubtitle: "Cadastre cursos, importe participantes e emita certificados em PDF no padrão A4.",
  loginFooter: "Uso interno",
  loginWelcome: "Acesse com sua conta corporativa.",
  issuerText: "A ABIX TECNOLOGIA LTDA certifica que,",
  primaryColor: "#1d3557",
  darkColor: "#0f1d33",
  bgOverlay: 70,
};

const HEX = /^#[0-9a-f]{6}$/i;

export function normalizeSettings(raw: any): AppSettings {
  const d = DEFAULT_SETTINGS;
  const s = (v: unknown, fallback: string, max: number) =>
    typeof v === "string" ? v.slice(0, max) : fallback;
  const n = Number(raw?.bgOverlay);
  return {
    companyName: s(raw?.companyName, d.companyName, 120),
    appName: s(raw?.appName, d.appName, 60) || d.appName,
    loginTitle: s(raw?.loginTitle, d.loginTitle, 200),
    loginSubtitle: s(raw?.loginSubtitle, d.loginSubtitle, 400),
    loginFooter: s(raw?.loginFooter, d.loginFooter, 120),
    loginWelcome: s(raw?.loginWelcome, d.loginWelcome, 200),
    issuerText: s(raw?.issuerText, d.issuerText, 200) || d.issuerText,
    primaryColor: HEX.test(raw?.primaryColor) ? raw.primaryColor : d.primaryColor,
    darkColor: HEX.test(raw?.darkColor) ? raw.darkColor : d.darkColor,
    bgOverlay: Number.isFinite(n) ? Math.min(90, Math.max(0, Math.round(n))) : d.bgOverlay,
  };
}

function mix(hex: string, target: string, amount: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex);
  const b = p(target);
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0")).join("");
}

/** Variáveis CSS das cores do sistema (sobrescrevem as do Tailwind). */
export function brandCss(s: Pick<AppSettings, "primaryColor" | "darkColor">) {
  const p = s.primaryColor;
  return `:root{--color-brand-50:${mix(p, "#ffffff", 0.93)};--color-brand-100:${mix(p, "#ffffff", 0.82)};--color-brand-500:${mix(p, "#ffffff", 0.22)};--color-brand-600:${mix(p, "#ffffff", 0.1)};--color-brand-700:${p};--color-brand-900:${s.darkColor};}`;
}
