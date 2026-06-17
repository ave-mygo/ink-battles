"use client";

import type { OrderRedemptionPreviewPayload } from "@ink-battles/shared/types/common/billing";
import { BILLING_CONSTANTS } from "@ink-battles/shared/constants/billing";
import { CheckCircle2, ExternalLink, Gift, Info, Loader2, Percent, Receipt, Sparkles, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyBillingBalanceUpdated, previewOrderRedemption, redeemOrder } from "@/utils/billing/client";
import { useBillingContext } from "./BillingContext";

const PREVIEW_DEBOUNCE_MS = 500;

type StatusTone = "success" | "danger" | "muted" | "info";

interface StatusLineProps {
  label: string;
  value: string;
  tone: StatusTone;
}

/**
 * 格式化金额，避免 UI 中重复拼接货币符号。
 * @param value - 金额数值
 * @returns 人民币金额文本
 */
function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

/**
 * 格式化百分比，供折扣和权益变化展示使用。
 * @param value - 0 到 1 之间的小数
 * @returns 百分比文本
 */
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}


/**
 * 展示单条校验状态。
 * @param props - 状态展示参数
 * @param props.label - 状态标题
 * @param props.value - 状态说明
 * @param props.tone - 状态语义
 * @returns 状态行组件
 */
function StatusLine(props: StatusLineProps) {
  const { label, tone, value } = props;
  const Icon = tone === "success" ? CheckCircle2 : tone === "danger" ? XCircle : Info;
  const iconColor = tone === "success" ? "text-emerald-500" : tone === "danger" ? "text-red-500" : "text-blue-500";

  return (
    <div className="flex gap-2 items-start text-sm">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
      <div className="min-w-0 text-muted-foreground">
        <span className="font-medium text-foreground/80">{label}：</span>
        {value}
      </div>
    </div>
  );
}

/**
 * 展示订单、优惠码和最终兑换预览。
 * @param props - 预览面板参数
 * @param props.preview - 订单兑换预览数据
 * @param props.orderNoLength - 当前订单号长度
 * @param props.validating - 是否正在预检
 * @param props.message - 手动提交后的内联提示
 * @returns 预览面板
 */
function RedemptionPreviewPanel({
  preview,
  validating,
  message,
}: {
  preview: OrderRedemptionPreviewPayload | null;
  validating: boolean;
  message: string | null;
}) {
  if (!preview && !validating && !message) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4 dark:border-slate-800 dark:bg-slate-900/20">
      <div className="text-foreground/80 text-sm font-medium flex gap-2 items-center">
        <Sparkles className="text-amber-500 h-4 w-4" />
        <span>兑换预览</span>
        {validating && (
          <Badge variant="secondary" className="ml-auto gap-1 font-normal">
            <Loader2 className="h-3 w-3 animate-spin" />
            校验中
          </Badge>
        )}
      </div>

      {message && <StatusLine label="提示" value={message} tone="danger" />}

      {preview && (
        <div className="space-y-4">
          <div className="space-y-2">
            <StatusLine
              label={
                !preview.order.accountMatched
                  ? "账号验证"
                  : preview.order.redeemed
                    ? "兑换状态"
                    : "订单状态"
              }
              value={preview.order.message}
              tone={preview.order.valid ? "success" : "danger"}
            />
          </div>

          {preview.promoCode.checked && (
            <div className="border-t border-slate-200 pt-3 space-y-2 dark:border-slate-800">
              <div className="text-sm font-medium flex gap-2 items-center text-foreground/80">
                <Percent className="h-4 w-4 text-blue-500" />
                优惠码校验
                <Badge variant={preview.promoCode.valid ? "default" : "destructive"} className="ml-auto">
                  {preview.promoCode.valid ? "可用" : "不可用"}
                </Badge>
              </div>
              <div className="text-muted-foreground text-xs space-y-1 ml-6">
                <p>{preview.promoCode.message}</p>
                {preview.promoCode.discountPercent !== null && (
                  <p>折扣力度：{preview.promoCode.discountPercent}%</p>
                )}
                {preview.promoCode.description && (
                  <p>适用说明：{preview.promoCode.description}</p>
                )}
              </div>
            </div>
          )}

          {preview.calculation && (
            <div className="border-t border-slate-200 pt-3 space-y-3 dark:border-slate-800">
              <div className="text-sm font-medium text-emerald-600 flex gap-2 items-center dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                最终可兑换：{preview.calculation.totalCallsAddedAfterPromo} 次
              </div>
              <div className="grid gap-x-4 gap-y-2 text-xs text-muted-foreground sm:grid-cols-2 ml-6">
                <div>订单金额：<span className="text-foreground/80">{formatCurrency(preview.calculation.orderAmount)}</span></div>
                <div>付费次数：<span className="text-foreground/80">{preview.calculation.paidCallsAfterPromo} 次</span></div>
                {preview.calculation.grantCallsAdded > 0 && (
                  <div>首次赠送：<span className="text-foreground/80">{preview.calculation.grantCallsAdded} 次</span></div>
                )}
                {preview.calculation.totalCallsAddedBeforePromo !== preview.calculation.totalCallsAddedAfterPromo && (
                  <div className="sm:col-span-2">
                    使用优惠码多得：<span className="text-emerald-500">+{preview.calculation.extraPaidCallsFromPromo} 次</span>
                  </div>
                )}
                {preview.calculation.memberNameBefore !== preview.calculation.memberNameAfter && (
                  <div className="sm:col-span-2">
                    会员等级：<span className="line-through opacity-70">{preview.calculation.memberNameBefore}</span> <span className="text-foreground/80">{"->"} {preview.calculation.memberNameAfter}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 订单兑换组件
 * 允许用户输入爱发电订单号进行兑换
 */
export default function OrderRedemption() {
  const { refreshBilling } = useBillingContext();
  const [orderNo, setOrderNo] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [preview, setPreview] = useState<OrderRedemptionPreviewPayload | null>(null);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const lastPreviewKeyRef = useRef("");
  const trimmedOrderNo = orderNo.trim();
  const trimmedPromoCode = promoCode.trim();
  const normalizedPromoCode = trimmedPromoCode.toUpperCase();
  const canAutoPreview = trimmedOrderNo.length === BILLING_CONSTANTS.ORDER_NO_LENGTH;
  const currentPreview = preview?.orderNo === trimmedOrderNo && (preview.promoCode.code ?? "") === normalizedPromoCode ? preview : null;
  const canRedeem = useMemo(
    () => canAutoPreview && !loading && (!currentPreview || currentPreview.order.valid) && (!currentPreview?.promoCode.checked || currentPreview.promoCode.valid),
    [canAutoPreview, currentPreview, loading],
  );

  /**
   * 执行只读预检，并丢弃过期请求结果。
   * @param options.force - 是否跳过重复请求缓存
   * @returns 最新预检数据，失败时返回 null
   */
  const runPreview = useCallback(async (options: { force?: boolean } = {}): Promise<OrderRedemptionPreviewPayload | null> => {
    if (!canAutoPreview) {
      return null;
    }

    const previewKey = `${trimmedOrderNo}:${normalizedPromoCode}`;
    if (!options.force && previewKey === lastPreviewKeyRef.current) {
      return preview;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    lastPreviewKeyRef.current = previewKey;
    setValidating(true);
    setInlineMessage(null);

    try {
      const response = await previewOrderRedemption(trimmedOrderNo, trimmedPromoCode || undefined);
      if (requestId !== requestIdRef.current) {
        return null;
      }

      if (response.success && response.data) {
        setPreview(response.data);
        return response.data;
      }

      setInlineMessage(response.message || "校验订单失败");
      setPreview(null);
      return null;
    } catch {
      if (requestId === requestIdRef.current) {
        setInlineMessage("校验订单失败，请稍后重试");
        setPreview(null);
      }
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        setValidating(false);
      }
    }
  }, [canAutoPreview, normalizedPromoCode, preview, trimmedOrderNo, trimmedPromoCode]);

  useEffect(() => {
    if (!canAutoPreview) {
      requestIdRef.current += 1;
      lastPreviewKeyRef.current = "";
      return;
    }

    const timer = setTimeout(() => {
      void runPreview();
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [canAutoPreview, runPreview, trimmedOrderNo, trimmedPromoCode]);

  const handleRedeem = async () => {
    if (!trimmedOrderNo) {
      setInlineMessage("请输入订单号");
      return;
    }

    if (trimmedOrderNo.length !== BILLING_CONSTANTS.ORDER_NO_LENGTH) {
      setInlineMessage(`订单号需要 ${BILLING_CONSTANTS.ORDER_NO_LENGTH} 位`);
      return;
    }

    const latestPreview = currentPreview ?? await runPreview({ force: true });
    if (latestPreview && (!latestPreview.order.valid || !latestPreview.promoCode.valid)) {
      setInlineMessage(latestPreview.order.valid ? latestPreview.promoCode.message : latestPreview.order.message);
      return;
    }

    setLoading(true);
    setInlineMessage(null);

    try {
      const response = await redeemOrder(trimmedOrderNo, trimmedPromoCode || undefined);

      if (response.success) {
        toast.success(response.message || "兑换成功");
        setOrderNo("");
        setPromoCode("");
        setPreview(null);
        lastPreviewKeyRef.current = "";
        notifyBillingBalanceUpdated();
        await refreshBilling();
      } else {
        setInlineMessage(response.message || "兑换失败");
      }
    } catch {
      setInlineMessage("兑换失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 bg-white/80 shadow-lg transition-all relative overflow-hidden backdrop-blur-sm hover:shadow-xl">
      {/* 背景装饰 */}
      <div className="opacity-[0.03] pointer-events-none absolute -right-6 -top-6">
        <Gift className="h-48 w-48 rotate-12" />
      </div>

      <CardHeader>
        <CardTitle className="text-xl flex gap-2 items-center">
          <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
            <Gift className="text-pink-600 h-5 w-5 dark:text-pink-400" />
          </div>
          订单兑换
        </CardTitle>
        <CardDescription>
          使用爱发电订单号兑换 API 调用次数或会员时长
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6">
        <div className="space-y-3">
          <Label htmlFor="order-no" className="text-sm font-medium">
            爱发电订单号
          </Label>
          <div className="relative">
            <Receipt className="text-muted-foreground h-4 w-4 left-3 top-1/2 absolute -translate-y-1/2" />
            <Input
              id="order-no"
              placeholder={`请输入 ${BILLING_CONSTANTS.ORDER_NO_LENGTH} 位订单号`}
              value={orderNo}
              maxLength={BILLING_CONSTANTS.ORDER_NO_LENGTH}
              onChange={(event) => {
                setOrderNo(event.target.value.replace(/\s/g, "").slice(0, BILLING_CONSTANTS.ORDER_NO_LENGTH));
              }}
              disabled={loading}
              className="pl-9 h-11"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRedeem();
                }
              }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="promo-code" className="text-sm font-medium">
            优惠码 (可选)
          </Label>
          <div className="relative">
            <Input
              id="promo-code"
              placeholder="请输入优惠码"
              value={promoCode}
              onChange={event => setPromoCode(event.target.value)}
              disabled={loading}
              className="pl-3 h-11 uppercase"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRedeem();
                }
              }}
            />
          </div>
        </div>

        <RedemptionPreviewPanel
          preview={currentPreview}
          validating={canAutoPreview && validating}
          message={inlineMessage}
        />

        <div className="bg-muted/40 border-muted/50 p-4 border rounded-xl space-y-3">
          <div className="text-foreground/80 text-sm font-medium flex gap-2 items-center">
            <Info className="text-blue-500 h-4 w-4 dark:text-blue-400" />
            <span>兑换说明</span>
          </div>
          <ul className="text-muted-foreground text-xs list-disc list-inside space-y-2">
            <li>
              请先在
              {" "}
              <Link href="/dashboard/accounts" className="text-primary inline-flex gap-1 items-center underline-offset-4 cursor-pointer hover:underline">
                账户绑定页面
                <ExternalLink className="h-3 w-3" />
              </Link>
              {" "}
              绑定对应的爱发电账户
            </li>
            <li>每个订单号仅限兑换一次，兑换后立即生效</li>
          </ul>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/10 p-6 border-t flex items-center justify-between">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary px-2" asChild>
          <Link href="https://ifdian.net/a/tianxiang" target="_blank" className="flex gap-1 items-center">
            前往爱发电支持
            {" "}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
        <Button
          onClick={handleRedeem}
          disabled={!canRedeem || validating}
          className="text-white min-w-30 shadow-md transition-all from-pink-500 to-rose-500 bg-linear-to-r hover:shadow-lg hover:from-pink-600 hover:to-rose-600"
        >
          {loading
            ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              )
            : (
                <>
                  立即兑换
                </>
              )}
        </Button>
      </CardFooter>
    </Card>
  );
}
