import React from "react";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import JsonLd from "./JsonLd";

interface BreadcrumbItem {
	name: string;
	url: string;
}

interface BreadcrumbJsonLdProps {
	items: BreadcrumbItem[];
}

/** BreadcrumbList JSON-LD 封装组件 */
export const BreadcrumbJsonLd = ({ items }: BreadcrumbJsonLdProps) => {
	if (!items?.length)
		return null;
	return <JsonLd schema={buildBreadcrumbJsonLd(items)} />;
};

export default BreadcrumbJsonLd;
