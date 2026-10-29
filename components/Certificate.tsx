"use client";

import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatCpf, formatDateLong } from "@/lib/format";
import { sanitizeHtml } from "@/lib/sanitize";

/** A4 paisagem em px CSS (96 dpi): 297 × 210 mm */
export const PAGE_W = (297 * 96) / 25.4; // 1122.52
export const PAGE_H = (210 * 96) / 25.4; // 793.70

export const ISSUER_TEXT = "A ABIX TECNOLOGIA LTDA certifica que,";

export interface CertTemplate {
  logo: string | null;
  frontBg: string | null;
  backBg: string | null;
  primaryColor: string;
  textColor: string;
  titleFont: "serif" | "sans";
  nameFont: "script" | "serif" | "sans";
  showBorder: boolean;
}

export interface CertData {
  courseName: string;
  completionDate: string;
  workload: string;
  syllabus: string;
  instructorName: string;
  instructorSpecialization: string;
  instructorRegistration: string;
  instructorSignature: string | null;
  extraEnabled: boolean;
  extraName: string;
  extraRole: string;
  extraSignature: string | null;
  studentName: string;
  studentCpf: string;
}

export const DEFAULT_TEMPLATE: CertTemplate = {
  logo: null,
  frontBg: null,
  backBg: null,
  primaryColor: "#1d3557",
  textColor: "#1f2937",
  titleFont: "serif",
  nameFont: "script",
  showBorder: true,
};

const FONTS = {
  serif: "var(--font-serif), 'Playfair Display', Georgia, 'Times New Roman', serif",
  sans: "var(--font-sans), Inter, 'Helvetica Neue', Arial, sans-serif",
  script: "var(--font-script), 'Great Vibes', 'Brush Script MT', cursive",
};

function alpha(hex: string, a: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const pageStyle = (t: CertTemplate): CSSProperties => ({
  position: "relative",
  width: PAGE_W,
  height: PAGE_H,
  overflow: "hidden",
  background: "#fffdf9",
  color: t.textColor,
  fontFamily: FONTS.sans,
  boxSizing: "border-box",
  flexShrink: 0,
});

function Background({ src }: { src: string | null }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

function Frame({ t }: { t: CertTemplate }) {
  if (!t.showBorder) return null;
  const c = t.primaryColor;
  const corner = (pos: CSSProperties) => (
    <div
      style={{
        position: "absolute",
        width: 14,
        height: 14,
        background: c,
        transform: "rotate(45deg)",
        ...pos,
      }}
    />
  );
  return (
    <>
      <div style={{ position: "absolute", inset: 22, border: `3px solid ${c}` }} />
      <div style={{ position: "absolute", inset: 32, border: `1px solid ${alpha(c, 0.55)}` }} />
      {corner({ left: 20, top: 20 })}
      {corner({ right: 20, top: 20 })}
      {corner({ left: 20, bottom: 20 })}
      {corner({ right: 20, bottom: 20 })}
    </>
  );
}

function Placeholder({ value, label }: { value: string; label: string }) {
  if (value) return <>{value}</>;
  return <span style={{ opacity: 0.35 }}>{label}</span>;
}

export function CertificateFront({
  t,
  d,
  placeholders = true,
}: {
  t: CertTemplate;
  d: CertData;
  placeholders?: boolean;
}) {
  const P = ({ v, l }: { v: string; l: string }) => (placeholders ? <Placeholder value={v} label={l} /> : <>{v}</>);
  const nameSize = t.nameFont === "script" ? 64 : 44;
  const nameRef = useRef<HTMLDivElement>(null);
  // Reduz a fonte do nome até caber em uma linha
  useLayoutEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    let size = nameSize;
    el.style.whiteSpace = "nowrap";
    el.style.fontSize = `${size}px`;
    while (el.scrollWidth > el.clientWidth && size > nameSize * 0.55) {
      size -= 2;
      el.style.fontSize = `${size}px`;
    }
    if (el.scrollWidth > el.clientWidth) el.style.whiteSpace = "normal";
  }, [d.studentName, nameSize, t.nameFont]);
  return (
    <div style={pageStyle(t)} className="cert-page">
      <Background src={t.frontBg} />
      <Frame t={t} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "64px 120px 70px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "center",
        }}
      >
        <div style={{ height: 92, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {t.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.logo} alt="Logo" style={{ maxHeight: 92, maxWidth: 300, objectFit: "contain" }} />
          ) : placeholders ? (
            <div
              style={{
                border: `1px dashed ${alpha(t.textColor, 0.35)}`,
                color: alpha(t.textColor, 0.45),
                fontSize: 13,
                padding: "26px 48px",
                letterSpacing: "0.1em",
              }}
            >
              LOGO
            </div>
          ) : null}
        </div>

        <div>
          <div
            style={{
              fontFamily: FONTS[t.titleFont],
              fontSize: 66,
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: t.primaryColor,
              lineHeight: 1,
              marginRight: "-0.2em",
            }}
          >
            CERTIFICADO
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: alpha(t.textColor, 0.75),
            }}
          >
            <P v={d.courseName} l="Nome do curso" />
          </div>
        </div>

        <div style={{ width: "100%" }}>
          <div style={{ fontSize: 20, color: alpha(t.textColor, 0.85) }}>{ISSUER_TEXT}</div>
          <div
            ref={nameRef}
            style={{
              fontFamily: FONTS[t.nameFont],
              fontSize: nameSize,
              fontWeight: t.nameFont === "script" ? 400 : 700,
              color: t.primaryColor,
              lineHeight: 1.25,
              margin: "14px auto 0",
              padding: "0 20px 10px",
              borderBottom: `1px solid ${alpha(t.textColor, 0.35)}`,
              width: "86%",
            }}
          >
            <P v={d.studentName} l="Nome do Aluno" />
          </div>
        </div>

        <div style={{ fontSize: 20, lineHeight: 1.6, maxWidth: 800 }}>
          concluiu o curso <strong>{d.courseName || (placeholders ? "Nome do curso" : "")}</strong> em{" "}
          <strong>
            <P v={formatDateLong(d.completionDate)} l="data de conclusão" />
          </strong>
          .
        </div>
      </div>
    </div>
  );
}

function SignatureBlock({
  t,
  image,
  lines,
  label,
}: {
  t: CertTemplate;
  image?: string | null;
  lines: { text: string; strong?: boolean; placeholder?: string }[];
  label: string;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 58, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" style={{ maxHeight: 58, maxWidth: "80%", objectFit: "contain" }} />
        ) : null}
      </div>
      <div style={{ borderTop: `1px solid ${alpha(t.textColor, 0.7)}`, margin: "4px 18px 0", paddingTop: 7 }}>
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              fontSize: l.strong ? 14 : 12,
              fontWeight: l.strong ? 700 : 400,
              lineHeight: 1.35,
              color: l.strong ? t.textColor : alpha(t.textColor, 0.8),
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {l.text || (l.placeholder ? <span style={{ opacity: 0.35 }}>{l.placeholder}</span> : " ")}
          </div>
        ))}
        <div
          style={{
            marginTop: 3,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: t.primaryColor,
            fontWeight: 600,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

export function CertificateBack({
  t,
  d,
  placeholders = true,
  onFit,
}: {
  t: CertTemplate;
  d: CertData;
  placeholders?: boolean;
  onFit?: (info: { fontSize: number; columns: number; overflow: boolean }) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState("");

  useEffect(() => {
    setHtml(sanitizeHtml(d.syllabus));
  }, [d.syllabus]);

  // Ajusta o tamanho da fonte (e usa 2 colunas se preciso) para a ementa caber na página.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    const fits = () => inner.scrollHeight <= box.clientHeight + 1 && inner.scrollWidth <= box.clientWidth + 1;
    let result = { fontSize: 15, columns: 1, overflow: false };
    outer: for (const columns of [1, 2]) {
      inner.style.columnCount = String(columns);
      inner.style.height = columns > 1 ? `${box.clientHeight}px` : "auto";
      for (let size = columns === 1 ? 15 : 13; size >= 7; size -= 0.5) {
        inner.style.fontSize = `${size}px`;
        if (columns === 1 ? fits() : inner.scrollWidth <= box.clientWidth + 1) {
          result = { fontSize: size, columns, overflow: false };
          break outer;
        }
        if (columns === 1 && size <= 11) break;
        result = { fontSize: size, columns, overflow: true };
      }
    }
    inner.style.columnCount = String(result.columns);
    inner.style.height = result.columns > 1 ? `${box.clientHeight}px` : "auto";
    inner.style.fontSize = `${result.fontSize}px`;
    onFit?.(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, d.extraEnabled, d.workload]);

  const cpf = d.studentCpf ? formatCpf(d.studentCpf) : "";

  return (
    <div style={pageStyle(t)} className="cert-page">
      <Background src={t.backBg} />
      <Frame t={t} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "58px 76px 52px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            borderBottom: `2px solid ${t.primaryColor}`,
            paddingBottom: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: FONTS[t.titleFont],
                fontSize: 26,
                fontWeight: 700,
                color: t.primaryColor,
                lineHeight: 1.2,
              }}
            >
              EMENTA — {d.courseName || (placeholders ? <span style={{ opacity: 0.35 }}>Nome do curso</span> : "")}
            </div>
          </div>
          <div
            style={{
              flexShrink: 0,
              fontSize: 13,
              padding: "5px 12px",
              border: `1px solid ${alpha(t.primaryColor, 0.5)}`,
              borderRadius: 4,
              color: t.textColor,
              whiteSpace: "nowrap",
            }}
          >
            Carga horária: <strong>{d.workload || (placeholders ? <span style={{ opacity: 0.35 }}>—</span> : "")}</strong>
          </div>
        </div>

        <div ref={boxRef} style={{ flex: 1, minHeight: 0, overflow: "hidden", margin: "16px 0 12px" }}>
          <div
            ref={innerRef}
            className="cert-syllabus"
            style={{ lineHeight: 1.5, columnGap: 36, columnFill: "auto" }}
            dangerouslySetInnerHTML={{
              __html:
                html ||
                (placeholders
                  ? `<p style="opacity:.35">O conteúdo programático do curso aparecerá aqui.</p>`
                  : ""),
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>
          <SignatureBlock
            t={t}
            image={d.instructorSignature}
            label="Instrutor(a)"
            lines={[
              { text: d.instructorName, strong: true, placeholder: placeholders ? "Nome do instrutor" : undefined },
              { text: d.instructorSpecialization, placeholder: placeholders ? "Especialização" : undefined },
              { text: d.instructorRegistration, placeholder: placeholders ? "Registro / carteirinha" : undefined },
            ]}
          />
          <SignatureBlock
            t={t}
            label="Discente"
            lines={[
              { text: d.studentName, strong: true, placeholder: placeholders ? "Nome do aluno" : undefined },
              { text: cpf ? `CPF: ${cpf}` : "", placeholder: placeholders ? "CPF" : undefined },
              { text: "" },
            ]}
          />
          {d.extraEnabled && (
            <SignatureBlock
              t={t}
              image={d.extraSignature}
              label={d.extraRole || (placeholders ? "Cargo / função" : "Aprovação")}
              lines={[
                { text: d.extraName, strong: true, placeholder: placeholders ? "Nome" : undefined },
                { text: "" },
                { text: "" },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Página escalada para caber na largura do contêiner (pré-visualização). */
export function ScaledPage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / PAGE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ width: "100%", height: PAGE_H * scale, position: "relative" }}>
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          boxShadow: "0 10px 40px rgba(15,23,42,.18)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
