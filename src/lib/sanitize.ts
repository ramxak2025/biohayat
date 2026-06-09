// Консервативный санитайзер HTML без внешних зависимостей.
// Назначение: безопасный вывод контента (статьи, описания) через dangerouslySetInnerHTML.
//
// Принцип: allowlist. Разрешены только перечисленные теги и атрибуты,
// всё остальное вырезается. Содержимое опасных контейнеров (script, style,
// iframe и т.п.) удаляется целиком. Ссылки/изображения — только http(s)
// или относительные пути; javascript:/data:/vbscript: отбрасываются.

/** Теги, разрешённые без атрибутов. */
const ALLOWED_TAGS = new Set([
  "p", "br", "b", "strong", "i", "em", "u", "s",
  "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote",
  "img", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "th", "td",
]);

/** Разрешённые атрибуты по тегам (остальные вырезаются). */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href"]),
  img: new Set(["src", "alt"]),
};

/** Void-теги (не требуют закрытия). */
const VOID_TAGS = new Set(["br", "img"]);

/** Опасные контейнеры: вырезаются вместе со всем содержимым. */
const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "noscript", "object", "embed",
  "svg", "math", "template", "textarea", "title", "form",
]);

/** Проверка URL: http(s) либо относительный путь (/uploads/..., #якорь, ./...). */
function isSafeUrl(raw: string): boolean {
  // убираем управляющие символы и пробелы, которыми маскируют javascript:
  const url = raw.replace(/[\u0000-\u0020]/g, "").toLowerCase();
  if (!url) return false;
  if (/^https?:\/\//.test(url)) return true;
  if (url.startsWith("//")) return false; // protocol-relative — запрещаем
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("./")) return true;
  // любые другие схемы (javascript:, data:, vbscript: и пр.) — запрещены
  if (url.includes(":")) return false;
  // относительный путь без схемы (например, uploads/img.webp)
  return true;
}

/** Экранирование значения атрибута при повторной сборке. */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Разбор атрибутов из «сырой» строки внутри тега (учитывает кавычки). */
function parseAttrs(raw: string): Array<{ name: string; value: string }> {
  const attrs: Array<{ name: string; value: string }> = [];
  const re = /([a-zA-Z_][a-zA-Z0-9_:.-]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|[^\s"'>]+))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const name = m[1].toLowerCase();
    let value = "";
    if (m[2] !== undefined) {
      value = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[2];
    }
    attrs.push({ name, value });
  }
  return attrs;
}

/** Собирает безопасный открывающий тег из allowlist-атрибутов. */
function buildTag(tag: string, rawAttrs: string): string | null {
  const allowed = ALLOWED_ATTRS[tag];
  let out = `<${tag}`;
  if (allowed) {
    for (const { name, value } of parseAttrs(rawAttrs)) {
      if (!allowed.has(name)) continue; // on*-атрибуты и прочее — мимо
      if ((name === "href" || name === "src") && !isSafeUrl(value)) continue;
      out += ` ${name}="${escapeAttr(value)}"`;
    }
  }
  // ссылка без безопасного href / картинка без безопасного src — тег не нужен
  if (tag === "a" && !out.includes(" href=")) return null;
  if (tag === "img" && !out.includes(" src=")) return null;
  out += VOID_TAGS.has(tag) ? " />" : ">";
  return out;
}

/**
 * Очищает HTML по консервативному allowlist.
 * Неразрешённые теги удаляются (текст внутри сохраняется),
 * опасные контейнеры удаляются вместе с содержимым.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  const out: string[] = [];
  const stack: string[] = []; // открытые разрешённые теги — для балансировки
  let i = 0;
  const n = html.length;

  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      out.push(html.slice(i));
      break;
    }
    if (lt > i) out.push(html.slice(i, lt));

    // комментарии и <!DOCTYPE ...> / <? ... >
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (html[lt + 1] === "!" || html[lt + 1] === "?") {
      const end = html.indexOf(">", lt);
      i = end === -1 ? n : end + 1;
      continue;
    }

    const isClosing = html[lt + 1] === "/";
    const nameStart = lt + (isClosing ? 2 : 1);
    const nameMatch = /^[a-zA-Z][a-zA-Z0-9]*/.exec(html.slice(nameStart));
    if (!nameMatch) {
      // одиночный «<» — экранируем как текст
      out.push("&lt;");
      i = lt + 1;
      continue;
    }
    const tag = nameMatch[0].toLowerCase();

    // ищем конец тега с учётом кавычек в атрибутах
    let j = nameStart + nameMatch[0].length;
    let quote: string | null = null;
    while (j < n) {
      const ch = html[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ">") {
        break;
      }
      j++;
    }
    const tagEnd = j < n ? j + 1 : n;
    const rawAttrs = html.slice(nameStart + nameMatch[0].length, j).replace(/\/\s*$/, "");

    if (isClosing) {
      if (ALLOWED_TAGS.has(tag) && stack.includes(tag)) {
        // закрываем вложенные незакрытые теги до искомого
        while (stack.length) {
          const top = stack.pop()!;
          out.push(`</${top}>`);
          if (top === tag) break;
        }
      }
      i = tagEnd;
      continue;
    }

    if (DROP_WITH_CONTENT.has(tag)) {
      // вырезаем контейнер вместе с содержимым
      const closeRe = new RegExp(`</${tag}\\s*>`, "i");
      const rest = html.slice(tagEnd);
      const m = closeRe.exec(rest);
      i = m ? tagEnd + m.index + m[0].length : n;
      continue;
    }

    if (ALLOWED_TAGS.has(tag)) {
      const built = buildTag(tag, rawAttrs);
      if (built) {
        out.push(built);
        if (!VOID_TAGS.has(tag)) stack.push(tag);
      }
    }
    // неразрешённый тег просто пропускаем (текст внутри останется)
    i = tagEnd;
  }

  // закрываем незакрытые теги
  while (stack.length) out.push(`</${stack.pop()!}>`);
  return out.join("");
}
