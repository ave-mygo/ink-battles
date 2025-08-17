"use server";

import { db_name } from "@/lib/constants";
import { db_read } from "@/lib/db";
import "server-only";

export async function getScorePercentile(currentScore: number) {
	try {
		const scores = await db_read(db_name, "analysis_requests", {}, { sort: { overallScore: -1 } });
		const totalScores = scores.length;
		if (totalScores === 0)
			return null;

		const higherScores = scores.filter(s => s.overallScore <= currentScore).length;
		const percentile = ((higherScores / totalScores) * 100).toFixed(1);
		return percentile;
	} catch (error) {
		console.error("Error calculating percentile:", error);
		return null;
	}
}
