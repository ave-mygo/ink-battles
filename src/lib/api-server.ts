import process from "node:process";
import dotenv from "dotenv";
import md5 from "md5";

dotenv.config();

const API_TOKEN = process.env.AFDIAN_API_TOKEN;
const USER_ID = process.env.AFDIAN_USER_ID;

export async function getSponsorData(page: number, per_page = 20) {
	const ts = Math.floor(Date.now() / 1000);
	const params = JSON.stringify({ page, per_page });
	const sign = md5(`${API_TOKEN}params${params}ts${ts}user_id${USER_ID}`);

	const response = await fetch("https://afdian.com/api/open/query-sponsor", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			user_id: USER_ID,
			params,
			ts,
			sign,
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to fetch sponsor data");
	}

	const data = await response.json();

	return data;
}
