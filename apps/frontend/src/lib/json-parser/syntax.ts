import type { ParseAttempt } from "./types";

const RE_BOM = /^\uFEFF/;
const RE_TRAILING_COMMA = /,(\s*[\]}])/g;

export function tryParse(json: string): ParseAttempt {
  try {
    return {
      ok: true,
      value: JSON.parse(json) as unknown,
    };
  } catch {
    return {
      ok: false,
    };
  }
}

export function applyFixes(json: string): string {
  let s = json;
  s = s.replace(RE_BOM, "");
  s = s.replace(RE_TRAILING_COMMA, "$1");
  s = removeJsonComments(s);
  s = fixControlCharsInStrings(s);
  return s;
}

function fixControlCharsInStrings(json: string): string {
  const out: string[] = [];
  let inStr = false;
  let esc = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    const code = ch.charCodeAt(0);

    if (esc) {
      esc = false;
      out.push(ch);
      continue;
    }
    if (ch === "\\" && inStr) {
      esc = true;
      out.push(ch);
      continue;
    }
    if (ch === "\"") {
      inStr = !inStr;
      out.push(ch);
      continue;
    }

    if (inStr && code < 0x20) {
      if (code === 0x0A) {
        out.push("\\n");
      } else if (code === 0x0D) {
        out.push("\\r");
      } else if (code === 0x09) {
        out.push("\\t");
      } else {
        out.push(`\\u${code.toString(16).padStart(4, "0")}`);
      }
    } else {
      out.push(ch);
    }
  }
  return out.join("");
}

function removeJsonComments(json: string): string {
  const out: string[] = [];
  let inStr = false;
  let esc = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (esc) {
      esc = false;
      out.push(ch);
      continue;
    }
    if (ch === "\\" && inStr) {
      esc = true;
      out.push(ch);
      continue;
    }
    if (ch === "\"") {
      inStr = !inStr;
      out.push(ch);
      continue;
    }

    if (!inStr) {
      if (ch === "/" && json[i + 1] === "/") {
        const nl = json.indexOf("\n", i);
        i = nl === -1 ? json.length - 1 : nl;
        continue;
      }
      if (ch === "/" && json[i + 1] === "*") {
        const ce = json.indexOf("*/", i + 2);
        i = ce === -1 ? json.length - 1 : ce + 1;
        continue;
      }
    }
    out.push(ch);
  }
  return out.join("");
}
