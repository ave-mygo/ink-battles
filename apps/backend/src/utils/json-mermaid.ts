const RE_MERMAID_HEAD = /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|sankey|xychart|block)\b/i;
const RE_CYRILLIC = /\p{Script=Cyrillic}{2,}/u;
const RE_SUBGRAPH = /^subgraph\b/;
const RE_END = /^end$/i;
const RE_LINE_SEP = /[;\n]/;

/**
 * 自动检测数据中的 Mermaid 图表路径并添加验证器
 * @param data - 待检测的数据对象
 * @param validators - 验证器映射对象
 * @param path - 当前路径，默认为空字符串
 */
export function autoDetectMermaidPaths(data: unknown, validators: Record<string, (item: unknown) => boolean>, path = ""): void {
  if (data === null || typeof data !== "object")
    return;

  if (Array.isArray(data)) {
    const looksLikeMermaid = data.some(
      item =>
        item !== null
        && typeof item === "object"
        && "code" in item
        && ("type" in item || "title" in item),
    );
    if (looksLikeMermaid && !(path in validators)) {
      validators[path] = isValidMermaidDiagram;
    }
    return;
  }

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const nextPath = path ? `${path}.${key}` : key;
    autoDetectMermaidPaths(value, validators, nextPath);
  }
}

/**
 * 验证对象是否为有效的 Mermaid 图表
 * @param item - 待验证的对象
 * @returns 是否为有效的 Mermaid 图表
 */
function isValidMermaidDiagram(item: unknown): boolean {
  if (item === null || typeof item !== "object")
    return false;
  const record = item as Record<string, unknown>;
  return typeof record.code === "string" && isValidMermaidCode(record.code);
}

/**
 * 验证 Mermaid 代码是否有效
 * @param code - Mermaid 代码字符串
 * @returns 代码是否有效
 */
export function isValidMermaidCode(code: string): boolean {
  let escaped = false;
  const trimmed = (code ?? "").trim();
  if (!trimmed || !RE_MERMAID_HEAD.test(trimmed) || RE_CYRILLIC.test(trimmed))
    return false;

  let quoteCount = 0;
  for (const character of trimmed) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === "\"")
      quoteCount++;
  }
  if (quoteCount % 2 !== 0)
    return false;

  if (!hasBalancedBrackets(trimmed))
    return false;
  if (!hasBalancedSubgraphs(trimmed))
    return false;

  try {
    return JSON.parse(JSON.stringify(trimmed)) === trimmed;
  } catch {
    return false;
  }
}

/**
 * 检查文本中的括号是否平衡
 * @param text - 待检查的文本
 * @returns 括号是否平衡
 */
function hasBalancedBrackets(text: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const closes = new Set([")", "]", "}"]);
  let inQuote = false;
  let escaped = false;

  for (const character of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === "\"") {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote)
      continue;
    if (character in pairs) {
      stack.push(pairs[character] as string);
    } else if (closes.has(character) && stack.pop() !== character) {
      return false;
    }
  }
  return stack.length === 0;
}

/**
 * 检查 Mermaid 代码中的 subgraph 是否平衡
 * @param text - Mermaid 代码文本
 * @returns subgraph 是否平衡
 */
function hasBalancedSubgraphs(text: string): boolean {
  const lines = text.split(RE_LINE_SEP).map(line => line.trim()).filter(Boolean);
  let depth = 0;
  for (const line of lines) {
    if (RE_SUBGRAPH.test(line))
      depth++;
    if (RE_END.test(line))
      depth--;
    if (depth < 0)
      return false;
  }
  return depth === 0;
}
