import { autoDetectMermaidPaths, isValidMermaidCode } from "./json-mermaid";
import { fixControlCharsInStrings, recoveryParse, removeJsonComments, tryParse } from "./json-recovery";

const RE_BOM = /^\uFEFF/;
const RE_TRAILING_COMMA = /,(\s*[\]}])/g;

export interface SafeParseOptions {
	validators?: Record<string, (item: unknown) => boolean>;
	validateMermaid?: boolean;
}

export interface SafeParseResult<T = unknown> {
	ok: boolean;
	data: T;
	removed: RemovedEntry[];
	warnings: string[];
}

export interface RemovedEntry {
	path: string;
	item: unknown;
	reason: string;
}

export const safeParse = <T = unknown>(
	raw: string,
	options: SafeParseOptions = {},
): SafeParseResult<T> => {
	const warnings: string[] = [];
	const removed: RemovedEntry[] = [];
	const jsonText = extractJson(raw);
	if (jsonText === null) {
		return { ok: false, data: null as T, removed, warnings: ["未在输入中找到 JSON 结构"] };
	}

	let parsed = tryParse(jsonText);
	let data: unknown;
	if (parsed.ok) {
		data = parsed.value;
	} else {
		const fixed = applyFixes(jsonText);
		parsed = tryParse(fixed);
		if (parsed.ok) {
			data = parsed.value;
			warnings.push("已应用语法修复后解析成功");
		} else {
			warnings.push("标准解析失败，正在尝试逐片段恢复");
			try {
				data = recoveryParse(fixed.length >= jsonText.length ? fixed : jsonText, warnings);
			} catch (error) {
				return {
					ok: false,
					data: null as T,
					removed,
					warnings: [...warnings, `恢复解析也失败了: ${(error as Error).message}`],
				};
			}
		}
	}

	const validators = { ...(options.validators ?? {}) };
	if (options.validateMermaid !== false) {
		autoDetectMermaidPaths(data, validators);
	}

	for (const [path, validator] of Object.entries(validators)) {
		const value = getByPath(data, path);
		if (!Array.isArray(value))
			continue;
		const cleaned: unknown[] = [];
		for (let index = 0; index < value.length; index++) {
			if (isValidItem(value[index], validator, warnings, path, index)) {
				cleaned.push(value[index]);
			} else {
				removed.push({ path: `${path}[${index}]`, item: summariseItem(value[index]), reason: "未通过内容校验" });
			}
		}
		setByPath(data, path, cleaned);
	}

	return { ok: true, data: data as T, removed, warnings };
};

export const parseModelOutput = <T = unknown>(raw: string): SafeParseResult<T> =>
	safeParse<T>(raw, { validateMermaid: true });

const extractJson = (raw: string): string | null => {
	let text = raw.trim();
	if (text.startsWith("```")) {
		const firstNewlineIndex = text.indexOf("\n");
		const closingFenceIndex = text.lastIndexOf("```");
		if (firstNewlineIndex !== -1 && closingFenceIndex > firstNewlineIndex) {
			text = text.slice(firstNewlineIndex + 1, closingFenceIndex).trim();
		}
	}

	const objectIndex = text.indexOf("{");
	const arrayIndex = text.indexOf("[");
	if (objectIndex === -1 && arrayIndex === -1)
		return null;

	const start = objectIndex === -1 ? arrayIndex : arrayIndex === -1 ? objectIndex : Math.min(objectIndex, arrayIndex);
	const end = findMatchingClose(text, start);
	return end === -1 ? text.substring(start) : text.substring(start, end + 1);
};

const findMatchingClose = (text: string, start: number): number => {
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = start; index < text.length; index++) {
		const character = text[index];
		if (escaped) {
			escaped = false;
			continue;
		}
		if (character === "\\" && inString) {
			escaped = true;
			continue;
		}
		if (character === "\"") {
			inString = !inString;
			continue;
		}
		if (!inString && (character === "{" || character === "["))
			depth++;
		if (!inString && (character === "}" || character === "]") && --depth === 0)
			return index;
	}
	return -1;
};

const applyFixes = (json: string): string =>
	fixControlCharsInStrings(removeJsonComments(json.replace(RE_BOM, "").replace(RE_TRAILING_COMMA, "$1")));

const isValidItem = (
	item: unknown,
	validator: (item: unknown) => boolean,
	warnings: string[],
	path: string,
	index: number,
): boolean => {
	try {
		return validator(item);
	} catch (error) {
		warnings.push(`校验器在 ${path}[${index}] 抛出异常: ${(error as Error).message}`);
		return false;
	}
};

const getByPath = (object: unknown, path: string): unknown => {
	if (!path)
		return object;
	let current: unknown = object;
	for (const segment of path.split(".")) {
		if (current === null || typeof current !== "object")
			return undefined;
		current = (current as Record<string, unknown>)[segment];
	}
	return current;
};

const setByPath = (object: unknown, path: string, value: unknown): void => {
	if (!path || object === null || typeof object !== "object")
		return;
	const segments = path.split(".");
	let current: unknown = object;
	for (const segment of segments.slice(0, -1)) {
		if (current === null || typeof current !== "object")
			return;
		current = (current as Record<string, unknown>)[segment];
	}
	const last = segments.at(-1);
	if (last && current !== null && typeof current === "object") {
		(current as Record<string, unknown>)[last] = value;
	}
};

const summariseItem = (item: unknown): unknown => {
	if (item === null || typeof item !== "object")
		return item;
	const summary: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
		summary[key] = typeof value === "string" && value.length > 80 ? `${value.substring(0, 80)}…` : value;
	}
	return summary;
};

export { isValidMermaidCode };
