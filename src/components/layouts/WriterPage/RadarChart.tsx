import * as React from "react";

interface RadarChartProps {
	/** 维度标签 */
	labels: string[];
	/** 归一化后的分数，范围 0..5 */
	values: number[];
	/** 图表尺寸（像素） */
	size?: number;
	/** 网格层数（默认 5 层对应 5 分制） */
	levels?: number;
}

/**
 * RadarChart 雷达图（轻量 SVG 实现）
 * - 输入 values 需已按 0..5 归一化
 * - 支持自适应标签与多层网格
 */
export const RadarChart: React.FC<RadarChartProps> = ({ labels, values, size = 220, levels = 5 }) => {
	const numAxes = labels.length;
	const center = size / 2;
	const radius = (size / 2) - 24; // 留出边距给标签

	const angleFor = (index: number) => (Math.PI * 2 * index) / numAxes - Math.PI / 2;

	const pointFor = (index: number, valueOnFiveScale: number) => {
		const ratio = Math.max(0, Math.min(5, valueOnFiveScale)) / 5;
		const a = angleFor(index);
		const r = radius * ratio;
		return {
			x: center + r * Math.cos(a),
			y: center + r * Math.sin(a),
		};
	};

	const polygonPoints = values.map((v, i) => pointFor(i, v)).map(p => `${p.x},${p.y}`).join(" ");

	return (
		<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
			{/* 网格层 */}
			{Array.from({ length: levels }).map((_, levelIdx) => {
				const levelValue = (levelIdx + 1) * (5 / levels);
				const points = labels.map((_, i) => pointFor(i, levelValue))
					.map(p => `${p.x},${p.y}`)
					.join(" ");
				return (
					<polygon
						key={levelIdx}
						points={points}
						fill="none"
						stroke="rgba(148, 163, 184, 0.4)" /* slate-400/40 for light, will be overridden by CSS */
						strokeWidth={1}
						className="stroke-slate-400/40 dark:stroke-slate-600/60"
					/>
				);
			})}

			{/* 轴线 */}
			{labels.map((_, i) => {
				const { x, y } = pointFor(i, 5);
				return (
					<line
						key={`axis-${i}`}
						x1={center}
						y1={center}
						x2={x}
						y2={y}
						stroke="rgba(148, 163, 184, 0.5)"
						strokeWidth={1}
						className="stroke-slate-400/50 dark:stroke-slate-600/70"
					/>
				);
			})}

			{/* 数据区 */}
			<polygon
				points={polygonPoints}
				fill="rgba(59, 130, 246, 0.25)" /* blue-500/25 */
				stroke="rgba(59, 130, 246, 0.9)" /* blue-500/90 */
				strokeWidth={2}
				className="fill-blue-500/25 stroke-blue-500/90 dark:fill-blue-400/30 dark:stroke-blue-400/90"
			/>

			{/* 顶点标记 */}
			{values.map((v, i) => {
				const { x, y } = pointFor(i, v);
				return <circle key={`dot-${i}`} cx={x} cy={y} r={3} fill="rgb(59, 130, 246)" className="fill-blue-500 dark:fill-blue-400" />;
			})}

			{/* 标签 */}
			{labels.map((label, i) => {
				const { x, y } = pointFor(i, 5.35); // 标签放在圆外一点
				return (
					<text
						key={`label-${i}`}
						x={x}
						y={y}
						textAnchor="middle"
						dominantBaseline="middle"
						className="text-[10px] fill-slate-600 dark:fill-slate-300"
					>
						{label}
					</text>
				);
			})}
		</svg>
	);
};
