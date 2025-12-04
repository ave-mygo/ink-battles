"use client";

import mammoth from "mammoth";

/**
 * 支持的文件类型
 */
export const SUPPORTED_FILE_TYPES = {
	".txt": "text/plain",
	".md": "text/markdown",
	".markdown": "text/markdown",
	".doc": "application/msword",
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

/**
 * 支持的 MIME 类型列表
 */
export const SUPPORTED_MIME_TYPES = Object.values(SUPPORTED_FILE_TYPES);

/**
 * 支持的文件扩展名列表
 */
export const SUPPORTED_EXTENSIONS = Object.keys(SUPPORTED_FILE_TYPES);

/**
 * 获取文件接受字符串（用于 input accept 属性）
 */
export const FILE_ACCEPT_STRING = [...SUPPORTED_EXTENSIONS, ...SUPPORTED_MIME_TYPES].join(",");

/**
 * 文件解析结果
 */
export interface FileParseResult {
	success: boolean;
	text?: string;
	error?: string;
	fileName?: string;
}

/**
 * 获取文件扩展名
 */
function getFileExtension(fileName: string): string {
	const lastDot = fileName.lastIndexOf(".");
	if (lastDot === -1)
		return "";
	return fileName.slice(lastDot).toLowerCase();
}

/**
 * 检查文件是否为支持的类型
 */
export function isSupportedFile(file: File): boolean {
	const extension = getFileExtension(file.name);
	return SUPPORTED_EXTENSIONS.includes(extension);
}

/**
 * 解析纯文本文件 (.txt, .md)
 */
async function parseTextFile(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result;
			if (typeof text === "string") {
				resolve(text);
			} else {
				reject(new Error("无法读取文件内容"));
			}
		};
		reader.onerror = () => reject(new Error("文件读取失败"));
		reader.readAsText(file, "utf-8");
	});
}

/**
 * 解析 Word 文档 (.doc, .docx)
 */
async function parseWordFile(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const result = await mammoth.extractRawText({ arrayBuffer });
	return result.value;
}

/**
 * 解析文件并提取文本内容
 * @param file 要解析的文件
 * @returns 解析结果
 */
export async function parseFile(file: File): Promise<FileParseResult> {
	const extension = getFileExtension(file.name);

	// 检查文件类型是否支持
	if (!isSupportedFile(file)) {
		return {
			success: false,
			error: `不支持的文件类型: ${extension || "未知"}。支持的格式: ${SUPPORTED_EXTENSIONS.join(", ")}`,
			fileName: file.name,
		};
	}

	// 检查文件大小（限制为 10MB）
	const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
	if (file.size > MAX_FILE_SIZE) {
		return {
			success: false,
			error: `文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB。最大支持 10MB`,
			fileName: file.name,
		};
	}

	try {
		let text: string;

		switch (extension) {
			case ".txt":
			case ".md":
			case ".markdown":
				text = await parseTextFile(file);
				break;
			case ".doc":
			case ".docx":
				text = await parseWordFile(file);
				break;
			default:
				return {
					success: false,
					error: `不支持的文件类型: ${extension}`,
					fileName: file.name,
				};
		}

		// 检查解析后的内容是否为空
		const trimmedText = text.trim();
		if (!trimmedText) {
			return {
				success: false,
				error: "文件内容为空",
				fileName: file.name,
			};
		}

		return {
			success: true,
			text: trimmedText,
			fileName: file.name,
		};
	} catch (error) {
		console.error("文件解析错误:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "文件解析失败",
			fileName: file.name,
		};
	}
}

/**
 * 格式化文件大小显示
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024)
		return `${bytes} B`;
	if (bytes < 1024 * 1024)
		return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
