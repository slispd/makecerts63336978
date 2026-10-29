"use client";

import { useEffect, useState } from "react";
import type { Course, Student, Template } from "@/lib/types";
import { CertificateBack, CertificateFront, DEFAULT_TEMPLATE } from "./Certificate";

export function PrintView({
  course,
  students,
  template,
  issuerText,
}: {
  course: Course;
  students: Student[];
  template: Template | null;
  issuerText?: string;
}) {
  const [ready, setReady] = useState(false);
  const t = template ?? DEFAULT_TEMPLATE;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images).map((img) => (img.complete ? null : img.decode().catch(() => null)))
      );
      if (cancelled) return;
      setReady(true);
      setTimeout(() => window.print(), 300);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-slate-200 min-h-screen print:bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center gap-4 bg-brand-900 px-6 py-3 text-white text-sm">
        <div className="mr-auto">
          <b>{course.name}</b> · {students.length} certificado(s) · {students.length * 2} páginas
        </div>
        <span className="text-white/70 hidden md:inline">
          Na janela de impressão escolha <b>Salvar como PDF</b>, papel A4, orientação paisagem e margens “Nenhuma”.
        </span>
        <button onClick={() => window.print()} disabled={!ready} className="rounded-md bg-white px-3 py-1.5 font-medium text-brand-900 disabled:opacity-50">
          {ready ? "Imprimir / salvar PDF" : "Preparando…"}
        </button>
      </div>
      <div className="flex flex-col items-center gap-6 py-6 print:block print:p-0">
        {students.map((s) => {
          const d = {
            courseName: course.name,
            completionDate: course.completionDate,
            workload: course.workload,
            syllabus: course.syllabus,
            instructorName: course.instructorName,
            instructorSpecialization: course.instructorSpecialization,
            instructorRegistration: course.instructorRegistration,
            instructorCpf: course.instructorCpf,
            instructorSignature: course.instructorSignature,
            extraEnabled: course.extraEnabled,
            extraName: course.extraName,
            extraRole: course.extraRole,
            extraRegistration: course.extraRegistration,
            extraCpf: course.extraCpf,
            extraSignature: course.extraSignature,
            studentName: s.name,
            studentCpf: s.cpf,
            issuerText,
          };
          return [
            <div key={s.id + "f"} className="print-sheet shadow-lg print:shadow-none">
              <CertificateFront t={t} d={d} placeholders={false} />
            </div>,
            <div key={s.id + "b"} className="print-sheet shadow-lg print:shadow-none">
              <CertificateBack t={t} d={d} placeholders={false} />
            </div>,
          ];
        })}
      </div>
    </div>
  );
}
