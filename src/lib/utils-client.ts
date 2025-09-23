"use client";

export const calculateFinalScore = (parsedResult: any): number => {
	if (!parsedResult.dimensions || !Array.isArray(parsedResult.dimensions)) {
		return 0;
	}

	// 提取经典性和新锐性（只要名字包含关键字即可）
	const classicityDimension = parsedResult.dimensions.find((d: any) => d.name.includes("经典"));
	const noveltyDimension = parsedResult.dimensions.find((d: any) => d.name.includes("新锐"));

	// 计算基础得分（排除掉经典性和新锐性维度）
	const baseDimensions = parsedResult.dimensions.filter(
		(d: any) => !d.name.includes("经典") && !d.name.includes("新锐"),
	);
	const baseScore = baseDimensions.reduce((sum: number, dimension: any) => {
		return sum + (dimension.score || 0);
	}, 0);

	// 获取权重（默认 1.0）
	const classicityWeight = classicityDimension?.score || 1.0;
	const noveltyWeight = noveltyDimension?.score || 1.0;

	// 计算最终战力值
	const finalScore = baseScore * classicityWeight * noveltyWeight;

	return finalScore;
};
