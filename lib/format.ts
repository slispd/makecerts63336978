// Funções puras usadas no servidor e no navegador.

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2024-10-25" -> "25 de outubro de 2024" */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${Number(d)} de ${MESES[Number(mo) - 1]} de ${y}`;
}

export function onlyDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

/** Normaliza CPF: só dígitos, recompõe zeros à esquerda que o Excel remove. */
export function normalizeCpf(v: string): string {
  const d = onlyDigits(v);
  if (d.length >= 8 && d.length < 11) return d.padStart(11, "0");
  return d.slice(0, 11);
}

export function formatCpf(v: string): string {
  const d = onlyDigits(v);
  if (d.length !== 11) return v || "";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function isValidCpf(v: string): boolean {
  const d = onlyDigits(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/** Nome em formato de título, respeitando preposições ("da", "de", "dos"...). */
export function titleCaseName(v: string): string {
  const small = new Set(["da", "de", "do", "das", "dos", "e", "di", "du"]);
  return v
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Parser de CSV tolerante: detecta ";" , "," ou tab, aceita aspas. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const counts = { ";": 0, ",": 0, "\t": 0 } as Record<string, number>;
  for (const ch of firstLine) if (ch in counts) counts[ch]++;
  const [best, bestCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const delim = bestCount > 0 ? best : ";";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows.map((r) => r.map((f) => f.trim()));
}

export interface ParsedStudent {
  name: string;
  cpf: string;
  valid: boolean;
  issue?: string;
}

/** Converte linhas do CSV em alunos. Procura colunas "nome" e "cpf" no cabeçalho. */
export function csvToStudents(rows: string[][]): ParsedStudent[] {
  if (!rows.length) return [];
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const header = rows[0].map(norm);
  let nameIdx = header.findIndex((h) => h.includes("nome") || h === "name" || h.includes("aluno"));
  let cpfIdx = header.findIndex((h) => h.includes("cpf") || h.includes("documento"));
  let body = rows;
  if (nameIdx >= 0 || cpfIdx >= 0) {
    body = rows.slice(1);
    if (nameIdx < 0) nameIdx = cpfIdx === 0 ? 1 : 0;
    if (cpfIdx < 0) cpfIdx = nameIdx === 0 ? 1 : 0;
  } else {
    // sem cabeçalho: coluna com mais dígitos é o CPF
    const sample = rows[0];
    const digitCol = sample.findIndex((f) => onlyDigits(f).length >= 9);
    cpfIdx = digitCol >= 0 ? digitCol : 1;
    nameIdx = cpfIdx === 0 ? 1 : 0;
  }
  return body
    .map((r) => {
      const name = titleCaseName(r[nameIdx] ?? "");
      const cpf = normalizeCpf(r[cpfIdx] ?? "");
      let issue: string | undefined;
      if (!name) issue = "Sem nome";
      else if (!cpf) issue = "Sem CPF";
      else if (!isValidCpf(cpf)) issue = "CPF inválido";
      return { name, cpf, valid: !!name, issue };
    })
    .filter((s) => s.name || s.cpf);
}

export function safeFileName(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}
