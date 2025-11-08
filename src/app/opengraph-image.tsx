/* eslint react-refresh/only-export-components: off */
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
	const title = "作家战力分析系统";
	const sub = "AI 驱动的专业文本分析";

	return new ImageResponse(
		(
		// 简洁无外部字体，减少冷启动
			<div
				style={{
					width: "1200px",
					height: "630px",
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-start",
					justifyContent: "center",
					background: "linear-gradient(135deg, #0f172a, #1e293b)",
					color: "white",
					padding: "64px",
				}}
			>
				<div
					style={{
						fontSize: 60,
						fontWeight: 800,
						lineHeight: 1.2,
					}}
				>
					{title}
				</div>
				<div style={{ fontSize: 28, marginTop: 16, opacity: 0.92 }}>{sub}</div>
				<div style={{ fontSize: 20, marginTop: 24, opacity: 0.7 }}>
					即时评估 · 结构化建议 · GEO 优化
				</div>
			</div>
		),
		{ ...size },
	);
}
