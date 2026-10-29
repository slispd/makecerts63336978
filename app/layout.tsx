import type { Metadata } from "next";
import { Great_Vibes, Inter, Playfair_Display } from "next/font/google";
import { brandCss, getSettings } from "@/lib/settings";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});
const script = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-script", display: "swap" });

// As configurações vêm do banco: todas as páginas são renderizadas por requisição.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s.companyName ? `${s.appName} · ${s.companyName}` : s.appName,
    description: "Emissão de certificados de treinamentos internos",
    icons: s.logoUrl ? { icon: s.logoUrl } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serif.variable} ${script.variable}`}>
      <head>
        <style id="brand-colors" dangerouslySetInnerHTML={{ __html: brandCss(s) }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
