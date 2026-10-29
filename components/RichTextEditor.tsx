"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect } from "react";

function Btn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-8 min-w-8 px-2 rounded-md text-sm grid place-items-center transition disabled:opacity-30 ${
        active ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <div className="w-px h-6 bg-slate-300 mx-1" />;

const icon = (d: string) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  left: icon("M4 6h16M4 12h10M4 18h14"),
  center: icon("M4 6h16M7 12h10M5 18h14"),
  right: icon("M4 6h16M10 12h10M6 18h14"),
  justify: icon("M4 6h16M4 12h16M4 18h16"),
  bullet: icon("M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"),
  ordered: icon("M10 6h10M10 12h10M10 18h10M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"),
  quote: icon("M6 17h3l2-4V7H5v6h3zM14 17h3l2-4V7h-6v6h3z"),
  hr: icon("M3 12h18"),
  undo: icon("M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3"),
  redo: icon("M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3"),
  clear: icon("M4 7V4h16v3M9 20h6M12 4v16M3 3l18 18"),
};

function Toolbar({ editor }: { editor: Editor }) {
  const c = () => editor.chain().focus();
  const block = editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "p";
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5 sticky top-0 z-10 rounded-t-lg">
      <select
        value={block}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") c().setParagraph().run();
          else c().setHeading({ level: v === "h2" ? 2 : 3 }).run();
        }}
        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm mr-1"
        title="Estilo do parágrafo"
      >
        <option value="p">Parágrafo</option>
        <option value="h2">Título</option>
        <option value="h3">Subtítulo</option>
      </select>
      <Btn title="Negrito (Ctrl+B)" active={editor.isActive("bold")} onClick={() => c().toggleBold().run()}>
        <b>B</b>
      </Btn>
      <Btn title="Itálico (Ctrl+I)" active={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}>
        <i className="font-serif">I</i>
      </Btn>
      <Btn title="Sublinhado (Ctrl+U)" active={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}>
        <u>U</u>
      </Btn>
      <Btn title="Tachado" active={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}>
        <s>S</s>
      </Btn>
      <Sep />
      <Btn title="Lista com marcadores" active={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}>
        {ICONS.bullet}
      </Btn>
      <Btn title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}>
        {ICONS.ordered}
      </Btn>
      <Btn title="Citação / destaque" active={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}>
        {ICONS.quote}
      </Btn>
      <Btn title="Linha divisória" onClick={() => c().setHorizontalRule().run()}>
        {ICONS.hr}
      </Btn>
      <Sep />
      {(["left", "center", "right", "justify"] as const).map((a) => (
        <Btn
          key={a}
          title={{ left: "Alinhar à esquerda", center: "Centralizar", right: "Alinhar à direita", justify: "Justificar" }[a]}
          active={editor.isActive({ textAlign: a })}
          onClick={() => c().setTextAlign(a).run()}
        >
          {ICONS[a]}
        </Btn>
      ))}
      <Sep />
      <Btn title="Limpar formatação" onClick={() => c().unsetAllMarks().clearNodes().run()}>
        {ICONS.clear}
      </Btn>
      <Btn title="Desfazer (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => c().undo().run()}>
        {ICONS.undo}
      </Btn>
      <Btn title="Refazer (Ctrl+Shift+Z)" disabled={!editor.can().redo()} onClick={() => c().redo().run()}>
        {ICONS.redo}
      </Btn>
    </div>
  );
}

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, code: false }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "rte-content px-4 py-3 text-[15px] text-slate-800" },
    },
    onUpdate({ editor }) {
      onChange(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  // Atualiza o conteúdo se ele mudar por fora (ex.: descartar alterações)
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (current !== (value || "")) editor.commands.setContent(value || "", false);
  }, [value, editor]);

  return (
    <div className="rounded-lg border border-slate-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
      {editor ? <Toolbar editor={editor} /> : <div className="h-11 border-b border-slate-200 bg-slate-50 rounded-t-lg" />}
      <EditorContent editor={editor} />
    </div>
  );
}
