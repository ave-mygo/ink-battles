import crypto from "node:crypto";
import { COLLECTIONS, insertOne } from "../db/mongo";

type AuditEvent
  = | "login_success"
    | "login_failed"
    | "logout"
    | "password_reset"
    | "order_redeemed"
    | "promo_code_redeemed"
    | "billing_deducted"
    | "billing_refunded"
    | "account_bound"
    | "account_unbound"
    | "oauth_login"
    | "oauth_bind"
    | "site_setting_updated"
    | "excellent_sentence_reviewed";

interface AuditLogInput {
  event: AuditEvent;
  uid?: number | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * 计算字符串的 SHA256 哈希值
 * @param value - 待哈希的字符串
 * @returns 十六进制哈希值
 */
const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

/**
 * 异步写入审计日志，避免审计系统波动影响主业务链路。
 */
export function writeAuditLog(input: AuditLogInput) {
  queueMicrotask(() => {
    void insertOne(COLLECTIONS.auditLogs, {
      event: input.event,
      uid: input.uid ?? undefined,
      emailHash: input.email ? sha256(input.email) : undefined,
      ipHash: input.ip ? sha256(input.ip) : undefined,
      userAgent: input.userAgent ?? undefined,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
    }).catch(error => console.error("[audit] write failed", error));
  });
}
