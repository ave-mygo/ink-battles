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
	// 生成一个唯一的ID，防止页面上有多个图表时渐变ID冲突
	const chartId = React.useId().replace(/:/g, "");

	return (
		<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto overflow-visible">
			<defs>
				<linearGradient id={`${chartId}-radar-gradient`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
					<stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
				</linearGradient>
				<filter id={`${chartId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="2" result="blur" />
					<feComposite in="SourceGraphic" in2="blur" operator="over" />
				</filter>
			</defs>

			{/* 网格层 - 使用圆形网格看起来更现代，或者保持多边形但优化样式 */}
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
						stroke="currentColor"
						strokeWidth={1}
						strokeDasharray="4 4"
						className="text-slate-200 dark:text-slate-700/50"
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
						stroke="currentColor"
						strokeWidth={1}
						className="text-slate-200 dark:text-slate-700/50"
					/>
				);
			})}

			{/* 数据区 */}
			<polygon
				points={polygonPoints}
				fill={`url(#${chartId}-radar-gradient)`}
				stroke="rgb(59, 130, 246)"
				strokeWidth={2}
				className="drop-shadow-sm"
			/>

			{/* 顶点标记 */}
			{values.map((v, i) => {
				const { x, y } = pointFor(i, v);
				return (
					<g key={`dot-${i}`}>
						<circle
							cx={x}
							cy={y}
							r={4}
							fill="white"
							stroke="rgb(59, 130, 246)"
							strokeWidth={2}
							className="dark:fill-slate-900"
						/>
					</g>
				);
			})}

			{/* 标签 */}
			{labels.map((label, i) => {
				const { x, y } = pointFor(i, 5.6); // 稍微往外移一点，给点空间
				return (
					<text
						key={`label-${i}`}
						x={x}
						y={y}
						textAnchor="middle"
						dominantBaseline="middle"
						className="text-[10px] fill-slate-600 dark:fill-slate-200"
					>
						{label}
					</text>
				);
			})}
		</svg>
	);
};
