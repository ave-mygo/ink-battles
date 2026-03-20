/**
 * json-parser.ts
 *
 * 健壮的 JSON 解析器，专为处理 AI 模型的乱输出而设计。
 */

// ================================================================
// Module-scope正则（避免每次调用重新编译）
// ================================================================

/** 去除 BOM */
const RE_BOM = /^\uFEFF/;

/** 去除尾部逗号：,后跟 ] 或 } */
const RE_TRAILING_COMMA = /,(\s*[\]}])/g;

/** markdown 代码块包裹 */
const RE_CODE_BLOCK = /```(?:json|JSON)?\s*([\s\S]*?)\s*```/;

/** 合法的 mermaid 图表类型开头 */
const RE_MERMAID_HEAD = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|sankey|xychart|block)\b/i;

/** 西里尔垃圾文本检测 */
const RE_CYRILLIC = /[а-яА-ЯёЁ]{2,}/;

/** subgraph 行 */
const RE_SUBGRAPH = /^subgraph\b/;

/** end 行 */
const RE_END = /^end$/i;

/** 非空白的第一个字符 */
const RE_FIRST_NON_WS = /^\s*(\S)/;

/** 值结束边界 */
const RE_VALUE_END = /[,\]}\s]/;

/** 行分隔符 */
const RE_LINE_SEP = /[;\n]/;

// ================================================================
// Public Types
// ================================================================

export interface SafeParseOptions {
	/**
	 * 对指定路径的数组元素执行自定义校验。
	 * key = 以'.' 分隔的路径（如 "mermaid_diagrams"）
	 * value = 返回 true 保留，false 移除
	 */
	validators?: Record<string, (item: unknown) => boolean>;

	/** 是否自动检测并校验 mermaid 图表数组，默认 true */
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

// ================================================================
// Main API
// ================================================================

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

	// 1. 提取 JSON 文本
	const jsonText = extractJson(raw);
	if (jsonText === null) {
		return {
			ok: false,
			data: null as T,
			removed: [],
			warnings: ["未在输入中找到 JSON 结构"],
		};
	}

	// 2.渐进式解析
	let data: unknown;

	let r = tryParse(jsonText);
	if (r.ok) {
		data = r.value;
	} else {
		const fixed = applyFixes(jsonText);
		r = tryParse(fixed);
		if (r.ok) {
			data = r.value;
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

	// 3. 内容校验
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

// ================================================================
// JSON 提取
// ================================================================

function extractJson(raw: string): string | null {
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

// ================================================================
// 解析辅助
// ================================================================

interface ParseSuccess {
	ok: true;
	value: unknown;
}
interface ParseFailure {
	ok: false;
}
type ParseAttempt = ParseSuccess | ParseFailure;

function tryParse(json: string): ParseAttempt {
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

function applyFixes(json: string): string {
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

// ================================================================
// 恢复解析器
// ================================================================

function recoveryParse(json: string, warnings: string[]): unknown {
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

// ================================================================
// 文本级拆分
// ================================================================

interface ObjectPair {
	key: string;
	rawValue: string;
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

// ================================================================
// 字符级扫描器
// ================================================================

function skipWS(text: string, pos: number): number {
	while (pos < text.length && (text[pos] === " " || text[pos] === "\t" || text[pos] === "\n" || text[pos] === "\r")) {
		pos++;
	}
	return pos;
}

/**
 * 扫描一个 JSON 字符串字面量，返回闭合引号之后的位置。
 *启发式处理：遇到裸换行时，检查下一行首字符，
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

// ================================================================
// Mermaid 内容校验
// ================================================================

function autoDetectMermaidPaths(
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

	// 引号平衡
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

	// 括号平衡
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

	// subgraph / end平衡
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

	// 反序列化往返校验
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

// ================================================================
// 路径工具
// ================================================================

function getByPath(obj: unknown, path: string): unknown {
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

function setByPath(obj: unknown, path: string, value: unknown): void {
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

function summariseItem(item: unknown): unknown {
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

// ================================================================
// Default export
// ================================================================

export default safeParse;
