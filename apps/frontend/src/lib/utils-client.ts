"use client";

/**
 * 计算最终战力值并四舍五入到最多 2 位小数
 * @param parsedResult - 包含 dimensions 数组的解析结果
 * @param parsedResult.dimensions - 分析维度数组
 * @returns 最终得分（number），最多保留两位小数
 */
export const calculateFinalScore = (parsedResult: {
  /** 分析维度数组 */
  dimensions: Array<{
    /** 维度名称 */
    name: string;
    /** 维度得分 (0-5) */
    score: number;
    /** 维度详细描述 */
    description?: string;
  }>;
}): number => {
  if (!parsedResult.dimensions || !Array.isArray(parsedResult.dimensions)) {
    return 0;
  }

  // 提取经典性和新锐性（只要名字包含关键字即可）
  const classicityDimension = parsedResult.dimensions.find(d =>
    d.name.includes("经典"),
  );
  const noveltyDimension = parsedResult.dimensions.find(d =>
    d.name.includes("新锐"),
  );

  // 计算基础得分（排除掉经典性和新锐性维度）
  const baseDimensions = parsedResult.dimensions.filter(
    d => !d.name.includes("经典") && !d.name.includes("新锐"),
  );

  // 检查基础分触发条件（保底机制）
  // 条件一：≥ 6 个基础维度的原始评分 > 3.5
  const countAbove35 = baseDimensions.filter(d => d.score > 3.5).length;
  // 条件二：≥ 3 个基础维度的原始评分 > 4.0
  const countAbove40 = baseDimensions.filter(d => d.score > 4.0).length;

  const MIN_DIMENSION_SCORE = 3;
  const shouldTriggerFloor = countAbove35 >= 6 || countAbove40 >= 3;

  if (shouldTriggerFloor) {
    // 构建触发原因描述
    const triggerReasons: string[] = [];
    if (countAbove35 >= 6)
      triggerReasons.push(`${countAbove35}个维度超过3.5分`);
    if (countAbove40 >= 3)
      triggerReasons.push(`${countAbove40}个维度超过4分`);
    const triggerInfo = `保底机制已触发（${triggerReasons.join("，")}）`;

    // 修正或标记每个基础维度
    for (const dimension of baseDimensions) {
      // 检查是否已经处理过（避免重复）
      if ((dimension as any).floorTriggered) {
        continue;
      }
      (dimension as any).floorTriggered = true;

      if (dimension.score < MIN_DIMENSION_SCORE) {
        // 低于3分的维度：修正分数并标记
        const originalScore = dimension.score;
        (dimension as any).originalScore = originalScore;
        dimension.score = MIN_DIMENSION_SCORE;
        const explanation = `${triggerInfo}，原始分${originalScore}分修正为3分`;
        if (dimension.description) {
          dimension.description = `${dimension.description}（${explanation}）`;
        } else {
          dimension.description = explanation;
        }
      } else if (dimension.score === MIN_DIMENSION_SCORE) {
        // 恰好3分的维度：标记已受保底机制保护
        const note = `${triggerInfo}，本维度评分恰好达到保底线，无需修正`;
        if (dimension.description) {
          dimension.description = `${dimension.description}（${note}）`;
        } else {
          dimension.description = note;
        }
      }
      // 高于3分的维度：无需标记
    }
  }

  // 重新计算基础分（使用修正后的分数）
  const correctedBaseScore = baseDimensions.reduce(
    (sum: number, dimension: { score: number }) => {
      return sum + (dimension.score || 0);
    },
    0,
  );

  // 获取权重（默认 1.0）
  const classicityWeight = classicityDimension?.score || 1.0;
  const noveltyWeight = noveltyDimension?.score || 1.0;

  // 计算最终战力值
  const finalScore = correctedBaseScore * classicityWeight * noveltyWeight;

  // 四舍五入到最多 2 位小数
  if (!Number.isFinite(finalScore)) {
    return 0;
  }
  const rounded = Math.round(finalScore * 100) / 100;

  return rounded;
};
