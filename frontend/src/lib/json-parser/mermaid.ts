const RE_MERMAID_HEAD = /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|sankey|xychart|block)\b/i;
// eslint-disable-next-line regexp/no-obscure-range
const RE_CYRILLIC = /[а-яА-ЯёЁ]{2,}/;
const RE_SUBGRAPH = /^subgraph\b/;
const RE_END = /^end$/i;
const RE_LINE_SEP = /[;\n]/;

export function autoDetectMermaidPaths(
  data: unknown,
  validators: Record<string, (item: unknown) => boolean>,
  path = "",
): void {
  if (data === null || typeof data !== "object")
    return;

  if (Array.isArray(data)) {
    const looksLikeMermaid = data.some(
      (it: unknown) =>
        it !== null
        && typeof it === "object"
        && "code" in (it as object)
        && ("type" in (it as object) || "title" in (it as object)),
    );
    if (looksLikeMermaid && !(path in validators)) {
      validators[path] = isValidMermaidDiagram;
    }
    return;
  }

  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const p = path ? `${path}.${key}` : key;
    autoDetectMermaidPaths(val, validators, p);
  }
}

function isValidMermaidDiagram(item: unknown): boolean {
  if (item === null || typeof item !== "object")
    return false;
  const rec = item as Record<string, unknown>;
  if (typeof rec.code !== "string")
    return false;
  return isValidMermaidCode(rec.code);
}

export function isValidMermaidCode(code: string): boolean {
  let esc;
  const trimmed = (code ?? "").trim();
  if (!trimmed)
    return false;

  if (!RE_MERMAID_HEAD.test(trimmed))
    return false;
  if (RE_CYRILLIC.test(trimmed))
    return false;

  let quoteCount = 0;
  for (const ch of trimmed) {
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\") {
      esc = true;
      continue;
    }
    if (ch === "\"")
      quoteCount++;
  }
  if (quoteCount % 2 !== 0)
    return false;

  const stack: string[] = [];
  let inQuote = false;
  esc = false;
  const pair: Record<string, string> = {
    "(": ")",
    "[": "]",
    "{": "}",
  };
  const closes = new Set([")", "]", "}"]);

  for (const ch of trimmed) {
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\") {
      esc = true;
      continue;
    }
    if (ch === "\"") {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote)
      continue;

    if (ch in pair) {
      stack.push(pair[ch] as string);
    } else if (closes.has(ch)) {
      if (stack.length === 0 || stack.pop() !== ch)
        return false;
    }
  }
  if (stack.length > 0)
    return false;

  const lines = trimmed.split(RE_LINE_SEP).map(l => l.trim()).filter(Boolean);
  let sgDepth = 0;
  for (const line of lines) {
    if (RE_SUBGRAPH.test(line))
      sgDepth++;
    if (RE_END.test(line))
      sgDepth--;
    if (sgDepth < 0)
      return false;
  }
  if (sgDepth !== 0)
    return false;

  try {
    const encoded = JSON.stringify(trimmed);
    const decoded = JSON.parse(encoded) as string;
    if (decoded !== trimmed)
      return false;
  } catch {
    return false;
  }

  return true;
}
