"use client";

import type { MermaidDiagram } from "@/types/callback/ai";
import MermaidDiagrams from "@/components/layouts/WriterPage/MermaidDiagram";

interface MermaidDiagramsSectionProps {
	diagrams: MermaidDiagram[];
}

/**
 * Mermaid 图表展示部分
 */
export function MermaidDiagramsSection({ diagrams }: MermaidDiagramsSectionProps) {
	if (diagrams.length === 0) {
		return null;
	}

	return <MermaidDiagrams diagrams={diagrams} />;
}
