const DEFAULT_API_TIMEOUT_MS = 30_000;

export const createTimeoutFetcher = (timeoutMs = DEFAULT_API_TIMEOUT_MS): typeof fetch => {
  const timeoutFetcher = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort("API_TIMEOUT"), timeoutMs);
    try {
      return await fetch(input, {
        ...init,
        signal: init.signal ?? abortController.signal,
      });
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new Error("请求超时，请稍后重试");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
  return timeoutFetcher as typeof fetch;
};
