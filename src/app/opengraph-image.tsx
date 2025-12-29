/* eslint-disable react-refresh/only-export-components */
import { ImageResponse } from "next/og";

/**
 * OpenGraph 图片生成器
 * 用于社交媒体分享和搜索引擎预览
 *
 * Note: 这些导出是 Next.js OpenGraph Image API 的要求
 * Fast Refresh 警告可以安全忽略
 */

export const runtime = "edge";
export const alt = "作家战力分析系统 - 基于AI的专业文本分析工具";
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = "image/png";

export default async function Image() {
	return new ImageResponse(
		<div
			style={{
				fontSize: 64,
				background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				color: "white",
				fontFamily: "sans-serif",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					marginBottom: 24,
				}}
			>
				<span style={{ marginLeft: 20, fontWeight: "bold" }}>作家战力分析系统</span>
			</div>
			<div
				style={{
					fontSize: 32,
					opacity: 0.9,
					textAlign: "center",
					maxWidth: 900,
				}}
			>
				基于AI技术的专业文本分析工具
			</div>
			<div
				style={{
					fontSize: 24,
					opacity: 0.8,
					marginTop: 20,
				}}
			>
				为您的创作提供深度洞察
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
		},
	);
}
