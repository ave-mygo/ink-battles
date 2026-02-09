import * as React from "react";
import { buildFaqJsonLd } from "@/lib/seo";
import JsonLd from "./JsonLd";

export interface FaqItem {
	question: string;
	answer: string;
}

interface FaqJsonLdProps {
	items: FaqItem[];
}

/** FAQPage JSON-LD 封装组件 */
export const FaqJsonLd = ({ items }: FaqJsonLdProps) => {
	if (!items?.length)
		return null;
	return <JsonLd schema={buildFaqJsonLd(items)} />;
};

export default FaqJsonLd;
