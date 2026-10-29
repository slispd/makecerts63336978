import { ensureSchema, sql } from "@/lib/db";

// Serve o logo e a imagem de fundo configurados (públicos: aparecem na tela de login).
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind !== "logo" && kind !== "fundo") return new Response("Não encontrado", { status: 404 });
  try {
    await ensureSchema();
    const rows =
      kind === "logo"
        ? await sql`select logo as img from app_settings where id = 1`
        : await sql`select login_bg as img from app_settings where id = 1`;
    const img: string | null = rows[0]?.img ?? null;
    const m = img ? /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(img) : null;
    if (!m) return new Response("Não encontrado", { status: 404 });
    return new Response(Buffer.from(m[2], "base64"), {
      headers: {
        "Content-Type": m[1],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Erro", { status: 500 });
  }
}
