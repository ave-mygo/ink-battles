"use client";

import type { ReactNode } from "react";
import { useState } from "react";

interface FAQItem {
	question: string;
	answer: string | ReactNode;
}

interface FAQSectionProps {
	items: FAQItem[];
	className?: string;
}

export function FAQSection({ items, className = "" }: FAQSectionProps) {
	// 改为用 Set 记录所有展开的条目索引
	const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set());

	const toggleItem = (index: number) => {
		setOpenIndexes((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(index)) {
				newSet.delete(index);
			} else {
				newSet.add(index);
			}
			return newSet;
		});
	};

	// 处理字符串换行，替换为 <br />
	const renderAnswer = (answer: string | ReactNode) => {
		if (typeof answer === "string") {
			return answer.split("\n").map((line, idx, arr) => (
				<span key={idx}>
					{line}
					{idx < arr.length - 1 && (
						<>
							<br />
							<br />
						</>
					)}
				</span>
			));
		}
		return answer;
	};

	return (
		<section className={`faq-section ${className}`}>
			<h2 className="text-3xl font-bold mb-8 text-center">常见问题</h2>
			<div className="mx-auto max-w-3xl space-y-4">
				{items.map((item, index) => (
					<div
						key={index}
						className="border rounded-lg bg-white shadow-sm overflow-hidden dark:bg-slate-800"
					>
						<button
							type="button"
							className="font-semibold px-6 py-4 text-left flex w-full transition-colors items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700"
							onClick={() => toggleItem(index)}
							aria-expanded={openIndexes.has(index)}
						>
							<span>{item.question}</span>
							<svg
								className={`h-5 w-5 transition-transform ${
									openIndexes.has(index) ? "rotate-180" : ""
								}`}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{openIndexes.has(index) && (
							<div className="px-6 py-4 border-t dark:border-slate-700">
								<div className="text-slate-600 dark:text-slate-300">
									{renderAnswer(item.answer)}
								</div>
							</div>
						)}
					</div>
				))}
			</div>
		</section>
	);
}
