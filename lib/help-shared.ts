// Conteúdo da página de Ajuda (usado no servidor e no navegador).

export interface HelpVideo {
  id: string;
  title: string;
  description: string;
  url: string;
}

export interface HelpContent {
  title: string;
  intro: string;
  videos: HelpVideo[];
  steps: string; // HTML
  welcomeEnabled: boolean;
  welcomeTitle: string;
  welcomeText: string;
}

export const DEFAULT_STEPS = `<h3>1. Crie o curso</h3><p>Em <strong>Cursos › + Novo curso</strong>, informe o nome, a data de conclusão e a carga horária.</p><h3>2. Escolha o modelo</h3><p>Na aba <strong>Dados do curso</strong>, selecione o modelo de certificado. A pré-visualização ao lado mostra como vai ficar.</p><h3>3. Escreva a ementa</h3><p>Na aba <strong>Ementa</strong>, escreva ou cole o conteúdo programático. O texto se ajusta sozinho ao verso do certificado.</p><h3>4. Preencha as assinaturas</h3><p>Na aba <strong>Assinaturas</strong>, informe o instrutor (nome, especialização e registro) e, se precisar, uma terceira assinatura.</p><h3>5. Cadastre os alunos</h3><p>Na aba <strong>Alunos</strong>, importe um CSV com <strong>nome</strong> e <strong>CPF</strong> (use “Baixar modelo de CSV”) ou adicione um a um.</p><h3>6. Emita os certificados</h3><p>Use <strong>Baixar todos em um PDF</strong>, <strong>PDFs individuais (.zip)</strong> ou o botão <strong>PDF</strong> ao lado de cada aluno.</p>`;

export const DEFAULT_HELP: HelpContent = {
  title: "Ajuda e treinamento",
  intro: "Assista aos vídeos para aprender a cadastrar cursos, importar alunos e emitir certificados.",
  videos: [],
  steps: DEFAULT_STEPS,
  welcomeEnabled: true,
  welcomeTitle: "Primeira vez por aqui?",
  welcomeText: "Assista aos vídeos curtos de treinamento e aprenda a emitir certificados em poucos minutos.",
};

export function normalizeHelp(raw: any): HelpContent {
  const d = DEFAULT_HELP;
  const s = (v: unknown, fallback: string, max: number) => (typeof v === "string" ? v.slice(0, max) : fallback);
  const videos: HelpVideo[] = Array.isArray(raw?.videos)
    ? raw.videos.slice(0, 50).map((v: any, i: number) => ({
        id: s(v?.id, `v${i}`, 40) || `v${i}`,
        title: s(v?.title, "", 150),
        description: s(v?.description, "", 600),
        url: s(v?.url, "", 500).trim(),
      }))
    : d.videos;
  return {
    title: s(raw?.title, d.title, 120) || d.title,
    intro: s(raw?.intro, d.intro, 600),
    videos,
    steps: s(raw?.steps, d.steps, 100_000),
    welcomeEnabled: typeof raw?.welcomeEnabled === "boolean" ? raw.welcomeEnabled : d.welcomeEnabled,
    welcomeTitle: s(raw?.welcomeTitle, d.welcomeTitle, 150),
    welcomeText: s(raw?.welcomeText, d.welcomeText, 400),
  };
}

export interface VideoEmbed {
  provider: "Vimeo" | "YouTube";
  embedUrl: string;
}

/** Converte um link do Vimeo ou YouTube no endereço do player incorporado. */
export function parseVideoUrl(url: string): VideoEmbed | null {
  const u = (url || "").trim();
  if (!u) return null;
  // Vimeo: vimeo.com/123, vimeo.com/123/abcdef (não listado), player.vimeo.com/video/123?h=abc,
  //        vimeo.com/channels/x/123, vimeo.com/showcase/1/video/123
  let m =
    /vimeo\.com\/(?:.*\/)?video\/(\d{5,})(?:\/([0-9a-f]{6,}))?/i.exec(u) ||
    /vimeo\.com\/(?:.*\/)?(\d{5,})(?:\/([0-9a-f]{6,}))?(?:[/?#]|$)/i.exec(u);
  if (m) {
    const hash = m[2] || /[?&]h=([0-9a-f]+)/i.exec(u)?.[1];
    const params = new URLSearchParams({ dnt: "1", title: "0", byline: "0", portrait: "0" });
    if (hash) params.set("h", hash);
    return { provider: "Vimeo", embedUrl: `https://player.vimeo.com/video/${m[1]}?${params}` };
  }
  // YouTube: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID, youtube.com/shorts/ID
  m = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/i.exec(u);
  if (m) return { provider: "YouTube", embedUrl: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0` };
  return null;
}
