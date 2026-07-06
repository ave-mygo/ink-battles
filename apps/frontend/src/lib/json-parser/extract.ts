// eslint-disable-next-line regexp/no-super-linear-backtracking
const RE_CODE_BLOCK = /```(?:json|JSON)?\s*([\s\S]*?)\s*```/;

export function extractJson(raw: string): string | null {
  let text = raw.trim();

  const cbMatch = RE_CODE_BLOCK.exec(text);
  if (cbMatch !== null) {
    text = cbMatch[1].trim();
  }

  const objIdx = text.indexOf("{");
  const arrIdx = text.indexOf("[");

  if (objIdx === -1 && arrIdx === -1)
    return null;

  const start = objIdx === -1
    ? arrIdx
    : arrIdx === -1
      ? objIdx
      : Math.min(objIdx, arrIdx);

  const end = findMatchingClose(text, start);
  return end === -1 ? text.substring(start) : text.substring(start, end + 1);
}

function findMatchingClose(text: string, start: number): number {
  let depth = 0;
  let inStr = false;
  let esc = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\" && inStr) {
      esc = true;
      continue;
    }
    if (ch === "\"") {
      inStr = !inStr;
      continue;
    }
    if (!inStr) {
      if (ch === "{" || ch === "[")
        depth++;
      if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0)
          return i;
      }
    }
  }
  return -1;
}
