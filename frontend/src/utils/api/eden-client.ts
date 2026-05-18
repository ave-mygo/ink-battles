"use client";

import type { App as BackendApp } from "@ink-battles/backend/app";
import type { Elysia } from "elysia";
import { treaty } from "@elysiajs/eden";
import { getClientApiHost } from "./eden-common";
import { createTimeoutFetcher } from "./fetch-timeout";

type EdenBackendApp = Elysia & {
  "~Routes": BackendApp["~Routes"];
};

/**
 * 创建浏览器侧可复用的 Eden Treaty 实例。
 */
export const createClientEden = () =>
  treaty<EdenBackendApp>(getClientApiHost(), {
    fetcher: createTimeoutFetcher(),
    fetch: {
      credentials: "include",
    },
  });
