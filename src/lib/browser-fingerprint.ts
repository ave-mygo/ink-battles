/**
 * 浏览器指纹收集工具
 * 收集浏览器特征信息生成唯一指纹
 */

/**
 * 获取浏览器基本信息
 */
function getBrowserInfo() {
	const nav = navigator;
	return {
		userAgent: nav.userAgent,
		language: nav.language,
		languages: nav.languages?.join(",") || "",
		platform: nav.platform,
		cookieEnabled: nav.cookieEnabled,
		doNotTrack: nav.doNotTrack || "unknown",
		hardwareConcurrency: nav.hardwareConcurrency || 0,
		maxTouchPoints: nav.maxTouchPoints || 0,
	};
}

/**
 * 获取屏幕信息
 */
function getScreenInfo() {
	const screen = window.screen;
	return {
		width: screen.width,
		height: screen.height,
		availWidth: screen.availWidth,
		availHeight: screen.availHeight,
		colorDepth: screen.colorDepth,
		pixelDepth: screen.pixelDepth,
		devicePixelRatio: window.devicePixelRatio || 1,
	};
}

/**
 * 获取时区信息
 */
function getTimezoneInfo() {
	const date = new Date();
	return {
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		timezoneOffset: date.getTimezoneOffset(),
	};
}

/**
 * 获取Canvas指纹
 */
function getCanvasFingerprint(): string {
	try {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx)
			return "no-canvas";

		canvas.width = 200;
		canvas.height = 50;

		// 绘制文本
		ctx.textBaseline = "top";
		ctx.font = "14px Arial";
		ctx.fillStyle = "#f60";
		ctx.fillRect(125, 1, 62, 20);
		ctx.fillStyle = "#069";
		ctx.fillText("Hello, 墨战!", 2, 15);
		ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
		ctx.fillText("Browser fingerprint", 4, 25);

		// 绘制一些图形
		ctx.globalCompositeOperation = "multiply";
		ctx.fillStyle = "rgb(255,0,255)";
		ctx.beginPath();
		ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.fill();

		return canvas.toDataURL();
	} catch (error) {
		console.warn("Canvas fingerprint generation failed:", error);
		return "canvas-error";
	}
}

/**
 * 获取WebGL指纹
 */
function getWebGLFingerprint(): string {
	try {
		const canvas = document.createElement("canvas");
		const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;
		if (!gl)
			return "no-webgl";

		const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
		if (!debugInfo)
			return "no-debug-info";

		const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
		const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

		return `${vendor}~${renderer}`;
	} catch (error) {
		console.warn("WebGL fingerprint generation failed:", error);
		return "webgl-error";
	}
}

/**
 * 获取字体指纹
 */
function getFontFingerprint(): string {
	const testFonts = [
		"Arial",
		"Helvetica",
		"Times New Roman",
		"Courier New",
		"Verdana",
		"Georgia",
		"Palatino",
		"Garamond",
		"Bookman",
		"Comic Sans MS",
		"Trebuchet MS",
		"Arial Black",
		"Impact",
		"微软雅黑",
		"宋体",
		"黑体",
	];

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx)
		return "no-canvas";

	const baseFonts = ["monospace", "sans-serif", "serif"];
	const testString = "mmmmmmmmmmlli";
	const testSize = "72px";
	canvas.height = 200;
	canvas.width = 200;

	const baseFontMeasurements: Record<string, number> = {};

	// 测量基础字体
	for (const baseFont of baseFonts) {
		ctx.font = `${testSize} ${baseFont}`;
		baseFontMeasurements[baseFont] = ctx.measureText(testString).width;
	}

	const availableFonts: string[] = [];

	// 测试每个字体
	for (const font of testFonts) {
		let detected = false;
		for (const baseFont of baseFonts) {
			ctx.font = `${testSize} ${font}, ${baseFont}`;
			const measurement = ctx.measureText(testString).width;
			if (measurement !== baseFontMeasurements[baseFont]) {
				detected = true;
				break;
			}
		}
		if (detected) {
			availableFonts.push(font);
		}
	}

	return availableFonts.join(",");
}

/**
 * 简单的哈希函数
 */
function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // 转换为32位整数
	}
	return Math.abs(hash).toString(16);
}

/**
 * 生成浏览器指纹
 *
 * @returns Promise<string> 浏览器指纹字符串
 */
export async function generateBrowserFingerprint(): Promise<string> {
	try {
		// 收集各种浏览器特征
		const browserInfo = getBrowserInfo();
		const screenInfo = getScreenInfo();
		const timezoneInfo = getTimezoneInfo();
		const canvasFingerprint = getCanvasFingerprint();
		const webglFingerprint = getWebGLFingerprint();
		const fontFingerprint = getFontFingerprint();

		// 组合所有特征（移除时间戳以确保指纹一致性）
		const fingerprint = {
			browser: browserInfo,
			screen: screenInfo,
			timezone: timezoneInfo,
			canvas: simpleHash(canvasFingerprint),
			webgl: webglFingerprint,
			fonts: simpleHash(fontFingerprint),
		};

		// 生成最终指纹
		const fingerprintString = JSON.stringify(fingerprint);
		const hash = simpleHash(fingerprintString);

		return hash;
	} catch (error) {
		console.error("Browser fingerprint generation failed:", error);
		// 返回一个基于时间戳和随机数的备用指纹
		return simpleHash(`fallback-${Date.now()}-${Math.random()}`);
	}
}

/**
 * 验证指纹是否有效
 */
export function isValidFingerprint(fingerprint: string): boolean {
	return typeof fingerprint === "string" && fingerprint.length > 0 && /^[a-f0-9]+$/i.test(fingerprint);
}
