"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseVideoUrl, type HelpContent } from "@/lib/help-shared";
import { sanitizeHtml } from "@/lib/sanitize";
import { Card } from "./ui";

export function VideoPlayer({ url, title }: { url: string; title: string }) {
  const embed = parseVideoUrl(url);
  if (!embed) {
    return (
      <div className="aspect-video grid place-items-center rounded-xl bg-slate-100 text-sm text-slate-500 p-6 text-center">
        Link de vídeo inválido. Use um link do Vimeo ou do YouTube.
      </div>
    );
  }
  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black">
      <iframe
        src={embed.embedUrl}
        title={title || "Vídeo de treinamento"}
        className="h-full w-full"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

export function HelpView({ help, isAdmin }: { help: HelpContent; isAdmin: boolean }) {
  const videos = help.videos.filter((v) => v.url);
  const [current, setCurrent] = useState(0);
  const [steps, setSteps] = useState("");
  useEffect(() => setSteps(sanitizeHtml(help.steps)), [help.steps]);
  const video = videos[current];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{help.title}</h1>
          {help.intro && <p className="text-slate-500 mt-1 max-w-3xl">{help.intro}</p>}
        </div>
        {isAdmin && (
          <Link href="/configuracoes/ajuda" className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm hover:bg-slate-50">
            Editar esta página
          </Link>
        )}
      </div>

      {videos.length === 0 ? (
        <Card className="p-10 text-center text-slate-500">
          Nenhum vídeo de treinamento cadastrado ainda.
          {isAdmin && (
            <>
              {" "}
              <Link href="/configuracoes/ajuda" className="text-brand-600 underline">Adicionar vídeos</Link>
            </>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
          <div className="space-y-3">
            <VideoPlayer key={video.id} url={video.url} title={video.title} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{video.title}</h2>
              {video.description && <p className="text-slate-600 mt-1 whitespace-pre-line">{video.description}</p>}
            </div>
          </div>
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 text-sm font-medium text-slate-700">
              {videos.length} vídeo{videos.length > 1 ? "s" : ""}
            </div>
            <ol className="divide-y divide-slate-100">
              {videos.map((v, i) => (
                <li key={v.id}>
                  <button
                    onClick={() => setCurrent(i)}
                    className={`w-full text-left px-4 py-3 flex gap-3 transition ${i === current ? "bg-brand-50" : "hover:bg-slate-50"}`}
                  >
                    <span
                      className={`shrink-0 grid place-items-center w-7 h-7 rounded-full text-xs font-semibold ${
                        i === current ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-medium ${i === current ? "text-brand-700" : "text-slate-800"}`}>
                        {v.title || `Vídeo ${i + 1}`}
                      </span>
                      {v.description && <span className="block text-xs text-slate-500 line-clamp-2 mt-0.5">{v.description}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}

      {help.steps && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Passo a passo</h2>
          <div className="cert-syllabus leading-relaxed text-slate-700 max-w-3xl" dangerouslySetInnerHTML={{ __html: steps }} />
        </Card>
      )}
    </div>
  );
}
