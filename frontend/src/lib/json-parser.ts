import type { RemovedEntry, SafeParseOptions, SafeParseResult } from "./json-parser/types";
import { extractJson } from "./json-parser/extract";
import { autoDetectMermaidPaths, isValidMermaidCode } from "./json-parser/mermaid";
import { getByPath, setByPath, summariseItem } from "./json-parser/path";
import { recoveryParse } from "./json-parser/recovery";
import { applyFixes, tryParse } from "./json-parser/syntax";

export type { RemovedEntry, SafeParseOptions, SafeParseResult };
export { isValidMermaidCode };

export function safeParse<T = unknown>(
  raw: string,
  options: SafeParseOptions = {},
): SafeParseResult<T> {
  const {
    validateMermaid = true,
    validators = {},
  } = options;
  const warnings: string[] = [];
  const removed: RemovedEntry[] = [];

  const jsonText = extractJson(raw);
  if (jsonText === null) {
    return {
      ok: false,
      data: null as T,
      removed: [],
      warnings: ["未在输入中找到 JSON 结构"],
    };
  }

  let data: unknown;
  let parseAttempt = tryParse(jsonText);
  if (parseAttempt.ok) {
    data = parseAttempt.value;
  } else {
    const fixed = applyFixes(jsonText);
    parseAttempt = tryParse(fixed);
    if (parseAttempt.ok) {
      data = parseAttempt.value;
      warnings.push("已应用语法修复后解析成功");
    } else {
      warnings.push("标准解析失败，正在尝试逐片段恢复");
      try {
        data = recoveryParse(fixed.length >= jsonText.length ? fixed : jsonText, warnings);
      } catch (e) {
        return {
          ok: false,
          data: null as T,
          removed: [],
          warnings: [...warnings, `恢复解析也失败了: ${(e as Error).message}`],
        };
      }
    }
  }

  const allValidators: Record<string, (item: unknown) => boolean> = {
    ...validators,
  };
  if (validateMermaid) {
    autoDetectMermaidPaths(data, allValidators);
  }

  for (const [path, validator] of Object.entries(allValidators)) {
    const arr = getByPath(data, path);
    if (!Array.isArray(arr))
      continue;

    const cleaned: unknown[] = [];
    for (let i = 0; i < arr.length; i++) {
      let keep = false;
      try {
        keep = validator(arr[i]);
      } catch (e) {
        warnings.push(`校验器在 ${path}[${i}] 抛出异常: ${(e as Error).message}`);
      }
      if (keep) {
        cleaned.push(arr[i]);
      } else {
        removed.push({
          path: `${path}[${i}]`,
          item: summariseItem(arr[i]),
          reason: "未通过内容校验",
        });
      }
    }
    setByPath(data, path, cleaned);
  }

  return {
    ok: true,
    data: data as T,
    removed,
    warnings,
  };
}

export function parseModelOutput<T = unknown>(raw: string): SafeParseResult<T> {
  return safeParse<T>(raw, {
    validateMermaid: true,
  });
}

export default safeParse;
