import * as React from "react";

interface JsonLdProps {
	schema: Record<string, unknown>;
}

/**
 * Server Component: 注入 JSON-LD 结构化数据
 * - 放在页面 JSX 中即可（Next App Router 会正确注入到文档）
 */
export const JsonLd = ({ schema }: JsonLdProps) => {
	const json = JSON.stringify(schema);
	return (
		<script
			type="application/ld+json"
			// 仅用于注入可信的结构化数据（来自静态构建器，无用户输入）
			// eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
			dangerouslySetInnerHTML={{ __html: json }}
		/>
	);
};

export default JsonLd;
