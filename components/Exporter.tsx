"use client";

import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CertificateBack, CertificateFront, PAGE_H, PAGE_W, type CertData, type CertTemplate } from "./Certificate";
import { safeFileName } from "@/lib/format";

export interface ExportStudent {
  id: string;
  name: string;
  cpf: string;
}

type Mode = "single" | "combined" | "zip";

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

async function waitImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))));
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Gera os PDFs no navegador: renderiza frente e verso fora da tela,
 * captura como imagem em alta resolução e monta páginas A4 paisagem.
 */
export function useCertificateExporter(template: CertTemplate, base: Omit<CertData, "studentName" | "studentCpf">) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<ExportStudent | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  const run = useCallback(
    async (students: ExportStudent[], mode: Mode) => {
      if (!students.length) return;
      setError("");
      setProgress({ done: 0, total: students.length });
      try {
        const [{ toJpeg, getFontEmbedCSS }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
        const JSZip = mode === "zip" ? (await import("jszip")).default : null;
        const zip = JSZip ? new JSZip() : null;
        await document.fonts.ready;

        const newPdf = () => new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
        let combined = mode === "combined" ? newPdf() : null;
        let fontCss: string | undefined;
        const usedNames = new Set<string>();

        for (let i = 0; i < students.length; i++) {
          const s = students[i];
          flushSync(() => setCurrent(s));
          await nextFrame();
          const stage = stageRef.current;
          if (!stage) throw new Error("Falha ao preparar a página");
          await waitImages(stage);
          const pages = Array.from(stage.querySelectorAll<HTMLElement>(".cert-page"));
          if (fontCss === undefined) fontCss = await getFontEmbedCSS(pages[0]).catch(() => "");
          const shots: string[] = [];
          for (const page of pages) {
            shots.push(
              await toJpeg(page, {
                quality: 0.9,
                pixelRatio: 2,
                width: PAGE_W,
                height: PAGE_H,
                backgroundColor: "#ffffff",
                fontEmbedCSS: fontCss || undefined,
              })
            );
          }
          const pdf = combined || newPdf();
          shots.forEach((img, idx) => {
            if (idx > 0 || (combined && i > 0)) pdf.addPage("a4", "landscape");
            pdf.addImage(img, "JPEG", 0, 0, 297, 210, undefined, "FAST");
          });
          if (!combined) {
            let name = safeFileName(`Certificado - ${s.name} - ${base.courseName}`) || `certificado-${i + 1}`;
            while (usedNames.has(name)) name += "_";
            usedNames.add(name);
            const blob = pdf.output("blob");
            if (zip) zip.file(`${name}.pdf`, blob);
            else download(blob, `${name}.pdf`);
          }
          setProgress({ done: i + 1, total: students.length });
        }

        if (combined) download(combined.output("blob"), `${safeFileName(`Certificados - ${base.courseName}`)}.pdf`);
        if (zip) download(await zip.generateAsync({ type: "blob" }), `${safeFileName(`Certificados - ${base.courseName}`)}.zip`);
        combined = null;
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Falha ao gerar o PDF");
      } finally {
        setCurrent(null);
        setProgress(null);
      }
    },
    [base.courseName]
  );

  const stage = (
    <div aria-hidden style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }}>
      {current && (
        <div ref={stageRef} style={{ display: "flex", flexDirection: "column" }}>
          <CertificateFront t={template} d={{ ...base, studentName: current.name, studentCpf: current.cpf }} placeholders={false} />
          <CertificateBack t={template} d={{ ...base, studentName: current.name, studentCpf: current.cpf }} placeholders={false} />
        </div>
      )}
    </div>
  );

  return { run, stage, progress, error, busy: progress !== null };
}
