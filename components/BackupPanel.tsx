"use client";

import { useRef, useState } from "react";
import {
  backupCourse,
  backupManifest,
  backupSettingsAndUsers,
  backupSettingsImage,
  backupTemplate,
  backupTemplateImage,
  restoreCourse,
  restoreFinish,
  restoreSettingsAndUsers,
  restoreSettingsImage,
  restoreStudents,
  restoreTemplate,
  restoreTemplateImage,
  type ImageCol,
  type SettingsImageCol,
} from "@/lib/backup-actions";
import { Button, Card } from "./ui";

const FORMAT = "certificados-backup";

interface BackupFile {
  format: string;
  version: number;
  exportedAt: string;
  settings: { data: any; help: any; logo: string | null; login_bg: string | null };
  users: any[];
  templates: any[];
  courses: any[];
}

async function must<T>(p: Promise<{ ok: true; data?: T } | { ok: false; error: string }>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(r.error);
  return r.data as T;
}

function Progress({ step, done, total }: { step: string; done: number; total: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm text-slate-600">
        <span>{step}</span>
        <span className="tabular-nums">{Math.round((done / Math.max(total, 1)) * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${(done / Math.max(total, 1)) * 100}%` }} />
      </div>
    </div>
  );
}

export function BackupPanel() {
  const [progress, setProgress] = useState<{ step: string; done: number; total: number } | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = progress !== null;

  /* ------------------------------ Exportar ------------------------------ */
  async function exportAll() {
    setMsg(null);
    try {
      const m = await must(backupManifest());
      const imgCount = m.templates.reduce((n, t) => n + t.images.length, 0) + m.settingsImages.length;
      const total = 1 + m.settingsImages.length + m.templates.length + imgCount + m.courseIds.length;
      let done = 0;
      const tick = (step: string) => setProgress({ step, done: ++done, total });
      setProgress({ step: "Preparando…", done: 0, total });

      const base = await must(backupSettingsAndUsers());
      tick("Configurações e usuários");
      const settings: BackupFile["settings"] = { ...base.settings, logo: null, login_bg: null };
      for (const col of m.settingsImages) {
        settings[col as SettingsImageCol] = await must(backupSettingsImage(col));
        tick("Imagens das configurações");
      }

      const templates: any[] = [];
      for (const t of m.templates) {
        const row: any = await must(backupTemplate(t.id));
        tick(`Modelo “${row.name}”`);
        for (const col of t.images) {
          row[col] = await must(backupTemplateImage(t.id, col));
          tick(`Modelo “${row.name}”`);
        }
        templates.push(row);
      }

      const courses: any[] = [];
      for (const id of m.courseIds) {
        const c: any = await must(backupCourse(id));
        courses.push(c);
        tick(`Curso “${c.name}”`);
      }

      const file: BackupFile = {
        format: FORMAT,
        version: 1,
        exportedAt: new Date().toISOString(),
        settings,
        users: base.users,
        templates,
        courses,
      };
      const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
      a.href = url;
      a.download = `backup-certificados-${stamp}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      const students = courses.reduce((n, c) => n + c.students.length, 0);
      setMsg({
        type: "ok",
        text: `Backup baixado: ${templates.length} modelo(s), ${courses.length} curso(s), ${students} aluno(s), ${base.users.length} usuário(s).`,
      });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Falha ao gerar o backup" });
    } finally {
      setProgress(null);
    }
  }

  /* ------------------------------ Restaurar ------------------------------ */
  async function pickFile(file?: File) {
    if (!file) return;
    setMsg(null);
    try {
      const data = JSON.parse(await file.text());
      if (data?.format !== FORMAT || !Array.isArray(data.courses) || !Array.isArray(data.templates)) {
        throw new Error("Este arquivo não é um backup do sistema de certificados.");
      }
      setPending(data);
    } catch (e: any) {
      setMsg({ type: "err", text: e instanceof SyntaxError ? "Arquivo inválido (não é JSON)." : e.message });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function restoreAll() {
    const b = pending;
    if (!b) return;
    setMsg(null);
    try {
      const settingsImgs = (["logo", "login_bg"] as SettingsImageCol[]).filter((c) => b.settings?.[c]);
      const tplImgs = b.templates.reduce(
        (n, t) => n + (["logo", "front_bg", "back_bg"] as ImageCol[]).filter((c) => t[c]).length,
        0
      );
      const studentChunks = b.courses.reduce((n, c) => n + Math.ceil((c.students?.length || 0) / 500), 0);
      const total = 1 + settingsImgs.length + b.templates.length + tplImgs + b.courses.length + studentChunks;
      let done = 0;
      const tick = (step: string) => setProgress({ step, done: ++done, total });
      setProgress({ step: "Restaurando…", done: 0, total });

      await must(restoreSettingsAndUsers({ settings: b.settings, users: b.users }));
      tick("Configurações e usuários");
      for (const col of settingsImgs) {
        await must(restoreSettingsImage(col, b.settings[col]));
        tick("Imagens das configurações");
      }
      for (const t of b.templates) {
        await must(restoreTemplate(t));
        tick(`Modelo “${t.name}”`);
        for (const col of ["logo", "front_bg", "back_bg"] as ImageCol[]) {
          if (!t[col]) continue;
          await must(restoreTemplateImage(t.id, col, t[col]));
          tick(`Modelo “${t.name}”`);
        }
      }
      for (const c of b.courses) {
        const { students = [], ...course } = c;
        await must(restoreCourse(course));
        tick(`Curso “${c.name}”`);
        for (let i = 0; i < students.length; i += 500) {
          await must(restoreStudents(c.id, students.slice(i, i + 500)));
          tick(`Alunos de “${c.name}”`);
        }
      }
      await must(restoreFinish());
      setPending(null);
      setMsg({ type: "ok", text: "Restauração concluída. Recarregue a página para ver tudo atualizado." });
    } catch (e: any) {
      setMsg({ type: "err", text: `A restauração parou: ${e?.message || "erro"}. Você pode tentar de novo; o que já foi restaurado é atualizado, não duplicado.` });
    } finally {
      setProgress(null);
    }
  }

  const students = pending?.courses.reduce((n, c) => n + (c.students?.length || 0), 0) ?? 0;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <b>O arquivo de backup contém nomes e CPFs.</b> Guarde-o em local seguro e apague-o quando não precisar mais
        (por exemplo, logo após concluir uma migração).
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}
      {progress && (
        <Card className="p-4">
          <Progress {...progress} />
        </Card>
      )}

      <Card className="p-5 space-y-3">
        <div>
          <h2 className="font-semibold text-slate-900">Baixar backup</h2>
          <p className="text-sm text-slate-500">
            Gera um arquivo com tudo: configurações, página de ajuda, usuários autorizados, modelos (com imagens), cursos e
            alunos.
          </p>
        </div>
        <Button onClick={exportAll} disabled={busy}>Baixar backup completo</Button>
      </Card>

      <Card className="p-5 space-y-3">
        <div>
          <h2 className="font-semibold text-slate-900">Restaurar backup</h2>
          <p className="text-sm text-slate-500">
            Use em uma instalação nova (migração) ou para recuperar dados. Itens com o mesmo identificador são atualizados;
            nada do que já existe e não está no arquivo é apagado.
          </p>
        </div>
        {!pending ? (
          <>
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
              Escolher arquivo de backup…
            </Button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
          </>
        ) : (
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4 space-y-3">
            <div className="text-sm text-slate-700">
              Backup de <b>{new Date(pending.exportedAt).toLocaleString("pt-BR")}</b>:
              <ul className="list-disc pl-5 mt-1">
                <li>{pending.templates.length} modelo(s)</li>
                <li>{pending.courses.length} curso(s) e {students} aluno(s)</li>
                <li>{pending.users.length} usuário(s) autorizado(s)</li>
                <li>Configurações de aparência e página de ajuda</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button onClick={restoreAll} disabled={busy}>{busy ? "Restaurando…" : "Restaurar agora"}</Button>
              <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>Cancelar</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
