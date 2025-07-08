"use server";

import { db_insert, db_read } from "@/lib/db";

import "server-only";

export const db_insert_token = async (): Promise<string> => {
	const token = Math.random().toString(36).substring(2, 36) + Math.random().toString(36).substring(2, 36);
	await db_insert("ink_battles", "tokens", { token });
	return token;
};

export async function getScorePercentile(currentScore: number) {
	try {
		const scores = await db_read("ink_battles", "analysis_requests", {}, { sort: { overallScore: -1 } });
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
// export async function getScorePercentile(currentScore: number) {
