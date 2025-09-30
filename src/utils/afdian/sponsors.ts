import md5 from "md5";
import { getConfig } from "@/config";

const { afdian: { api_token, user_id } } = getConfig();

export async function getSponsorData(page: number, per_page = 20) {
	const ts = Math.floor(Date.now() / 1000);
	const params = JSON.stringify({ page, per_page });
	const sign = md5(`${api_token}params${params}ts${ts}user_id${user_id}`);

	const response = await fetch("https://afdian.com/api/open/query-sponsor", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			user_id,
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
