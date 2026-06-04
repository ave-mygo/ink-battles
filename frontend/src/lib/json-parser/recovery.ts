import { applyFixes, tryParse } from "./syntax";

const RE_FIRST_NON_WS = /^\s*(\S)/;
const RE_VALUE_END = /[,\]}\s]/;

interface ObjectPair {
  key: string;
  rawValue: string;
}

export function recoveryParse(json: string, warnings: string[]): unknown {
  const t = json.trim();
  if (t[0] === "{")
    return recoverObject(t, warnings);
  if (t[0] === "[")
    return recoverArray(t, warnings);
  throw new Error("输入不以 { 或 [ 开头");
}

function recoverObject(json: string, warnings: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const pairs = splitObjectPairs(json);

  for (const {
    key,
    rawValue,
  }
    of pairs) {
    const v = rawValue.trim();
    if (!v)
      continue;

    let r = tryParse(v);
    if (r.ok) {
      result[key] = r.value;
      continue;
    }

    r = tryParse(applyFixes(v));
    if (r.ok) {
      result[key] = r.value;
      continue;
    }

    if (v[0] === "{" || v[0] === "[") {
      try {
        result[key] = recoveryParse(v, warnings);
        continue;
      } catch {
        /* fall through */
      }
    }

    warnings.push(`丢弃键 "${key}": 无法解析其值`);
  }
  return result;
}

function recoverArray(json: string, warnings: string[]): unknown[] {
  const result: unknown[] = [];
  const elements = splitArrayElements(json);

  for (let i = 0; i < elements.length; i++) {
    const e = elements[i].trim();
    if (!e)
      continue;

    let r = tryParse(e);
    if (r.ok) {
      result.push(r.value);
      continue;
    }

    r = tryParse(applyFixes(e));
    if (r.ok) {
      result.push(r.value);
      continue;
    }

    if (e[0] === "{" || e[0] === "[") {
      try {
        const recovered = recoveryParse(e, warnings);
        if (
          recovered !== null
          && typeof recovered === "object"
          && Object.keys(recovered).length > 0
        ) {
          result.push(recovered);
          continue;
        }
      } catch {
        /* fall through */
      }
    }

    warnings.push(`丢弃数组元素 [${i}]`);
  }
  return result;
}

function splitObjectPairs(json: string): ObjectPair[] {
  const pairs: ObjectPair[] = [];
  let pos = json.indexOf("{") + 1;

  while (pos < json.length) {
    pos = skipWS(json, pos);
    if (pos >= json.length || json[pos] === "}")
      break;

    if (json[pos] !== "\"") {
      pos++;
      continue;
    }

    const keyEnd = scanString(json, pos);
    if (keyEnd === -1)
      break;

    let key: string;
    try {
      key = JSON.parse(json.substring(pos, keyEnd)) as string;
    } catch {
      pos = keyEnd;
      continue;
    }
    pos = keyEnd;

    pos = skipWS(json, pos);
    if (json[pos] === ":")
      pos++;
    pos = skipWS(json, pos);

    const valEnd = scanValue(json, pos);
    pairs.push({
      key,
      rawValue: json.substring(pos, valEnd),
    });
    pos = valEnd;

    pos = skipWS(json, pos);
    if (json[pos] === ",")
      pos++;
  }
  return pairs;
}

function splitArrayElements(json: string): string[] {
  const elements: string[] = [];
  let pos = json.indexOf("[") + 1;

  while (pos < json.length) {
    pos = skipWS(json, pos);
    if (pos >= json.length || json[pos] === "]")
      break;

    const valEnd = scanValue(json, pos);
    elements.push(json.substring(pos, valEnd));
    pos = valEnd;

    pos = skipWS(json, pos);
    if (json[pos] === ",")
      pos++;
  }
  return elements;
}

function skipWS(text: string, pos: number): number {
  while (pos < text.length && (text[pos] === " " || text[pos] === "\t" || text[pos] === "\n" || text[pos] === "\r")) {
    pos++;
  }
  return pos;
}

/**
 * 扫描一个 JSON 字符串字面量，返回闭合引号之后的位置。
 * 启发式处理：遇到裸换行时，检查下一行首字符，
 * 若看起来像结构字符则认为字符串在此结束。
 */
function scanString(text: string, pos: number): number {
  if (text[pos] !== "\"")
    return -1;
  let esc = false;

  for (let i = pos + 1; i < text.length; i++) {
    const ch = text[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\") {
      esc = true;
      continue;
    }
    if (ch === "\"")
      return i + 1;

    if (ch === "\n" || ch === "\r") {
      const rest = text.substring(i + 1);
      const m = RE_FIRST_NON_WS.exec(rest);
      if (m !== null && "\"}],".includes(m[1]))
        return i;
    }
  }

  for (let i = pos + 1; i < text.length; i++) {
    if (text[i] === "\n" || text[i] === "\r")
      return i;
  }
  return text.length;
}

function scanValue(text: string, pos: number): number {
  pos = skipWS(text, pos);
  if (pos >= text.length)
    return pos;

  const ch = text[pos];

  if (ch === "\"")
    return scanString(text, pos);

  if (ch === "{" || ch === "[") {
    let depth = 0;
    let inStr = false;
    let esc = false;

    for (let i = pos; i < text.length; i++) {
      const c = text[i];
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\" && inStr) {
        esc = true;
        continue;
      }
      if (c === "\"") {
        inStr = !inStr;
        continue;
      }

      if (!inStr) {
        if (c === "{" || c === "[")
          depth++;
        if (c === "}" || c === "]") {
          depth--;
          if (depth === 0)
            return i + 1;
        }
      }
    }
    return text.length;
  }

  let end = pos;
  while (end < text.length && !RE_VALUE_END.test(text[end])) end++;
  return end;
}
