// Limpa o HTML da ementa no navegador (permite só formatação básica).

const ALLOWED_TAGS = new Set([
  "P", "BR", "STRONG", "B", "EM", "I", "U", "S", "UL", "OL", "LI",
  "H2", "H3", "H4", "BLOCKQUOTE", "SPAN", "HR", "MARK",
]);

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return "";

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META"].includes(child.tagName)) {
          child.remove();
        } else {
          // mantém o texto, descarta a tag
          walk(child);
          child.replaceWith(...Array.from(child.childNodes));
        }
        continue;
      }
      const align = (child as HTMLElement).style?.textAlign;
      for (const attr of Array.from(child.attributes)) child.removeAttribute(attr.name);
      if (align && ["left", "center", "right", "justify"].includes(align)) {
        (child as HTMLElement).style.textAlign = align;
      }
      walk(child);
    }
  };
  walk(root);
  return root.innerHTML;
}
