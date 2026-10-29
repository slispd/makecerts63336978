"use client";

import { useRef, useState } from "react";

/** Lê um arquivo de imagem e o reduz para caber em maxW × maxH. */
export async function fileToDataUrl(file: File, maxW: number, maxH: number, keepAlpha: boolean): Promise<string> {
  const src = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Não foi possível ler a imagem"));
    r.readAsDataURL(file);
  });
  const img = new Image();
  img.src = src;
  await img.decode();
  const w0 = img.naturalWidth || maxW;
  const h0 = img.naturalHeight || maxH;
  const ratio = Math.min(1, maxW / w0, maxH / h0);
  const w = Math.round(w0 * ratio);
  const h = Math.round(h0 * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (!keepAlpha) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  return keepAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.88);
}

export function ImageInput({
  label,
  hint,
  value,
  onChange,
  maxW = 1200,
  maxH = 1200,
  keepAlpha = true,
  previewClass = "h-16",
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (v: string | null) => void;
  maxW?: number;
  maxH?: number;
  keepAlpha?: boolean;
  previewClass?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Escolha um arquivo de imagem (PNG, JPG, SVG ou WEBP).");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      onChange(await fileToDataUrl(file, maxW, maxH, keepAlpha));
    } catch (e: any) {
      setErr(e?.message || "Falha ao carregar a imagem");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files?.[0]);
        }}
      >
        <div className={`${previewClass} aspect-[4/3] max-w-40 grid place-items-center rounded bg-white border border-slate-200 overflow-hidden shrink-0`}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-slate-400">vazio</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100"
              disabled={busy}
            >
              {busy ? "Carregando…" : value ? "Trocar" : "Enviar imagem"}
            </button>
            {value && (
              <button type="button" onClick={() => onChange(null)} className="rounded-md px-3 py-1.5 text-red-600 hover:bg-red-50">
                Remover
              </button>
            )}
          </div>
          {hint && <span className="text-xs text-slate-500">{hint}</span>}
          {err && <span className="text-xs text-red-600">{err}</span>}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}
