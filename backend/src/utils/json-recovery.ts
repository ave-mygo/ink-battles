const RE_FIRST_NON_WS = /^\s*(\S)/;
const RE_VALUE_END = /[,\]}\s]/;

interface ParseSuccess {
	ok: true;
	value: unknown;
}

interface ParseFailure {
	ok: false;
}

export type ParseAttempt = ParseSuccess | ParseFailure;

export const tryParse = (json: string): ParseAttempt => {
	try {
		return { ok: true, value: JSON.parse(json) as unknown };
	} catch {
		return { ok: false };
	}
};

export const removeJsonComments = (json: string): string => {
	const output: string[] = [];
	let inString = false;
	let escaped = false;

	for (let index = 0; index < json.length; index++) {
		const character = json[index];
		if (escaped) {
			escaped = false;
			output.push(character);
			continue;
		}
		if (character === "\\" && inString) {
			escaped = true;
			output.push(character);
			continue;
		}
		if (character === "\"") {
			inString = !inString;
			output.push(character);
			continue;
		}
		if (!inString && character === "/" && json[index + 1] === "/") {
			const newline = json.indexOf("\n", index);
			index = newline === -1 ? json.length - 1 : newline;
			continue;
		}
		if (!inString && character === "/" && json[index + 1] === "*") {
			const close = json.indexOf("*/", index + 2);
			index = close === -1 ? json.length - 1 : close + 1;
			continue;
		}
		output.push(character);
	}
	return output.join("");
};

export const fixControlCharsInStrings = (json: string): string => {
	const output: string[] = [];
	let inString = false;
	let escaped = false;

	for (const character of json) {
		const code = character.charCodeAt(0);
		if (escaped) {
			escaped = false;
			output.push(character);
			continue;
		}
		if (character === "\\" && inString) {
			escaped = true;
			output.push(character);
			continue;
		}
		if (character === "\"") {
			inString = !inString;
			output.push(character);
			continue;
		}
		if (inString && code < 0x20) {
			output.push(code === 0x0A ? "\\n" : code === 0x0D ? "\\r" : code === 0x09 ? "\\t" : `\\u${code.toString(16).padStart(4, "0")}`);
		} else {
			output.push(character);
		}
	}
	return output.join("");
};

export const recoveryParse = (json: string, warnings: string[]): unknown => {
	const trimmed = json.trim();
	if (trimmed[0] === "{")
		return recoverObject(trimmed, warnings);
	if (trimmed[0] === "[")
		return recoverArray(trimmed, warnings);
	throw new Error("输入不以 { 或 [ 开头");
};

const recoverObject = (json: string, warnings: string[]): Record<string, unknown> => {
	const result: Record<string, unknown> = {};
	for (const { key, rawValue } of splitObjectPairs(json)) {
		const value = parseRecoveredValue(rawValue.trim(), warnings);
		if (value.ok) {
			result[key] = value.value;
		} else {
			warnings.push(`丢弃键 "${key}": 无法解析其值`);
		}
	}
	return result;
};

const recoverArray = (json: string, warnings: string[]): unknown[] => {
	const result: unknown[] = [];
	const elements = splitArrayElements(json);
	for (let index = 0; index < elements.length; index++) {
		const value = parseRecoveredValue(elements[index].trim(), warnings);
		if (value.ok) {
			result.push(value.value);
		} else {
			warnings.push(`丢弃数组元素 [${index}]`);
		}
	}
	return result;
};

const parseRecoveredValue = (rawValue: string, warnings: string[]): ParseAttempt => {
	if (!rawValue)
		return { ok: false };
	let parsed = tryParse(rawValue);
	if (parsed.ok)
		return parsed;
	parsed = tryParse(fixControlCharsInStrings(removeJsonComments(rawValue)));
	if (parsed.ok)
		return parsed;
	if (rawValue[0] === "{" || rawValue[0] === "[") {
		try {
			const value = recoveryParse(rawValue, warnings);
			if (value !== null && typeof value === "object" && Object.keys(value).length > 0)
				return { ok: true, value };
		} catch {
			return { ok: false };
		}
	}
	return { ok: false };
};

interface ObjectPair {
	key: string;
	rawValue: string;
}

const splitObjectPairs = (json: string): ObjectPair[] => {
	const pairs: ObjectPair[] = [];
	let position = json.indexOf("{") + 1;

	while (position < json.length) {
		position = skipWhitespace(json, position);
		if (position >= json.length || json[position] === "}")
			break;
		if (json[position] !== "\"") {
			position++;
			continue;
		}

		const keyEnd = scanString(json, position);
		if (keyEnd === -1)
			break;

		try {
			const key = JSON.parse(json.substring(position, keyEnd)) as string;
			position = skipWhitespace(json, keyEnd);
			if (json[position] === ":")
				position++;
			position = skipWhitespace(json, position);
			const valueEnd = scanValue(json, position);
			pairs.push({ key, rawValue: json.substring(position, valueEnd) });
			position = json[valueEnd] === "," ? valueEnd + 1 : valueEnd;
		} catch {
			position = keyEnd;
		}
	}
	return pairs;
};

const splitArrayElements = (json: string): string[] => {
	const elements: string[] = [];
	let position = json.indexOf("[") + 1;
	while (position < json.length) {
		position = skipWhitespace(json, position);
		if (position >= json.length || json[position] === "]")
			break;
		const valueEnd = scanValue(json, position);
		elements.push(json.substring(position, valueEnd));
		position = json[valueEnd] === "," ? valueEnd + 1 : valueEnd;
	}
	return elements;
};

const skipWhitespace = (text: string, position: number): number => {
	while (position < text.length && [" ", "\t", "\n", "\r"].includes(text[position])) position++;
	return position;
};

const scanString = (text: string, position: number): number => {
	if (text[position] !== "\"")
		return -1;
	let escaped = false;
	for (let index = position + 1; index < text.length; index++) {
		const character = text[index];
		if (escaped) {
			escaped = false;
			continue;
		}
		if (character === "\\") {
			escaped = true;
			continue;
		}
		if (character === "\"")
			return index + 1;
		if (character === "\n" || character === "\r") {
			const match = RE_FIRST_NON_WS.exec(text.substring(index + 1));
			if (match !== null && "\"}],".includes(match[1]))
				return index;
		}
	}
	return text.length;
};

const scanValue = (text: string, position: number): number => {
	position = skipWhitespace(text, position);
	if (text[position] === "\"")
		return scanString(text, position);
	if (text[position] === "{" || text[position] === "[")
		return scanBalancedValue(text, position);
	let end = position;
	while (end < text.length && !RE_VALUE_END.test(text[end])) end++;
	return end;
};

const scanBalancedValue = (text: string, position: number): number => {
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = position; index < text.length; index++) {
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
			return index + 1;
	}
	return text.length;
};
