/**
 * Jina Search API 返回结果类型
 */
export interface JinaSearchResponse {
	code: number;
	status: number;
	data: JinaSearchArticle[];
	meta: {
		usage: {
			tokens: number;
		};
	};
}
interface JinaSearchArticle {
	title: string;
	url: string;
	description: string;
	date: string;
	content: string;
	usage: {
		tokens: number;
	};
}
