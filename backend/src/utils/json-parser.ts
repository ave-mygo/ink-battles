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

/**
 * 安全解析 JSON 字符串，支持容错和验证
 * @param raw - 原始 JSON 字符串
 * @param options - 解析选项，包含验证器和 Mermaid 验证开关
 * @returns 解析结果，包含数据、移除项和警告信息
 */
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

/**
 * 解析模型输出的 JSON 字符串，自动启用 Mermaid 验证
 * @param raw - 原始模型输出字符串
 * @returns 解析结果
 */
export const parseModelOutput = <T = unknown>(raw: string): SafeParseResult<T> =>
	safeParse<T>(raw, { validateMermaid: true });

/**
 * 从原始字符串中提取 JSON 内容
 * @param raw - 原始字符串
 * @returns 提取的 JSON 字符串，未找到返回 null
 */
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

/**
 * 查找匹配的闭合括号位置
 * @param text - 文本字符串
 * @param start - 起始位置
 * @returns 闭合括号的位置，未找到返回 -1
 */
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

/**
 * 应用 JSON 修复，移除 BOM、注释和尾随逗号
 * @param json - JSON 字符串
 * @returns 修复后的 JSON 字符串
 */
const applyFixes = (json: string): string =>
	fixControlCharsInStrings(removeJsonComments(json.replace(RE_BOM, "").replace(RE_TRAILING_COMMA, "$1")));

/**
 * 验证数组项是否有效
 * @param item - 待验证的项
 * @param validator - 验证函数
 * @param warnings - 警告信息数组
 * @param path - 项的路径
 * @param index - 项的索引
 * @returns 是否有效
 */
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

/**
 * 根据路径获取对象属性值
 * @param object - 目标对象
 * @param path - 属性路径，用点分隔
 * @returns 属性值
 */
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

/**
 * 根据路径设置对象属性值
 * @param object - 目标对象
 * @param path - 属性路径，用点分隔
 * @param value - 要设置的值
 */
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

/**
 * 生成项的摘要，截断过长的字符串
 * @param item - 待摘要的项
 * @returns 摘要对象
 */
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
