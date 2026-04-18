import type { ObjectId } from "mongodb";
import { COLLECTIONS, updateOne } from "../db/mongo";

export type AnalysisStage
	= | "queued"
		| "validating"
		| "searching"
		| "analyzing"
		| "finalizing"
		| "completed"
		| "failed"
		| "cancelled";

export interface AnalysisProgress {
	stage: AnalysisStage;
	message: string;
	percent: number;
	chunkCount?: number;
	contentLength?: number;
	updatedAt: string;
}

export const createProgress = (
	stage: AnalysisStage,
	message: string,
	percent: number,
	extra: Partial<Pick<AnalysisProgress, "chunkCount" | "contentLength">> = {},
): AnalysisProgress => ({
	stage,
	message,
	percent,
	updatedAt: new Date().toISOString(),
	...extra,
});

export const updateTaskProgress = async (
	taskId: ObjectId,
	progress: AnalysisProgress,
	status?: "pending" | "processing" | "completed" | "failed" | "cancelled",
) => {
	await updateOne(COLLECTIONS.analysisTasks, { _id: taskId }, {
		...(status ? { status } : {}),
		progress,
		updatedAt: progress.updatedAt,
	});
};

export const estimateStreamingPercent = (chunkCount: number, contentLength: number): number => {
	const chunkProgress = Math.min(28, Math.floor(chunkCount / 8) * 2);
	const contentProgress = Math.min(20, Math.floor(contentLength / 2400) * 2);
	return Math.min(93, 45 + chunkProgress + contentProgress);
};
