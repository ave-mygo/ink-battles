"use client";

import type { MermaidDiagram } from "@/types/ai";
import { usePathname } from "next/navigation";
import MermaidDiagrams from "@/components/layouts/WriterPage/MermaidDiagram";

interface MermaidDiagramsSectionProps {
	diagrams: MermaidDiagram[];
}

/**
 * Mermaid 图表展示部分
 */
export function MermaidDiagramsSection({ diagrams }: MermaidDiagramsSectionProps) {
	const pathname = usePathname();

	if (diagrams.length === 0) {
		return null;
	}

	const diagramsSignature = diagrams.map(diagram => `${diagram.type}:${diagram.title}:${diagram.code}`).join("|");

	return <MermaidDiagrams key={`${pathname}:${diagramsSignature}`} diagrams={diagrams} />;
}
