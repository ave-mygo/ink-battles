"use client";

import type { App as BackendApp } from "@backend/app";
import { treaty } from "@elysiajs/eden";
import { getClientApiHost } from "./eden-common";
import { createTimeoutFetcher } from "./fetch-timeout";

/**
 * 创建浏览器侧可复用的 Eden Treaty 实例。
 */
export const createClientEden = () =>
	treaty<BackendApp>(getClientApiHost(), {
		fetcher: createTimeoutFetcher(),
		fetch: {
			credentials: "include",
		},
	});
