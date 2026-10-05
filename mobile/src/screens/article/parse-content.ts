/**
 * Разбор контента материала в нативные блоки.
 *
 * Почему не WebView и не dangerouslySetInnerHTML-аналог: `content` приходит
 * сырым HTML/Markdown из админки, то есть это недоверенный ввод. Отдать его в
 * WebView без санитайзера — значит пустить в приложение произвольный <script>
 * (а вместе с ним доступ к window.ReactNativeWebView и к тому, что мы туда
 * прокидываем). Плюс WebView не наследует Dynamic Type, тёмную тему и нативную
 * инерцию скролла, и параллакс обложки с ним уже не собрать.
 *
 * Поэтому здесь белый список: h1–h6, p, ul/ol/li, blockquote, pre, hr, img,
 * strong/b, em/i, code, a. Всё остальное разметку теряет и проходит через
 * stripHtml() — от неизвестного тега остаётся только его текст. Ссылки
 * дополнительно фильтруются по схеме (см. safeHref).
 */
import { normalizeImageUrl } from "@/api/client";
import { stripHtml } from "@/lib/format";

import { safeHref } from "./links";

export interface InlineMark {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string;
}

export interface InlineNode extends InlineMark {
  text: string;
}

export type ArticleBlock =
  | { kind: "heading"; level: 2 | 3; nodes: InlineNode[] }
  | { kind: "paragraph"; nodes: InlineNode[] }
  | { kind: "code"; text: string }
  | { kind: "list"; ordered: boolean; items: InlineNode[][] }
  | { kind: "quote"; nodes: InlineNode[] }
  | { kind: "image"; uri: string; alt: string | null }
  | { kind: "rule" };

/** Блочные теги — верный признак, что перед нами HTML, а не Markdown. */
const HTML_BLOCK_TEST = /<(p|h[1-6]|ul|ol|li|blockquote|div|section|article|figure|table|pre)\b/i;

const BLOCK_PATTERN = "<(h[1-6]|p|ul|ol|blockquote|pre)\\b[^>]*>([\\s\\S]*?)<\\/\\1\\s*>";
const VOID_PATTERN = "<(img|hr)\\b([^>]*?)\\/?>";
const INLINE_PATTERN = "<(strong|b|em|i|code|a|span|mark|u|small)\\b([^>]*)>([\\s\\S]*?)<\\/\\1\\s*>";

/** Разбирает контент материала в список блоков для нативного рендера. */
export function parseArticleContent(raw: string | null | undefined): ArticleBlock[] {
  if (!raw) return [];

  const cleaned = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\r\n?/g, "\n");

  const blocks = HTML_BLOCK_TEST.test(cleaned)
    ? parseHtmlBlocks(cleaned)
    : parseMarkdownBlocks(cleaned);

  return blocks.filter(isMeaningful);
}

/** Примерное время чтения: 170 слов в минуту — средний темп для русского текста. */
export function articleReadingMinutes(blocks: ArticleBlock[]): number {
  const words = articlePlainText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 170));
}

export function articlePlainText(blocks: ArticleBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case "heading":
      case "paragraph":
      case "quote":
        parts.push(nodesToText(block.nodes));
        break;
      case "list":
        for (const item of block.items) parts.push(nodesToText(item));
        break;
      case "code":
        parts.push(block.text);
        break;
      default:
        break;
    }
  }
  return parts.join(" ").trim();
}

/* ── HTML ─────────────────────────────────────────────────────────────────── */

function parseHtmlBlocks(html: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  const re = new RegExp(BLOCK_PATTERN, "gi");
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) !== null) {
    pushLoose(blocks, html.slice(last, match.index));
    pushHtmlBlock(blocks, match[1].toLowerCase(), match[2] ?? "");
    last = match.index + match[0].length;
  }
  pushLoose(blocks, html.slice(last));

  return blocks;
}

function pushHtmlBlock(blocks: ArticleBlock[], tag: string, inner: string): void {
  if (tag === "ul" || tag === "ol") {
    const items = parseListItems(inner);
    if (items.length > 0) blocks.push({ kind: "list", ordered: tag === "ol", items });
    return;
  }

  if (tag === "pre") {
    const text = stripHtml(inner);
    if (text) blocks.push({ kind: "code", text });
    return;
  }

  if (tag === "blockquote") {
    const nodes = trimNodes(parseInlineHtml(dropWrappers(inner)));
    if (nodes.length > 0) blocks.push({ kind: "quote", nodes });
    return;
  }

  if (tag.startsWith("h")) {
    const nodes = trimNodes(parseInlineHtml(inner));
    if (nodes.length === 0) return;
    const level: 2 | 3 = Number(tag.slice(1)) <= 2 ? 2 : 3;
    blocks.push({ kind: "heading", level, nodes });
    return;
  }

  // <p>: картинка внутри абзаца — обычный случай для WYSIWYG-редакторов
  if (/<img\b/i.test(inner)) {
    pushLoose(blocks, inner);
    return;
  }

  const nodes = trimNodes(parseInlineHtml(inner));
  if (nodes.length > 0) blocks.push({ kind: "paragraph", nodes });
}

/** Куски между известными блоками: картинки, линейки и «голый» текст. */
function pushLoose(blocks: ArticleBlock[], chunk: string): void {
  if (!chunk.trim()) return;

  const re = new RegExp(VOID_PATTERN, "gi");
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(chunk)) !== null) {
    pushLooseText(blocks, chunk.slice(last, match.index));
    const tag = match[1].toLowerCase();
    if (tag === "hr") {
      blocks.push({ kind: "rule" });
    } else {
      const attrs = match[2] ?? "";
      const uri = normalizeImageUrl(attrValue(attrs, "src"));
      if (uri) blocks.push({ kind: "image", uri, alt: attrValue(attrs, "alt") });
    }
    last = match.index + match[0].length;
  }
  pushLooseText(blocks, chunk.slice(last));
}

function pushLooseText(blocks: ArticleBlock[], text: string): void {
  // неизвестные теги теряют разметку, но текст из них сохраняем
  const plain = stripHtml(text);
  if (!plain) return;
  blocks.push(...parseMarkdownBlocks(plain));
}

function parseListItems(inner: string): InlineNode[][] {
  const items: InlineNode[][] = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(inner)) !== null) {
    const nodes = trimNodes(parseInlineHtml(dropWrappers(match[1] ?? "")));
    if (nodes.length > 0) items.push(nodes);
  }

  if (items.length === 0) {
    const text = stripHtml(inner);
    if (text) items.push([{ text }]);
  }
  return items;
}

/** Убирает вложенные блочные обёртки внутри li/blockquote — они нам не нужны. */
function dropWrappers(html: string): string {
  return html.replace(/<\/?(p|div|span|ul|ol|li)\b[^>]*>/gi, " ");
}

function parseInlineHtml(html: string, mark: InlineMark = {}): InlineNode[] {
  const source = html.replace(/<br\s*\/?>/gi, "\n");
  const out: InlineNode[] = [];
  const re = new RegExp(INLINE_PATTERN, "gi");
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(source)) !== null) {
    pushText(out, source.slice(last, match.index), mark);

    const tag = match[1].toLowerCase();
    const attrs = match[2] ?? "";
    const inner = match[3] ?? "";
    const next: InlineMark = { ...mark };

    if (tag === "strong" || tag === "b") next.bold = true;
    else if (tag === "em" || tag === "i") next.italic = true;
    else if (tag === "code") next.code = true;
    else if (tag === "a") {
      const href = safeHref(attrValue(attrs, "href"));
      if (href) next.href = href;
    }

    out.push(...parseInlineHtml(inner, next));
    last = match.index + match[0].length;
  }

  pushText(out, source.slice(last), mark);
  return mergeNodes(out);
}

/* ── Markdown ─────────────────────────────────────────────────────────────── */

const MD_HEADING = /^(#{1,6})\s+(.+)$/;
const MD_RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const MD_BULLET = /^\s*[-*+]\s+(.+)$/;
const MD_ORDERED = /^\s*\d+[.)]\s+(.+)$/;
const MD_QUOTE = /^\s*>\s?(.*)$/;
const MD_IMAGE = /^\s*!\[([^\]]*)\]\(\s*([^)\s]+)\s*\)\s*$/;

function parseMarkdownBlocks(source: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  const lines = source.split("\n");
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    const nodes = trimNodes(splitMarkdownInline(paragraph.join(" ").replace(/\s+/g, " "), {}));
    paragraph = [];
    if (nodes.length > 0) blocks.push({ kind: "paragraph", nodes });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!line.trim()) {
      flush();
      continue;
    }

    const heading = MD_HEADING.exec(line);
    if (heading) {
      flush();
      const nodes = trimNodes(splitMarkdownInline(heading[2], {}));
      if (nodes.length > 0) {
        blocks.push({ kind: "heading", level: heading[1].length <= 2 ? 2 : 3, nodes });
      }
      continue;
    }

    if (MD_RULE.test(line)) {
      flush();
      blocks.push({ kind: "rule" });
      continue;
    }

    const image = MD_IMAGE.exec(line);
    if (image) {
      flush();
      const uri = normalizeImageUrl(image[2]);
      if (uri) blocks.push({ kind: "image", uri, alt: image[1] || null });
      continue;
    }

    const bullet = MD_BULLET.exec(line);
    const ordered = MD_ORDERED.exec(line);
    if (bullet || ordered) {
      flush();
      const isOrdered = !bullet;
      const items: InlineNode[][] = [];
      let j = i;
      for (; j < lines.length; j += 1) {
        const current = isOrdered ? MD_ORDERED.exec(lines[j]) : MD_BULLET.exec(lines[j]);
        if (!current) break;
        const nodes = trimNodes(splitMarkdownInline(current[1], {}));
        if (nodes.length > 0) items.push(nodes);
      }
      i = j - 1;
      if (items.length > 0) blocks.push({ kind: "list", ordered: isOrdered, items });
      continue;
    }

    const quote = MD_QUOTE.exec(line);
    if (quote) {
      flush();
      const parts: string[] = [];
      let j = i;
      for (; j < lines.length; j += 1) {
        const current = MD_QUOTE.exec(lines[j]);
        if (!current) break;
        parts.push(current[1]);
      }
      i = j - 1;
      const nodes = trimNodes(splitMarkdownInline(parts.join(" ").trim(), {}));
      if (nodes.length > 0) blocks.push({ kind: "quote", nodes });
      continue;
    }

    paragraph.push(line.trim());
  }

  flush();
  return blocks;
}

/**
 * Inline-Markdown поверх текста: **жирный**, *курсив*, `код`, [текст](ссылка).
 * Подчёркивания (__ и _) намеренно НЕ поддерживаем — они встречаются внутри
 * слов и слагов и ломали бы обычный текст.
 */
const MD_INLINE_PATTERN =
  "\\[([^\\]\\n]+)\\]\\(\\s*([^)\\s]+)\\s*\\)|\\*\\*(?=\\S)([\\s\\S]*?\\S)\\*\\*|\\*(?=\\S)([^*\\n]*?\\S)\\*|`([^`\\n]+)`";

function splitMarkdownInline(text: string, mark: InlineMark): InlineNode[] {
  if (!text) return [];
  const out: InlineNode[] = [];
  const re = new RegExp(MD_INLINE_PATTERN, "g");
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const before = text.slice(last, match.index);
    if (before) out.push({ ...mark, text: before });

    const [, linkText, linkHref, bold, italic, code] = match;

    if (linkText !== undefined) {
      const href = safeHref(linkHref);
      // ссылка с недопустимой схемой остаётся просто текстом
      out.push(...splitMarkdownInline(linkText, href ? { ...mark, href } : mark));
    } else if (bold !== undefined) {
      out.push(...splitMarkdownInline(bold, { ...mark, bold: true }));
    } else if (italic !== undefined) {
      out.push(...splitMarkdownInline(italic, { ...mark, italic: true }));
    } else if (code !== undefined) {
      out.push({ ...mark, code: true, text: code });
    }

    last = match.index + match[0].length;
  }

  const tail = text.slice(last);
  if (tail) out.push({ ...mark, text: tail });

  return mergeNodes(out);
}

/* ── Утилиты ──────────────────────────────────────────────────────────────── */

function pushText(out: InlineNode[], raw: string, mark: InlineMark): void {
  const text = cleanText(raw);
  if (!text) return;
  if (mark.code) {
    out.push({ ...mark, text });
    return;
  }
  out.push(...splitMarkdownInline(text, mark));
}

/**
 * stripHtml() тримит строку, а между inline-тегами пробел значащий
 * («текст <b>жирный</b> дальше») — поэтому краевые пробелы возвращаем на место.
 */
function cleanText(raw: string): string {
  if (!raw) return "";
  const lead = /^\s/.test(raw) ? " " : "";
  const tail = /\s$/.test(raw) ? " " : "";
  const core = stripHtml(raw).replace(/[^\S\n]+/g, " ");
  if (!core) return lead || tail ? " " : "";
  return `${lead}${core}${tail}`;
}

function attrValue(attrs: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = re.exec(attrs);
  if (!match) return null;
  const value = match[2] ?? match[3] ?? match[4] ?? "";
  return value.trim() || null;
}

function sameMark(a: InlineNode, b: InlineNode): boolean {
  return !!a.bold === !!b.bold && !!a.italic === !!b.italic && !!a.code === !!b.code && a.href === b.href;
}

/** Склеиваем соседние куски с одинаковым оформлением — меньше <Text> в дереве. */
function mergeNodes(nodes: InlineNode[]): InlineNode[] {
  const out: InlineNode[] = [];
  for (const node of nodes) {
    if (!node.text) continue;
    const prev = out[out.length - 1];
    if (prev && sameMark(prev, node)) {
      out[out.length - 1] = { ...prev, text: prev.text + node.text };
    } else {
      out.push(node);
    }
  }
  return out;
}

function trimNodes(nodes: InlineNode[]): InlineNode[] {
  const out = nodes.slice();
  if (out.length > 0) out[0] = { ...out[0], text: out[0].text.replace(/^\s+/, "") };
  if (out.length > 0) {
    const lastIndex = out.length - 1;
    out[lastIndex] = { ...out[lastIndex], text: out[lastIndex].text.replace(/\s+$/, "") };
  }
  return out.filter((node) => node.text.length > 0);
}

function nodesToText(nodes: InlineNode[]): string {
  return nodes.map((node) => node.text).join("");
}

function isMeaningful(block: ArticleBlock): boolean {
  switch (block.kind) {
    case "heading":
    case "paragraph":
    case "quote":
      return block.nodes.length > 0;
    case "list":
      return block.items.length > 0;
    case "code":
      return block.text.trim().length > 0;
    default:
      return true;
  }
}
