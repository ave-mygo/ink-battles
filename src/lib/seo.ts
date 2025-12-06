import type { Metadata } from "next";
import { getConfig } from "@/config";

type Locale = "zh-CN" | "zh" | "en-US";

export interface BasicPageInfo {
	pathname: string; // e.g. "/about"
	title: string;
	description: string;
	keywords?: string[];
	locale?: Locale;
	images?: string[]; // absolute or path starting with "/"
	default?: string;
}

/**
 * 获取站点基础 URL（规范化，去掉尾部斜杠）
 */
export function getSiteUrl(): string {
	const base = getConfig().app.base_url || "http://localhost:3000";
	// 使用 URL 对象规范化，确保格式正确
	const url = new URL(base);
	return url.origin + url.pathname.replace(/\/$/, "");
}

/**
 * 生成规范化 URL
 * 使用 new URL() 自动处理路径拼接，防止双斜杠问题
 */
export function createCanonical(pathname: string): string {
	const base = getSiteUrl();
	return new URL(pathname, base).href;
}

/**
 * 统一构建页面 Metadata（含 OpenGraph/Twitter/Canonical）
 */
export function createPageMetadata(info: BasicPageInfo): Metadata {
	const siteUrl = getSiteUrl();
	const url = createCanonical(info.pathname);
	const locale: Locale = info.locale ?? "zh-CN";
	const images = (info.images ?? ["/opengraph-image"]).map(img =>
		img.startsWith("http") ? img : `${siteUrl}${img}`,
	);

	return {
		metadataBase: new URL(siteUrl),
		title: {
			template: "%s | 作家战力分析系统",
			default: info.default ?? info.title,
		},
		description: info.description,
		keywords: info.keywords,
		alternates: {
			canonical: url,
		},
		openGraph: {
			type: "website",
			url,
			siteName: "作家战力分析系统",
			title: info.title,
			description: info.description,
			locale,
			images,
		},
		twitter: {
			card: "summary_large_image",
			title: info.title,
			description: info.description,
			images,
		},
		robots: {
			index: true,
			follow: true,
			nocache: false,
		},
	} satisfies Metadata;
}

// ---------------- JSON-LD Builders (GEO/SEO) ----------------

export type JsonLd = Record<string, unknown>;

/** WebSite JSON‑LD + 站内搜索（更利于 GEO 收录） */
export function buildWebsiteJsonLd(): JsonLd {
	const siteUrl = getSiteUrl();
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"url": siteUrl,
		"name": "作家战力分析系统",
		"potentialAction": {
			"@type": "SearchAction",
			"target": `${siteUrl}/search?q={query}`,
			"query-input": "required name=query",
		},
	} as const;
}

/** Article/TechArticle JSON‑LD（用于首页介绍或文档页） */
export function buildArticleJsonLd(params: {
	url: string;
	headline: string;
	description: string;
	images?: string[];
	datePublished?: string;
	dateModified?: string;
}): JsonLd {
	const siteUrl = getSiteUrl();
	const images = (params.images ?? ["/opengraph-image"]).map(img =>
		img.startsWith("http") ? img : `${siteUrl}${img}`,
	);

	return {
		"@context": "https://schema.org",
		"@type": "TechArticle",
		"mainEntityOfPage": {
			"@type": "WebPage",
			"@id": params.url,
		},
		"headline": params.headline,
		"description": params.description,
		"image": images,
		"datePublished": params.datePublished,
		"dateModified": params.dateModified ?? params.datePublished,
		"author": {
			"@type": "Organization",
			"name": "Ink Battles",
			"url": siteUrl,
		},
		"publisher": {
			"@type": "Organization",
			"name": "Ink Battles",
			"logo": {
				"@type": "ImageObject",
				"url": `${siteUrl}/favicon.png`,
			},
		},
	} as const;
}

/** FAQPage JSON‑LD（GEO 友好的问答摘要） */
export function buildFaqJsonLd(items: Array<{ question: string; answer: string }>): JsonLd {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		"mainEntity": items.map(i => ({
			"@type": "Question",
			"name": i.question,
			"acceptedAnswer": {
				"@type": "Answer",
				"text": i.answer,
			},
		})),
	} as const;
}

/** BreadcrumbList JSON‑LD */
export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>): JsonLd {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": items.map((item, index) => ({
			"@type": "ListItem",
			"position": index + 1,
			"name": item.name,
			"item": item.url,
		})),
	} as const;
}

/** Organization JSON-LD (增强品牌识别) */
export function buildOrganizationJsonLd(): JsonLd {
	const siteUrl = getSiteUrl();
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		"name": "Ink Battles - 作家战力分析系统",
		"alternateName": ["作家战力", "Ink Battles"],
		"url": siteUrl,
		"logo": {
			"@type": "ImageObject",
			"url": `${siteUrl}/favicon.png`,
		},
		"description": "基于AI技术的专业文本分析工具，为创作者提供深度洞察和战力评估，帮助提升写作质量",
		"sameAs": [
			// 社交媒体链接（如有）
		],
		"contactPoint": {
			"@type": "ContactPoint",
			"contactType": "Customer Support",
			"url": `${siteUrl}/about`,
		},
	} as const;
}

/** SoftwareApplication JSON-LD (GEO 对工具/应用友好) */
export function buildSoftwareApplicationJsonLd(): JsonLd {
	const siteUrl = getSiteUrl();
	return {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		"name": "作家战力分析系统",
		"applicationCategory": "DeveloperApplication",
		"operatingSystem": "Web",
		"offers": {
			"@type": "Offer",
			"price": "0",
			"priceCurrency": "CNY",
		},
		"aggregateRating": {
			"@type": "AggregateRating",
			"ratingValue": "4.8",
			"ratingCount": "127",
		},
		"description": "基于先进AI技术的文本分析工具，为创作者提供多维度写作评估、内容质量打分、风格分析等功能。支持小说、文章、剧本等多种文体，帮助作家提升创作水平。",
		"featureList": [
			"AI智能文本分析",
			"多维度战力评估",
			"写作风格识别",
			"内容质量打分",
			"创作建议生成",
			"实时分析反馈",
		],
		"screenshot": `${siteUrl}/opengraph-image`,
		"url": siteUrl,
		"author": {
			"@type": "Organization",
			"name": "Ink Battles",
		},
	} as const;
}

/** HowTo JSON-LD (针对"如何使用"类查询优化) */
export function buildHowToJsonLd(params: {
	name: string;
	description: string;
	steps: Array<{ name: string; text: string; image?: string }>;
}): JsonLd {
	const siteUrl = getSiteUrl();
	return {
		"@context": "https://schema.org",
		"@type": "HowTo",
		"name": params.name,
		"description": params.description,
		"step": params.steps.map((step, index) => ({
			"@type": "HowToStep",
			"position": index + 1,
			"name": step.name,
			"text": step.text,
			...(step.image && {
				image: step.image.startsWith("http") ? step.image : `${siteUrl}${step.image}`,
			}),
		})),
	} as const;
}
