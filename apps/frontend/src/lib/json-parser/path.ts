export function getByPath(obj: unknown, path: string): unknown {
  if (!path)
    return obj;
  let cur = obj;
  for (const seg of path.split(".")) {
    if (cur === null || typeof cur !== "object")
      return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

export function setByPath(obj: unknown, path: string, value: unknown): void {
  if (!path)
    return;
  const segs = path.split(".");
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cur === null || typeof cur !== "object")
      return;
    cur = (cur as Record<string, unknown>)[segs[i] as string];
  }
  if (cur !== null && typeof cur === "object") {
    const last = segs.at(-1);
    if (last !== undefined) {
      (cur as Record<string, unknown>)[last] = value;
    }
  }
}

export function summariseItem(item: unknown): unknown {
  if (item === null || typeof item !== "object")
    return item;
  const summary: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
    if (typeof v === "string" && v.length > 80) {
      summary[k] = `${v.substring(0, 80)}…`;
    } else {
      summary[k] = v;
    }
  }
  return summary;
}
