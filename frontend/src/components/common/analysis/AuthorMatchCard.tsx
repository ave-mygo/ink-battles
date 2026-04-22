"use client";

import type { AuthorStyleMatch } from "@ink-battles/shared/types/ai";
import { Feather, Scale } from "lucide-react";

interface AuthorMatchCardProps {
	matches?: unknown;
}

/**
 * 展示 AI 返回的作者风格参照结果。
 *
 * 这里不在前端重新推断作者，避免 UI 逻辑覆盖模型基于原文和完整报告做出的判断。
 */
export function AuthorMatchCard({ matches = [] }: AuthorMatchCardProps) {
	const visibleMatches = normalizeAuthorMatches(matches);

	if (visibleMatches.length === 0) {
		return null;
	}

	return (
		<div>
			<h4 className="text-emerald-700 font-medium mb-2 flex gap-2 items-center dark:text-emerald-300">
				<Feather className="h-4 w-4" />
				你的创作最像哪位作者
			</h4>
			<p className="text-xs text-slate-500 mb-3 dark:text-slate-400">
				由 AI 基于原文风格和完整评测生成，只作为风格参照，不代表作者归属判断。
			</p>
			<div className="space-y-3">
				{visibleMatches.map(match => (
					<div key={match.name} className="p-3 border border-slate-200 rounded-lg bg-slate-50/80 space-y-2 dark:border-slate-800 dark:bg-slate-900/50">
						<div className="flex gap-3 items-start justify-between">
							<div>
								<h5 className="text-sm text-slate-900 font-semibold dark:text-slate-100">{match.name}</h5>
								<p className="text-xs text-emerald-700 font-medium dark:text-emerald-300">{match.styleLabel}</p>
							</div>
							<div className="text-xs text-slate-600 px-2 py-1 border border-slate-200 rounded-md bg-white shrink-0 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800">
								{clampConfidence(match.confidence)}
								%
							</div>
						</div>
						{match.description && (
							<p className="text-xs text-slate-600 leading-relaxed dark:text-slate-300">{match.description}</p>
						)}
						<div className="space-y-1">
							<div className="text-xs text-slate-500 font-medium flex gap-1.5 items-center dark:text-slate-400">
								<Scale className="h-3.5 w-3.5" />
								AI 选择依据
							</div>
							<ul className="space-y-1">
								{match.reasons.slice(0, 3).map(reason => (
									<li key={reason} className="text-xs text-slate-500 flex gap-2 dark:text-slate-400">
										<span className="text-emerald-500 shrink-0">•</span>
										<span>{reason}</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * 将历史数据或模型异常返回值归一化为可展示列表。
 */
function normalizeAuthorMatches(matches: unknown): AuthorStyleMatch[] {
	if (!Array.isArray(matches)) {
		return [];
	}

	return matches
		.filter(isAuthorStyleMatch)
		.slice(0, 3);
}

/**
 * 运行时校验作者匹配项，确保旧报告或脏数据不会让结果页崩溃。
 */
function isAuthorStyleMatch(match: unknown): match is AuthorStyleMatch {
	if (!match || typeof match !== "object") {
		return false;
	}

	const candidate = match as Partial<AuthorStyleMatch>;

	return Boolean(
		candidate.name
		&& candidate.styleLabel
		&& typeof candidate.confidence === "number"
		&& Array.isArray(candidate.reasons)
		&& candidate.reasons.length > 0,
	);
}

/**
 * 归一化模型返回的置信度，避免异常值破坏展示。
 */
function clampConfidence(confidence: number): number {
	if (!Number.isFinite(confidence)) {
		return 0;
	}

	return Math.min(100, Math.max(0, Math.round(confidence)));
}
