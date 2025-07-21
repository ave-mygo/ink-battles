"use server";

import { db_find, db_insert, db_read, db_update } from "@/lib/db";

import "server-only";

export const db_insert_session = async (): Promise<string> => {
	const session = Math.random().toString(36).substring(2, 36) + Math.random().toString(36).substring(2, 36);
	await db_insert("ink_battles", "sessions", { session });
	return session;
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
export async function verifyTokenSSR(token: string): Promise<boolean> {
	try {
		const found = await db_find("ink_battles", "apikeys", { token });
		if (found) {
			if (!found.used) {
				await db_update("ink_battles", "apikeys", { token }, { used: true });
			}
			return true;
		}
		return false;
	} catch (error) {
		console.error("Error verifying token:", error);
		return false;
	}
}
