import type { ReactNode } from "react";

const NBSP = "\u00a0";
const SHORT_WORD = /^[«“„(]*(?:в|во|на|к|ко|с|со|у|о|об|от|до|за|из|по|и|а|но|не|ни|без|для|над|под|при|про)$/iu;
const NEXT_WORD = /^[«“„(]*[А-ЯЁа-яё\d]/u;
const NUMBER = /^[+−-]?\d+(?:[.,]\d+)?(?:[–—]\d+(?:[.,]\d+)?)?$/u;
const UNIT = /^(?:%|₽|руб\.?|коп\.?|мг|мкг|г|кг|мл|л|мм|см|м|шт\.?|капсул(?:а|ы)?|таблет(?:ка|ки|ок)?|мин\.?|ч|час(?:а|ов)?|дн\.?|день|дня|дней|год(?:а|ов)?|лет)[.,;:!?»”)]*$/iu;

/** Technical tokens remain literal, including an identifier next to a short word. */
const PROTECTED = /(?:[a-z][a-z\d+.-]*:\/\/|www\.|mailto:|\S+@\S+\.)|[a-z\d]+(?:[-_/:.=][a-z\d]+)+/iu;
const isProtected = (token: string) => !NUMBER.test(token) && PROTECTED.test(token);

/**
 * Display-only Russian spacing. Join useful pairs, never whole phrases; leave
 * paragraph breaks, indentation, punctuation and technical tokens untouched.
 */
export function typesetRussian(text: string): string {
  const tokens = text.match(/[^\s\u00a0\u202f]+|[ \t\u00a0\u202f]+|[\r\n]+|\s/gu) ?? [];
  const joined = new Set<number>();
  for (let i = 1; i < tokens.length - 1; i++) {
    if (/[\u00a0\u202f]/u.test(tokens[i])) {
      joined.add(i - 1);
      joined.add(i + 1);
    }
  }
  const join = (i: number) => {
    tokens[i] = NBSP;
    joined.add(i - 1);
    joined.add(i + 1);
  };
  // Units have priority: "в 50 мг" keeps "50 мг" together without gluing all three.
  for (let i = 1; i < tokens.length - 1; i++) {
    if (tokens[i] !== " " || isProtected(tokens[i - 1]) || isProtected(tokens[i + 1])) continue;
    if ((NUMBER.test(tokens[i - 1]) && UNIT.test(tokens[i + 1])) ||
        (tokens[i - 1] === "№" && /^\d+[.,;:!?»”)]*$/u.test(tokens[i + 1]))) join(i);
  }
  for (let i = tokens.length - 2; i >= 1; i--) {
    if (tokens[i] !== " " || joined.has(i - 1) || joined.has(i + 1)) continue;
    const before = tokens[i - 1];
    const after = tokens[i + 1];
    if (SHORT_WORD.test(before) && NEXT_WORD.test(after) && !SHORT_WORD.test(after) &&
        !isProtected(before) && !isProtected(after)) join(i);
  }
  return tokens.join("");
}

/** Adjacent text/numbers form one run; elements and links keep their identity. */
export function typesetTextChildren(children: ReactNode): ReactNode {
  if (typeof children === "string") return typesetRussian(children);
  if (!Array.isArray(children)) return children;
  const result: ReactNode[] = [];
  let run = "";
  const flush = () => {
    if (run) result.push(typesetRussian(run));
    run = "";
  };
  const append = (child: ReactNode) => {
    if (Array.isArray(child)) {
      child.forEach(append);
    } else if (typeof child === "string" || typeof child === "number" || typeof child === "bigint") {
      run += String(child);
    } else if (child !== null && child !== undefined && typeof child !== "boolean") {
      flush();
      result.push(child);
    }
  };
  children.forEach(append);
  flush();
  return result;
}
