import { buildArticleJsonLd } from "@/lib/seo";
import JsonLd from "./JsonLd";

interface ArticleJsonLdProps {
	url: string;
	headline: string;
	description: string;
	images?: string[];
	datePublished?: string;
	dateModified?: string;
}

/**
 * Article / TechArticle JSON-LD 组件封装
 * - 用于页面主文章或功能描述（首页、文档、关于页等）
 * - 仅传入核心字段，内部调用 builder
 */
export const ArticleJsonLd = (props: ArticleJsonLdProps) => {
	return <JsonLd schema={buildArticleJsonLd(props)} />;
};

export default ArticleJsonLd;
