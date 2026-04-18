"use client";

import { createClientEden } from "@/utils/api/eden-client";
import { getClientApiHost } from "@/utils/api/eden-common";
import { normalizeEdenResult } from "@/utils/api/eden-response";

export interface AnalysisTaskProgress {
	stage: "queued" | "validating" | "searching" | "analyzing" | "finalizing" | "completed" | "failed" | "cancelled";
	message: string;
	percent: number;
	chunkCount?: number;
	contentLength?: number;
	updatedAt: string;
}

export interface AnalysisTaskValidation {
	success: boolean;
	message: string;
	checkedAt: string;
}

export interface SubmitAnalysisInput {
	articleText: string;
	mode: string;
	modelId: string;
	fingerprint: string;
	searchModel?: "none" | "gemini" | "gemini-lite";
}

export async function submitAnalysis(input: SubmitAnalysisInput) {
	const response = await createClientEden().api.v2.analysis.tasks.post(input);
	return normalizeEdenResult<{ success: boolean; taskId?: string; status?: string; error?: string; progress?: AnalysisTaskProgress }>(
		response.data,
		response.error,
		"提交分析任务失败",
	);
}

export async function getAnalysisStatus(taskId: string) {
	const response = await createClientEden().api.v2.analysis.tasks({ taskId }).get();
	return normalizeEdenResult<{
		success: boolean;
		status?: string;
		error?: string;
		resultId?: string;
		progress?: AnalysisTaskProgress;
		validation?: AnalysisTaskValidation;
	}>(response.data, response.error, "加载任务状态失败");
}

export async function deleteAnalysisTask(taskId: string) {
	const response = await createClientEden().api.v2.analysis.tasks({ taskId }).delete();
	return normalizeEdenResult<{ success: boolean; error?: string }>(response.data, response.error, "删除任务失败");
}

export async function cancelAnalysisTask(taskId: string) {
	const response = await createClientEden().api.v2.rpc["analysis.cancelTask"].post({ taskId });
	return normalizeEdenResult<{ success: boolean; status?: string; error?: string }>(response.data, response.error, "取消任务失败");
}

export const openAnalysisStatusStream = (
	taskId: string,
	handlers: {
		onSnapshot: (payload: {
			success: boolean;
			status?: string;
			error?: string;
			resultId?: string;
			progress?: AnalysisTaskProgress;
			validation?: AnalysisTaskValidation;
		}) => void;
		onError?: () => void;
		onEnd?: () => void;
	},
) => {
	const source = new EventSource(`${getClientApiHost()}/api/v2/analysis/tasks/${taskId}/events`, { withCredentials: true });
	source.addEventListener("snapshot", (event) => {
		handlers.onSnapshot(JSON.parse((event as MessageEvent).data));
	});
	source.addEventListener("end", () => {
		handlers.onEnd?.();
		source.close();
	});
	source.onerror = () => {
		handlers.onError?.();
	};
	return source;
};
