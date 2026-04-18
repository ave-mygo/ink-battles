import type { App as BackendApp } from "@ink-battles/backend/app";
import { treaty } from "@elysiajs/eden";
import { cookies } from "next/headers";
import { getServerApiHost } from "./eden-common";
import { createTimeoutFetcher } from "./fetch-timeout";

/**
 * 创建带 Cookie 透传的服务端 Eden Treaty 实例。
 */
export const createServerEden = async () => {
	const cookieStore = await cookies();

	return treaty<BackendApp>(getServerApiHost(), {
		fetcher: createTimeoutFetcher(),
		fetch: {
			cache: "no-store",
		},
		headers: {
			"Content-Type": "application/json",
			"Cookie": cookieStore.toString(),
		},
	});
};
