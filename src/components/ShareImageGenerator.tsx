"use client";

import { Download } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef } from "react";
import { toast } from "sonner";

interface Dimension {
	name: string;
	score: number;
	description: string;
}

interface ShareImageData {
	overallScore: number;
	title: string;
	ratingTag: string;
	summary: string;
	dimensions: Dimension[];
	strengths: string[];
	improvements: string[];
	overallAssessment: string;
	percentile?: string | null;
}

interface ShareImageGeneratorProps {
	data: ShareImageData;
}

export function ShareImageGenerator({ data }: ShareImageGeneratorProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { theme, resolvedTheme } = useTheme();
	
	// 根据主题确定是否使用暗色模式
	const isDarkMode = resolvedTheme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

	// 专业的设计系统
	const designSystem = {
		colors: {
			primary: {
				50: isDarkMode ? "#1e293b" : "#f0f9ff",
				100: isDarkMode ? "#334155" : "#e0f2fe",
				200: isDarkMode ? "#475569" : "#bae6fd",
				300: isDarkMode ? "#64748b" : "#7dd3fc",
				400: isDarkMode ? "#94a3b8" : "#38bdf8",
				500: isDarkMode ? "#cbd5e1" : "#0ea5e9",
				600: isDarkMode ? "#e2e8f0" : "#0284c7",
				700: isDarkMode ? "#f1f5f9" : "#0369a1",
				800: isDarkMode ? "#f8fafc" : "#075985",
				900: isDarkMode ? "#ffffff" : "#0c4a6e",
			},
			accent: {
				50: isDarkMode ? "#451a03" : "#fffbeb",
				100: isDarkMode ? "#78350f" : "#fef3c7",
				200: isDarkMode ? "#a16207" : "#fde68a",
				300: isDarkMode ? "#ca8a04" : "#fcd34d",
				400: isDarkMode ? "#eab308" : "#fbbf24",
				500: isDarkMode ? "#facc15" : "#f59e0b",
				600: isDarkMode ? "#fde047" : "#d97706",
				700: isDarkMode ? "#fef08a" : "#b45309",
			},
			success: {
				50: isDarkMode ? "#14532d" : "#f0fdf4",
				100: isDarkMode ? "#166534" : "#dcfce7",
				300: isDarkMode ? "#4ade80" : "#86efac",
				500: isDarkMode ? "#10b981" : "#22c55e",
				600: isDarkMode ? "#059669" : "#16a34a",
			},
			neutral: {
				50: isDarkMode ? "#18181b" : "#fafafa",
				100: isDarkMode ? "#27272a" : "#f5f5f5",
				200: isDarkMode ? "#3f3f46" : "#e5e5e5",
				300: isDarkMode ? "#52525b" : "#d4d4d4",
				400: isDarkMode ? "#71717a" : "#a3a3a3",
				500: isDarkMode ? "#a1a1aa" : "#737373",
				600: isDarkMode ? "#d4d4d8" : "#525252",
				700: isDarkMode ? "#e4e4e7" : "#404040",
				800: isDarkMode ? "#f4f4f5" : "#262626",
				900: isDarkMode ? "#fafafa" : "#171717",
			},
			text: {
				primary: isDarkMode ? "#f8fafc" : "#1a202c",
				secondary: isDarkMode ? "#cbd5e1" : "#4a5568",
				muted: isDarkMode ? "#94a3b8" : "#718096",
			},
			background: {
				primary: isDarkMode ? "#0f172a" : "#ffffff",
				secondary: isDarkMode ? "#1e293b" : "#f8fafc",
				card: isDarkMode ? "#334155" : "#ffffff",
			},
		},
		typography: {
			sizes: {
				"xs": 12,
				"sm": 14,
				"base": 16,
				"lg": 18,
				"xl": 20,
				"2xl": 24,
				"3xl": 30,
				"4xl": 36,
				"5xl": 48,
				"6xl": 60,
			},
			lineHeights: {
				tight: 1.2,
				snug: 1.4,
				normal: 1.6,
				relaxed: 1.8,
				loose: 2.0,
			},
			weights: {
				normal: "400",
				medium: "500",
				semibold: "600",
				bold: "700",
				extrabold: "800",
			},
		},
		spacing: {
			"xs": 4,
			"sm": 8,
			"md": 16,
			"lg": 24,
			"xl": 32,
			"2xl": 48,
			"3xl": 64,
			"4xl": 80,
		},
		borderRadius: {
			"sm": 4,
			"md": 8,
			"lg": 12,
			"xl": 16,
			"2xl": 24,
		},
	};

	// 智能评分颜色系统
	const getScoreColors = (score: number) => {
		if (score >= 4.0) {
			return {
				primary: designSystem.colors.success[500],
				background: designSystem.colors.success[50],
				border: designSystem.colors.success[100],
			};
		}
		if (score >= 3.0) {
			return {
				primary: designSystem.colors.accent[500],
				background: designSystem.colors.accent[50],
				border: designSystem.colors.accent[100],
			};
		}
		if (score >= 2.0) {
			return {
				primary: designSystem.colors.primary[500],
				background: designSystem.colors.primary[50],
				border: designSystem.colors.primary[100],
			};
		}
		return {
			primary: designSystem.colors.neutral[500],
			background: designSystem.colors.neutral[50],
			border: designSystem.colors.neutral[200],
		};
	};

	// 精确的文本换行处理 - 修复溢出问题
	const wrapText = (
		ctx: CanvasRenderingContext2D,
		text: string,
		maxWidth: number,
		lineHeight: number = 20,
	): { lines: string[]; totalHeight: number } => {
		const words = text.split("");
		const lines: string[] = [];
		let currentLine = "";

		for (const char of words) {
			const testLine = currentLine + char;
			const metrics = ctx.measureText(testLine);

			if (metrics.width > maxWidth && currentLine !== "") {
				lines.push(currentLine.trim());
				currentLine = char;
			} else {
				currentLine = testLine;
			}
		}

		if (currentLine.trim()) {
			lines.push(currentLine.trim());
		}

		// 确保至少有一行
		if (lines.length === 0) {
			lines.push(text);
		}

		return {
			lines,
			totalHeight: lines.length * lineHeight,
		};
	};

	// 绘制高质量卡片 - 修复边距问题
	const drawCard = (
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
		options: {
			backgroundColor?: string;
			borderColor?: string;
			borderWidth?: number;
			borderRadius?: number;
			shadow?: boolean;
			shadowIntensity?: number;
		} = {},
	) => {
		const {
			backgroundColor = designSystem.colors.background.card,
			borderColor,
			borderWidth = 0,
			borderRadius = designSystem.borderRadius.xl,
			shadow = true,
			shadowIntensity = 0.08,
		} = options;

		ctx.save();

		// 绘制阴影
		if (shadow) {
			ctx.shadowColor = `rgba(0, 0, 0, ${shadowIntensity})`;
			ctx.shadowBlur = 20;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 4;
		}

		// 绘制主体
		ctx.beginPath();
		ctx.roundRect(x, y, width, height, borderRadius);
		ctx.fillStyle = backgroundColor;
		ctx.fill();

		// 重置阴影
		ctx.shadowColor = "transparent";
		ctx.shadowBlur = 0;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;

		// 绘制边框
		if (borderColor && borderWidth > 0) {
			ctx.strokeStyle = borderColor;
			ctx.lineWidth = borderWidth;
			ctx.stroke();
		}

		ctx.restore();
	};

	// 绘制精美的雷达图
	const drawRadarChart = (
		ctx: CanvasRenderingContext2D,
		centerX: number,
		centerY: number,
		radius: number,
		dimensions: Dimension[],
	) => {
		const sides = dimensions.length;
		const angleStep = (Math.PI * 2) / sides;
		const startAngle = -Math.PI / 2;

		ctx.save();

		// 绘制背景网格
		ctx.strokeStyle = designSystem.colors.neutral[200];
		ctx.lineWidth = 1;

		// 同心圆
		for (let level = 1; level <= 5; level++) {
			ctx.beginPath();
			ctx.arc(centerX, centerY, (radius * level) / 5, 0, Math.PI * 2);
			ctx.stroke();
		}

		// 射线
		for (let i = 0; i < sides; i++) {
			const angle = startAngle + i * angleStep;
			ctx.beginPath();
			ctx.moveTo(centerX, centerY);
			ctx.lineTo(
				centerX + Math.cos(angle) * radius,
				centerY + Math.sin(angle) * radius,
			);
			ctx.stroke();
		}

		// 绘制数据区域
		ctx.beginPath();
		const firstAngle = startAngle;
		const firstValue = dimensions[0].score;
		ctx.moveTo(
			centerX + Math.cos(firstAngle) * (radius * firstValue / 5),
			centerY + Math.sin(firstAngle) * (radius * firstValue / 5),
		);

		for (let i = 1; i < sides; i++) {
			const angle = startAngle + i * angleStep;
			const value = dimensions[i].score;
			ctx.lineTo(
				centerX + Math.cos(angle) * (radius * value / 5),
				centerY + Math.sin(angle) * (radius * value / 5),
			);
		}
		ctx.closePath();

		// 填充
		ctx.fillStyle = `${designSystem.colors.primary[500]}20`;
		ctx.fill();

		// 描边
		ctx.strokeStyle = designSystem.colors.primary[500];
		ctx.lineWidth = 3;
		ctx.stroke();

		// 绘制数据点
		for (let i = 0; i < sides; i++) {
			const angle = startAngle + i * angleStep;
			const value = dimensions[i].score;
			const pointX = centerX + Math.cos(angle) * (radius * value / 5);
			const pointY = centerY + Math.sin(angle) * (radius * value / 5);

			// 外圈
			ctx.beginPath();
			ctx.fillStyle = designSystem.colors.primary[500];
			ctx.arc(pointX, pointY, 6, 0, Math.PI * 2);
			ctx.fill();

			// 内圈
			ctx.beginPath();
			ctx.fillStyle = "#ffffff";
			ctx.arc(pointX, pointY, 3, 0, Math.PI * 2);
			ctx.fill();
		}

		// 绘制标签
		ctx.fillStyle = designSystem.colors.text.secondary;
		ctx.font = `${designSystem.typography.weights.medium} ${designSystem.typography.sizes.sm}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		for (let i = 0; i < sides; i++) {
			const angle = startAngle + i * angleStep;
			const labelRadius = radius + 30;
			const labelX = centerX + Math.cos(angle) * labelRadius;
			const labelY = centerY + Math.sin(angle) * labelRadius;

			// 标签背景
			const labelWidth = ctx.measureText(dimensions[i].name).width + 16;
			const labelHeight = 24;
			drawCard(ctx, labelX - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight, {
				backgroundColor: "#ffffff",
				shadow: true,
				shadowIntensity: 0.1,
				borderRadius: designSystem.borderRadius.md,
			});

			ctx.fillText(dimensions[i].name, labelX, labelY);
		}

		ctx.restore();
	};

	// 动态计算区域高度 - 基于实际内容
	const calculateSectionHeight = (
		ctx: CanvasRenderingContext2D,
		content: string,
		maxWidth: number,
		fontSize: number,
		lineHeight: number,
		padding: number = 60,
	): number => {
		ctx.font = `${designSystem.typography.weights.normal} ${fontSize}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
		const { totalHeight } = wrapText(ctx, content, maxWidth, lineHeight);
		return totalHeight + padding;
	};

	// 计算完整画布高度
	const calculateCanvasHeight = (): number => {
		// 创建临时canvas用于测量
		const tempCanvas = document.createElement("canvas");
		const tempCtx = tempCanvas.getContext("2d");
		if (!tempCtx)
			return 1200;

		let height = 0;
		const contentWidth = 800 - designSystem.spacing["4xl"] - designSystem.spacing["2xl"]; // 内容区域宽度

		// 头部区域
		height += 180;
		height += designSystem.spacing["2xl"];

		// 分数区域
		height += 280;
		height += designSystem.spacing["2xl"];

		// 概述区域
		if (data.summary) {
			const summaryHeight = calculateSectionHeight(
				tempCtx,
				data.summary,
				contentWidth,
				designSystem.typography.sizes.base,
				designSystem.typography.sizes.base * designSystem.typography.lineHeights.relaxed,
				80,
			);
			height += Math.max(summaryHeight, 120);
			height += designSystem.spacing.xl;
		}

		// 雷达图区域
		if (data.dimensions.length > 0) {
			height += 400;
			height += designSystem.spacing.xl;
		}

		// 优势区域
		if (data.strengths.length > 0) {
			let strengthsHeight = 80; // 标题区域
			data.strengths.slice(0, 5).forEach((strength) => {
				const itemHeight = calculateSectionHeight(
					tempCtx,
					strength,
					contentWidth - 40, // 减去圆点和间距
					designSystem.typography.sizes.base,
					designSystem.typography.sizes.base * designSystem.typography.lineHeights.normal,
					0,
				);
				strengthsHeight += Math.max(itemHeight, 32); // 最小32px每项
			});
			height += strengthsHeight + 20; // 底部padding
			height += designSystem.spacing.xl;
		}

		// 改进建议区域
		if (data.improvements.length > 0) {
			let improvementsHeight = 80; // 标题区域
			data.improvements.slice(0, 5).forEach((improvement) => {
				const itemHeight = calculateSectionHeight(
					tempCtx,
					improvement,
					contentWidth - 40,
					designSystem.typography.sizes.base,
					designSystem.typography.sizes.base * designSystem.typography.lineHeights.normal,
					0,
				);
				improvementsHeight += Math.max(itemHeight, 32);
			});
			height += improvementsHeight + 20;
			height += designSystem.spacing.xl;
		}

		// 综合评价区域
		if (data.overallAssessment) {
			const assessmentHeight = calculateSectionHeight(
				tempCtx,
				data.overallAssessment,
				contentWidth,
				designSystem.typography.sizes.base,
				designSystem.typography.sizes.base * designSystem.typography.lineHeights.relaxed,
				80,
			);
			height += Math.max(assessmentHeight, 120);
			height += designSystem.spacing.xl;
		}

		// 底部区域
		height += 180;

		return Math.max(height, 1200);
	};

	const generateImage = async () => {
		const canvas = canvasRef.current;
		if (!canvas)
			return;

		const ctx = canvas.getContext("2d");
		if (!ctx)
			return;

		// 设置画布尺寸
		canvas.width = 800;
		canvas.height = calculateCanvasHeight();

		// 内容区域参数
		const contentPadding = designSystem.spacing["2xl"];
		const contentWidth = canvas.width - designSystem.spacing["4xl"];
		const textPadding = designSystem.spacing.lg;

		// 绘制优雅的背景
		const backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
		backgroundGradient.addColorStop(0, designSystem.colors.primary[50]);
		backgroundGradient.addColorStop(0.3, "#ffffff");
		backgroundGradient.addColorStop(0.7, "#ffffff");
		backgroundGradient.addColorStop(1, designSystem.colors.accent[50]);
		ctx.fillStyle = backgroundGradient;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// 装饰性几何元素
		ctx.save();
		ctx.globalAlpha = 0.03;
		ctx.fillStyle = designSystem.colors.primary[300];
		ctx.beginPath();
		ctx.arc(100, 100, 80, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = designSystem.colors.accent[300];
		ctx.beginPath();
		ctx.arc(canvas.width - 80, canvas.height - 120, 60, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		let yPos = 0;

		// === 头部区域 ===
		drawCard(ctx, 0, 0, canvas.width, 180, {
			backgroundColor: designSystem.colors.primary[600],
			shadow: true,
			borderRadius: 0,
		});

		// 标题
		ctx.fillStyle = "#ffffff";
		ctx.font = `${designSystem.typography.weights.bold} ${designSystem.typography.sizes["4xl"]}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("作家战力分析报告", canvas.width / 2, 90);

		// 副标题
		ctx.fillStyle = designSystem.colors.primary[100];
		ctx.font = `${designSystem.typography.weights.normal} ${designSystem.typography.sizes.lg}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
		ctx.fillText(`狸希Rikki - ${new Date().getFullYear()}`, canvas.width / 2, 130);

		yPos = 180 + designSystem.spacing["2xl"];

		// === 分数区域 ===
		const scoreColors = getScoreColors(data.overallScore);
		drawCard(ctx, contentPadding, yPos, contentWidth, 280, {
			backgroundColor: scoreColors.background,
			borderColor: scoreColors.border,
			borderWidth: 2,
			shadow: true,
		});

		// 主分数
		ctx.fillStyle = scoreColors.primary;
		ctx.font = `${designSystem.typography.weights.extrabold} ${designSystem.typography.sizes["6xl"]}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
		ctx.textAlign = "center";
		ctx.fillText(data.overallScore.toString(), canvas.width / 2, yPos + 100);

		// 称号
		ctx.fillStyle = designSystem.colors.text.primary;
		ctx.font = `${designSystem.typography.weights.bold} ${designSystem.typography.sizes["2xl"]}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
		ctx.fillText(data.title, canvas.width / 2, yPos + 150);

		// 标签
		ctx.fillStyle = designSystem.colors.text.secondary;
		ctx.font = `${designSystem.typography.weights.medium} ${designSystem.typography.sizes.lg}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
		ctx.fillText(data.ratingTag, canvas.width / 2, yPos + 180);

		// 百分位
		if (data.percentile) {
			ctx.fillStyle = scoreColors.primary;
			ctx.font = `${designSystem.typography.weights.semibold} ${designSystem.typography.sizes.base}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
			ctx.fillText(`超越了 ${data.percentile}% 的作品`, canvas.width / 2, yPos + 220);
		}

		yPos += 280 + designSystem.spacing["2xl"];

		// === 概述区域 ===
		if (data.summary) {
			// 计算实际需要的高度
			ctx.font = `${designSystem.typography.weights.normal} ${designSystem.typography.sizes.base}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
			const summaryResult = wrapText(
				ctx,
				data.summary,
				contentWidth - textPadding * 2,
				designSystem.typography.sizes.base * designSystem.typography.lineHeights.relaxed,
			);
			const summaryCardHeight = Math.max(summaryResult.totalHeight + 100, 140);

			drawCard(ctx, contentPadding, yPos, contentWidth, summaryCardHeight, {
				backgroundColor: "#ffffff",
				shadow: true,
			});

			// 图标和标题
			ctx.fillStyle = designSystem.colors.text.primary;
			ctx.font = `${designSystem.typography.weights.bold} ${designSystem.typography.sizes.xl}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
			ctx.textAlign = "left";
			ctx.fillText("📖 作品概述", contentPadding + textPadding, yPos + 40);

			// 内容 - 修复行高和边距
			ctx.fillStyle = designSystem.colors.text.secondary;
			ctx.font = `${designSystem.typography.weights.normal} ${designSystem.typography.sizes.base}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;

			let textY = yPos + 80;
			summaryResult.lines.forEach((line) => {
				ctx.fillText(line, contentPadding + textPadding, textY);
				textY += designSystem.typography.sizes.base * designSystem.typography.lineHeights.relaxed;
			});

			yPos += summaryCardHeight + designSystem.spacing.xl;
		}

		// === 雷达图区域 ===
		if (data.dimensions.length > 0) {
			drawCard(ctx, contentPadding, yPos, contentWidth, 400, {
				backgroundColor: "#ffffff",
				shadow: true,
			});

			// 标题
			ctx.fillStyle = designSystem.colors.text.primary;
			ctx.font = `${designSystem.typography.weights.bold} ${designSystem.typography.sizes.xl}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
			ctx.textAlign = "left";
			ctx.fillText("📊 能力雷达", contentPadding + textPadding, yPos + 40);

			// 绘制雷达图
			drawRadarChart(ctx, canvas.width / 2, yPos + 220, 120, data.dimensions);

			yPos += 400 + designSystem.spacing.xl;
		}

		// === 优势区域 ===
		if (data.strengths.length > 0) {
			// 计算实际高度
			let strengthsContentHeight = 80; // 标题区域
			const strengthsItems: Array<{ text: string; lines: string[]; height: number }> = [];

			data.strengths.slice(0, 5).forEach((strength) => {
				ctx.font = `${designSystem.typography.weights.normal} ${designSystem.typography.sizes.base}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
				const result = wrapText(
					ctx,
					strength,
					contentWidth - textPadding * 2 - 40,
					designSystem.typography.sizes.base * designSystem.typography.lineHeights.normal,
				);
				const itemHeight = Math.max(result.totalHeight, 32);
				strengthsItems.push({
					text: strength,
					lines: result.lines,
					height: itemHeight,
				});
				strengthsContentHeight += itemHeight + 8; // 项目间距
			});

			const strengthsCardHeight = strengthsContentHeight + 20;

			drawCard(ctx, contentPadding, yPos, contentWidth, strengthsCardHeight, {
				backgroundColor: designSystem.colors.success[50],
				borderColor: designSystem.colors.success[100],
				borderWidth: 1,
				shadow: true,
			});

			// 标题
			ctx.fillStyle = designSystem.colors.text.primary;
			ctx.font = `${designSystem.typography.weights.bold} ${designSystem.typography.sizes.xl}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
			ctx.textAlign = "left";
			ctx.fillText("✨ 优势亮点", contentPadding + textPadding, yPos + 40);

			// 列表项
			let itemY = yPos + 80;
			strengthsItems.forEach((item) => {
				// 圆点
				ctx.fillStyle = designSystem.colors.success[500];
				ctx.beginPath();
				ctx.arc(contentPadding + textPadding + 8, itemY + 8, 3, 0, Math.PI * 2);
				ctx.fill();

				// 文字
				ctx.fillStyle = designSystem.colors.text.secondary;
				ctx.font = `${designSystem.typography.weights.normal} ${designSystem.typography.sizes.base}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;

				let lineY = itemY;
				item.lines.forEach((line) => {
					ctx.fillText(line, contentPadding + textPadding + 24, lineY + designSystem.typography.sizes.base);
					lineY += designSystem.typography.sizes.base * designSystem.typography.lineHeights.normal;
				});

				itemY += item.height + 8;
			});

			yPos += strengthsCardHeight + designSystem.spacing.xl;
		}

		// === 改进建议区域 ===
		if (data.improvements.length > 0) {
			// 计算实际高度
			let improvementsContentHeight = 80;
			const improvementsItems: Array<{ text: string; lines: string[]; height: number }> = [];

			data.improvements.slice(0, 5).forEach((improvement) => {
				ctx.font = `${designSystem.typography.weights.normal} ${designSystem.typography.sizes.base}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
				const result = wrapText(
					ctx,
					improvement,
					contentWidth - textPadding * 2 - 40,
					designSystem.typography.sizes.base * designSystem.typography.lineHeights.normal,
				);
				const itemHeight = Math.max(result.totalHeight, 32);
				improvementsItems.push({
					text: improvement,
					lines: result.lines,
					height: itemHeight,
				});
				improvementsContentHeight += itemHeight + 8;
			});

			const improvementsCardHeight = improvementsContentHeight + 20;

			drawCard(ctx, contentPadding, yPos, contentWidth, improvementsCardHeight, {
				backgroundColor: designSystem.colors.accent[50],
				borderColor: designSystem.colors.accent[100],
				borderWidth: 1,
				shadow: true,
			});

			// 标题
			ctx.fillStyle = designSystem.colors.text.primary;
			ctx.font = `${designSystem.typography.weights.bold} ${designSystem.typography.sizes.xl}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
			ctx.textAlign = "left";
			ctx.fillText("🎯 改进建议", contentPadding + textPadding, yPos + 40);

			// 列表项
			let itemY = yPos + 80;
			improvementsItems.forEach((item) => {
				// 圆点
				ctx.fillStyle = designSystem.colors.accent[500];
				ctx.beginPath();
				ctx.arc(contentPadding + textPadding + 8, itemY + 8, 3, 0, Math.PI * 2);
				ctx.fill();

				// 文字
				ctx.fillStyle = designSystem.colors.text.secondary;
				ctx.font = `${designSystem.typography.weights.normal} ${designSystem.typography.sizes.base}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;

				let lineY = itemY;
				item.lines.forEach((line) => {
					ctx.fillText(line, contentPadding + textPadding + 24, lineY + designSystem.typography.sizes.base);
					lineY += designSystem.typography.sizes.base * designSystem.typography.lineHeights.normal;
				});

				itemY += item.height + 8;
			});

			yPos += improvementsCardHeight + designSystem.spacing.xl;
		}

		// === 综合评价区域 ===
		if (data.overallAssessment) {
			// 计算实际需要的高度
			ctx.font = `${designSystem.typography.weights.normal} ${designSystem.typography.sizes.base}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
			const assessmentResult = wrapText(
				ctx,
				data.overallAssessment,
				contentWidth - textPadding * 2,
				designSystem.typography.sizes.base * designSystem.typography.lineHeights.relaxed,
			);
			const assessmentCardHeight = Math.max(assessmentResult.totalHeight + 100, 140);

			drawCard(ctx, contentPadding, yPos, contentWidth, assessmentCardHeight, {
				backgroundColor: "#ffffff",
				shadow: true,
			});

			// 标题
			ctx.fillStyle = designSystem.colors.text.primary;
			ctx.font = `${designSystem.typography.weights.bold} ${designSystem.typography.sizes.xl}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
			ctx.textAlign = "left";
			ctx.fillText("💬 综合评价", contentPadding + textPadding, yPos + 40);

			// 内容
			ctx.fillStyle = designSystem.colors.text.secondary;
			ctx.font = `${designSystem.typography.weights.normal} ${designSystem.typography.sizes.base}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;

			let textY = yPos + 80;
			assessmentResult.lines.forEach((line) => {
				ctx.fillText(line, contentPadding + textPadding, textY);
				textY += designSystem.typography.sizes.base * designSystem.typography.lineHeights.relaxed;
			});

			yPos += assessmentCardHeight + designSystem.spacing.xl;
		}
		// === 底部信息 ===
		ctx.fillStyle = designSystem.colors.text.muted;
		ctx.font = `${designSystem.typography.weights.normal} ${designSystem.typography.sizes.sm}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;
		ctx.textAlign = "center";
		ctx.fillText("作家战力分析系统", canvas.width / 2, canvas.height - 60);
		ctx.fillText("ink-battles.rikki.top", canvas.width / 2, canvas.height - 30);

		// 下载图片
		try {
			const link = document.createElement("a");
			link.download = `作家战力分析报告-${data.overallScore}分.png`;
			link.href = canvas.toDataURL("image/png", 0.95);
			link.click();
			toast.success("分析报告已生成并下载！");
		} catch (error) {
			console.error("生成图片失败:", error);
			toast.error("生成图片失败，请重试");
		}
	};

	return (
		<>
			<button
				type="button"
				onClick={generateImage}
				className="text-sm text-white font-medium px-4 py-2 rounded-md bg-green-600 inline-flex w-full items-center justify-center hover:bg-green-700"
			>
				<Download className="mr-2 h-4 w-4" />
				生成分析报告
			</button>
			<canvas
				ref={canvasRef}
				className="hidden"
				width={800}
				height={calculateCanvasHeight()}
			/>
		</>
	);
}
