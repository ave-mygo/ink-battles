interface EdenValidationPayload {
  message?: string;
  summary?: string;
}

interface EdenValidationError {
  status?: number;
  value?: EdenValidationPayload;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasSuccessField = <T extends { success: boolean }>(value: unknown): value is T =>
  isObjectRecord(value) && "success" in value;

const isValidationError = (value: unknown): value is EdenValidationError =>
  isObjectRecord(value) && "status" in value && "value" in value;

/**
 * 把 Eden 的原始返回值收口成业务侧稳定的 `{ success, message }` 结构。
 */
export const normalizeEdenResult = async <T extends { success: boolean; message?: string }>(
  data: unknown,
  error: unknown,
  fallbackMessage: string,
): Promise<T> => {
  const payload = data ?? error;

  if (payload instanceof Response) {
    const contentType = payload.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return payload.json() as Promise<T>;
    }

    return {
      success: payload.ok,
      message: payload.ok ? undefined : fallbackMessage,
    } as T;
  }

  if (hasSuccessField<T>(payload)) {
    return payload;
  }

  if (isValidationError(payload)) {
    return {
      success: false,
      message: payload.value?.message || payload.value?.summary || fallbackMessage,
    } as T;
  }

  return {
    success: false,
    message: fallbackMessage,
  } as T;
};

/**
 * 提取 Eden 返回的业务数据。
 *
 * 用于没有统一 `{ success, message }` 包裹的普通 REST 读取接口。
 */
export const unwrapEdenPayload = async <T>(
  data: unknown,
  error: unknown,
  fallbackValue: T,
): Promise<T> => {
  if (data !== undefined) {
    return data as T;
  }

  if (error instanceof Response) {
    const contentType = error.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return error.json() as Promise<T>;
    }
  }

  if (error !== undefined) {
    return error as T;
  }

  return fallbackValue;
};
