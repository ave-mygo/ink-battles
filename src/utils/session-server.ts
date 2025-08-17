"use server";

import { db_name } from "@/lib/constants";
import { db_find, db_insert, db_update } from "@/lib/db";
import "server-only";

export const db_insert_session = async (): Promise<string> => {
	const session = Math.random().toString(36).substring(2, 36) + Math.random().toString(36).substring(2, 36);
	await db_insert(db_name, "sessions", { session });
	return session;
};

export async function verifyTokenSSR(token: string): Promise<boolean> {
	try {
		const found = await db_find(db_name, "apikeys", { token });
		if (found) {
			if (!found.used) {
				await db_update(db_name, "apikeys", { token }, { used: true });
			}
			return true;
		}
		return false;
	} catch (error) {
		console.error("Error verifying token:", error);
		return false;
	}
}
