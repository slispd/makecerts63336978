"use client";

import { useMemo, useRef, useState } from "react";
import { addStudent, deleteStudent, importStudents, updateStudent } from "@/lib/actions";
import { csvToStudents, formatCpf, isValidCpf, parseCsv, type ParsedStudent } from "@/lib/format";
import type { Student } from "@/lib/types";
import { Button, inputCls } from "./ui";

async function readTextSmart(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    // CSV salvo pelo Excel em português costuma vir em Windows-1252
    return new TextDecoder("windows-1252").decode(buf);
  }
}

function downloadModel() {
  const csv = "﻿nome;cpf\nMaria da Silva Souza;123.456.789-09\nJoão Pereira Lima;98765432100\n";
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo-alunos.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export function StudentsPanel({
  courseId,
  students,
  setStudents,
  previewId,
  onPreview,
  onDownload,
  busy,
}: {
  courseId: string;
  students: Student[];
  setStudents: (s: Student[]) => void;
  previewId: string | null;
  onPreview: (id: string) => void;
  onDownload: (s: Student) => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string; cpf: string } | null>(null);
  const [filter, setFilter] = useState("");
  const [importRows, setImportRows] = useState<ParsedStudent[] | null>(null);
  const [replace, setReplace] = useState(false);
  const [working, setWorking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return students;
    return students.filter((s) => s.name.toLowerCase().includes(f) || s.cpf.includes(f.replace(/\D/g, "") || "§"));
  }, [students, filter]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    const r = await addStudent(courseId, name, cpf);
    setWorking(false);
    if (!r.ok) return setMsg({ type: "err", text: r.error });
    setStudents([...students, r.data!].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    setName("");
    setCpf("");
    setMsg(null);
  }

  async function saveEdit() {
    if (!editing) return;
    const r = await updateStudent(editing.id, editing.name, editing.cpf);
    if (!r.ok) return setMsg({ type: "err", text: r.error });
    setStudents(students.map((s) => (s.id === editing.id ? r.data! : s)));
    setEditing(null);
  }

  async function remove(s: Student) {
    if (!confirm(`Remover ${s.name} da lista?`)) return;
    const r = await deleteStudent(s.id);
    if (!r.ok) return setMsg({ type: "err", text: r.error });
    setStudents(students.filter((x) => x.id !== s.id));
  }

  async function onFile(file?: File) {
    if (!file) return;
    try {
      const rows = csvToStudents(parseCsv(await readTextSmart(file)));
      if (!rows.length) throw new Error("Nenhum aluno encontrado no arquivo.");
      setImportRows(rows);
      setReplace(false);
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Não foi possível ler o CSV" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmImport() {
    if (!importRows) return;
    const list = importRows.filter((r) => r.valid);
    setWorking(true);
    const r = await importStudents(courseId, list, replace);
    setWorking(false);
    if (!r.ok) return setMsg({ type: "err", text: r.error });
    setStudents(r.data!);
    setImportRows(null);
    setMsg({ type: "ok", text: `${list.length} aluno(s) importado(s).` });
  }

  const invalidCount = importRows?.filter((r) => r.issue).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => fileRef.current?.click()}>
          Importar CSV
        </Button>
        <Button type="button" variant="ghost" onClick={downloadModel}>
          Baixar modelo de CSV
        </Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <input
          placeholder="Buscar aluno…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={`${inputCls} ml-auto max-w-56`}
        />
      </div>
      <p className="text-xs text-slate-500">
        O CSV precisa de duas colunas: <b>nome</b> e <b>cpf</b> (separadas por ponto e vírgula ou vírgula). Arquivos salvos pelo Excel
        funcionam direto.
      </p>

      {msg && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${msg.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
        >
          {msg.text}
        </div>
      )}

      {importRows && (
        <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium text-slate-800">
              {importRows.length} linha(s) encontradas
              {invalidCount > 0 && <span className="text-amber-700 font-normal"> · {invalidCount} com aviso</span>}
            </div>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={!replace} onChange={() => setReplace(false)} /> Adicionar à lista
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={replace} onChange={() => setReplace(true)} /> Substituir lista atual
              </label>
            </div>
          </div>
          <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {importRows.map((r, i) => (
                  <tr key={i} className={r.valid ? "" : "opacity-50"}>
                    <td className="px-3 py-1.5">{r.name || <i className="text-slate-400">sem nome</i>}</td>
                    <td className="px-3 py-1.5 tabular-nums text-slate-600">{formatCpf(r.cpf)}</td>
                    <td className="px-3 py-1.5 text-xs text-amber-700">{r.issue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setImportRows(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmImport} disabled={working}>
              {working ? "Importando…" : `Importar ${importRows.filter((r) => r.valid).length} aluno(s)`}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={add} className="grid grid-cols-[1fr_170px_auto] gap-2">
        <input className={inputCls} placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={inputCls} placeholder="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} inputMode="numeric" />
        <Button type="submit" variant="secondary" disabled={working}>
          Adicionar
        </Button>
      </form>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Aluno ({students.length})</th>
              <th className="px-3 py-2 font-medium w-40">CPF</th>
              <th className="px-3 py-2 w-48" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-slate-400">
                  {students.length ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado. Importe um CSV ou adicione acima."}
                </td>
              </tr>
            )}
            {visible.map((s) =>
              editing?.id === s.id ? (
                <tr key={s.id} className="bg-brand-50/40">
                  <td className="px-2 py-1.5">
                    <input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input className={inputCls} value={editing.cpf} onChange={(e) => setEditing({ ...editing, cpf: e.target.value })} />
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    <Button type="button" onClick={saveEdit} className="!py-1">Salvar</Button>{" "}
                    <Button type="button" variant="ghost" onClick={() => setEditing(null)} className="!py-1">Cancelar</Button>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className={previewId === s.id ? "bg-brand-50/60" : "hover:bg-slate-50"}>
                  <td className="px-3 py-2">
                    <button type="button" className="text-left hover:text-brand-600" onClick={() => onPreview(s.id)} title="Ver na pré-visualização">
                      {s.name}
                    </button>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-600">
                    {s.cpf ? formatCpf(s.cpf) : <span className="text-amber-600">sem CPF</span>}
                    {s.cpf && !isValidCpf(s.cpf) && <span className="ml-1 text-amber-600" title="CPF inválido">⚠</span>}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-xs">
                    <button type="button" className="px-2 py-1 rounded hover:bg-slate-100 text-brand-600 disabled:opacity-40" disabled={busy} onClick={() => onDownload(s)}>
                      PDF
                    </button>
                    <button type="button" className="px-2 py-1 rounded hover:bg-slate-100" onClick={() => setEditing({ id: s.id, name: s.name, cpf: formatCpf(s.cpf) })}>
                      Editar
                    </button>
                    <button type="button" className="px-2 py-1 rounded hover:bg-red-50 text-red-600" onClick={() => remove(s)}>
                      Remover
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
