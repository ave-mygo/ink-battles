/**
 * Mermaid 图表类型定义
 * 用于可视化作品的结构和逻辑关系
 */
export interface MermaidDiagram {
	/** 图表类型 (如 graph, flowchart 等) */
	type: string;
	/** 图表标题 (简短描述该图表展示的内容) */
	title: string;
	/** Mermaid 图表代码 (纯文本，使用分号分隔) */
	code: string;
}

/**
 * 分析维度类型定义
 * 用于描述每个维度的详细信息
 */
export interface AnalysisDimension {
	/** 维度名称 */
	name: string;
	/** 维度得分 (0-5) */
	score: number;
	/** 维度详细描述 */
	description: string;
}

/**
 * 基础AI分析结果接口
 * 用于前端组件展示的核心数据结构
 */
export interface AnalysisResult {
	/** 总体得分 */
	overallScore: number;
	/** 文章标题/名称 */
	title: string;
	/** 评级标签 (如 S+, A, B 等) */
	ratingTag: string;
	/** 最终总结性标签 (一句话精准概括文章核心特质与价值定位) */
	finalTag: string;
	/** 总体评估描述 */
	overallAssessment: string;
	/** 作品概要 */
	summary: string;
	/** 标签列表 */
	tags: string[];
	/** 各维度分析结果 */
	dimensions: AnalysisDimension[];
	/** 优点列表 */
	strengths: string[];
	/** 改进建议列表 */
	improvements: string[];
	/** Mermaid 图表列表 (可视化作品结构和逻辑) */
	mermaid_diagrams?: MermaidDiagram[];
}

/**
 * AI分析输入参数类型
 */
export interface AnalysisInput {
	/** 文章文本内容 */
	articleText: string;
	/** 分析模式 */
	mode: string;
	/** 搜索相关信息 */
	search?: {
		/** 搜索结果总结 */
		searchResults?: string;
		/** 搜索使用的网页列表 */
		searchWebPages?: Array<{ uri: string; title?: string }>;
	};
}

/**
 * AI分析输出结果类型
 * 对应API返回的完整结构
 */
export interface AnalysisOutput {
	/** AI返回的完整分析结果 */
	result: string;
	/** 总体得分 */
	overallScore: number;
	/** 标签列表 */
	tags: string[];
	/** 使用的AI模型名称 */
	modelName?: string;
}
