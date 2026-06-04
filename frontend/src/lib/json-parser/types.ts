export interface SafeParseOptions {
  /**
   * 对指定路径的数组元素执行自定义校验。
   * key = 以'.' 分隔的路径（如 "mermaid_diagrams"）
   * value = 返回 true 保留，false 移除
   */
  validators?: Record<string, (item: unknown) => boolean>;

  /** 是否自动检测并校验 mermaid 图表数组，默认 true */
  validateMermaid?: boolean;
}

export interface SafeParseResult<T = unknown> {
  ok: boolean;
  data: T;
  removed: RemovedEntry[];
  warnings: string[];
}

export interface RemovedEntry {
  path: string;
  item: unknown;
  reason: string;
}

export interface ParseSuccess {
  ok: true;
  value: unknown;
}

export interface ParseFailure {
  ok: false;
}

export type ParseAttempt = ParseSuccess | ParseFailure;
