"use client";

import type {
  AdminPromoCodeListData,
  SerializedPromoCode,
  SerializedPromoCodeRedemption,
} from "@ink-battles/shared/types/database/promo_code";
import type { ReactNode } from "react";
import { Copy, RefreshCw, TicketPercent } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult, unwrapEdenPayload } from "@/utils/api/eden-response";

interface AdminPromoCodesPanelProps {
  initialData: AdminPromoCodeListData;
}

interface PromoCodeFormState {
  count: number;
  codeLength: number;
  prefix: string;
  discountPercent: number;
  maxRedemptions: number;
  perUserMaxRedemptions: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  description: string;
}

const oneMonthInMilliseconds = 30 * 24 * 60 * 60 * 1000;

/**
 * 把 Date 转为 datetime-local 控件需要的本地时间字符串。
 * @param date - 日期对象
 * @returns datetime-local 字符串
 */
function toDateTimeLocalValue(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

/**
 * 格式化日期时间用于表格展示。
 * @param value - ISO 日期字符串
 * @returns 本地化日期时间
 */
function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN");
}

/**
 * 把优惠倍率转成折扣文本。
 * @param multiplier - 优惠倍率
 * @returns 折扣文本
 */
function formatDiscount(multiplier: number): string {
  return `减免 ${Math.round((1 - multiplier) * 100)}%`;
}

/**
 * 判断优惠码是否处于可兑换窗口。
 * @param promoCode - 优惠码
 * @returns 是否当前有效
 */
function isPromoCodeCurrentlyAvailable(promoCode: SerializedPromoCode): boolean {
  const now = Date.now();
  return promoCode.active
    && new Date(promoCode.startsAt).getTime() <= now
    && new Date(promoCode.endsAt).getTime() > now
    && promoCode.redeemedCount < promoCode.maxRedemptions;
}

/**
 * 管理员优惠码生成与展示面板。
 * @param props - 组件属性
 * @param props.initialData - 初始优惠码数据
 */
export function AdminPromoCodesPanel({ initialData }: AdminPromoCodesPanelProps) {
  const [codes, setCodes] = useState<SerializedPromoCode[]>(initialData.codes);
  const [recentRedemptions, setRecentRedemptions] = useState<SerializedPromoCodeRedemption[]>(initialData.recentRedemptions);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [form, setForm] = useState<PromoCodeFormState>(() => ({
    count: 10,
    codeLength: 8,
    prefix: "IB",
    discountPercent: 20,
    maxRedemptions: 100,
    perUserMaxRedemptions: 1,
    startsAt: toDateTimeLocalValue(new Date()),
    endsAt: toDateTimeLocalValue(new Date(Date.now() + oneMonthInMilliseconds)),
    active: true,
    description: "",
  }));

  const availableCount = useMemo(() => codes.filter(isPromoCodeCurrentlyAvailable).length, [codes]);

  const updateForm = <Key extends keyof PromoCodeFormState>(key: Key, value: PromoCodeFormState[Key]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const loadPromoCodes = async () => {
    setRefreshing(true);
    try {
      const response = await createClientEden().api.v2.admin["promo-codes"].get();
      const payload = await unwrapEdenPayload<{ success: boolean; data?: AdminPromoCodeListData; message?: string }>(
        response.data,
        response.error,
        { success: false, data: { codes: [], recentRedemptions: [] } },
      );
      if (!payload.success) {
        toast.error(payload.message ?? "刷新失败");
        return;
      }
      setCodes(payload.data?.codes ?? []);
      setRecentRedemptions(payload.data?.recentRedemptions ?? []);
    } finally {
      setRefreshing(false);
    }
  };

  const generatePromoCodes = async () => {
    setSubmitting(true);
    try {
      const startsAt = new Date(form.startsAt);
      const endsAt = new Date(form.endsAt);
      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        toast.error("请填写有效的开始和结束时间");
        return;
      }
      if (endsAt <= startsAt) {
        toast.error("结束时间必须晚于开始时间");
        return;
      }
      if (form.discountPercent < 0 || form.discountPercent >= 100) {
        toast.error("优惠比例必须在 0 到 100 之间");
        return;
      }

      const response = await createClientEden().api.v2.admin["promo-codes"].generate.post({
        count: Math.trunc(form.count),
        codeLength: Math.trunc(form.codeLength),
        prefix: form.prefix,
        scope: "order_redemption",
        discountMultiplier: Number((1 - form.discountPercent / 100).toFixed(4)),
        maxRedemptions: Math.trunc(form.maxRedemptions),
        perUserMaxRedemptions: Math.trunc(form.perUserMaxRedemptions),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        active: form.active,
        description: form.description,
      });
      const result = await normalizeEdenResult<{ success: boolean; message?: string; data?: { codes: string[] } }>(
        response.data,
        response.error,
        "生成失败",
      );
      if (!result.success) {
        toast.error(result.message ?? "生成失败");
        return;
      }
      setGeneratedCodes(result.data?.codes ?? []);
      toast.success(result.message ?? "优惠码已生成");
      await loadPromoCodes();
    } finally {
      setSubmitting(false);
    }
  };

  const togglePromoCodeActive = async (promoCode: SerializedPromoCode, active: boolean) => {
    setSavingCode(promoCode.code);
    try {
      const response = await createClientEden().api.v2.admin["promo-codes"]({ code: promoCode.code }).active.patch({ active });
      const result = await normalizeEdenResult<{ success: boolean; message?: string }>(response.data, response.error, "保存失败");
      if (!result.success) {
        toast.error(result.message ?? "保存失败");
        return;
      }
      setCodes(current => current.map(item => item.code === promoCode.code ? { ...item, active } : item));
      toast.success(result.message ?? "状态已更新");
    } finally {
      setSavingCode(null);
    }
  };

  const copyGeneratedCodes = async () => {
    if (generatedCodes.length === 0)
      return;
    await navigator.clipboard.writeText(generatedCodes.join("\n"));
    toast.success("已复制本次生成的优惠码");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">优惠码管理</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            创建给用户使用的优惠码，查看每个优惠码被用了多少次，也可以随时关闭某个优惠码。
          </p>
        </div>
        <Button variant="outline" onClick={loadPromoCodes} disabled={refreshing} className="cursor-pointer gap-2">
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">优惠码总数</CardTitle>
            <CardDescription>这里显示最近创建的优惠码，最多显示 200 个。</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{codes.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">当前可用</CardTitle>
            <CardDescription>已经开启、还没过期、也还没被用完的优惠码。</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{availableCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近兑换</CardTitle>
            <CardDescription>最近用户使用优惠码的记录，最多显示 50 条。</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{recentRedemptions.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TicketPercent className="size-4" />
            生成优惠码
          </CardTitle>
          <CardDescription>生成后会出现在下方列表里。用户在兑换订单时填写优惠码，就能按设置的减免百分比获得更多可用次数。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="生成数量">
              <Input type="number" min={1} max={100} value={form.count} onChange={event => updateForm("count", Number(event.target.value))} />
            </Field>
            <Field label="优惠码随机字符数">
              <Input type="number" min={6} max={20} value={form.codeLength} onChange={event => updateForm("codeLength", Number(event.target.value))} />
            </Field>
            <Field label="优惠码开头文字">
              <Input value={form.prefix} maxLength={12} onChange={event => updateForm("prefix", event.target.value.toUpperCase())} />
            </Field>
            <Field label="减免百分比">
              <Input type="number" min={0} max={99} value={form.discountPercent} onChange={event => updateForm("discountPercent", Number(event.target.value))} />
              <p className="text-xs text-slate-500 dark:text-slate-400">填写 20 表示减免 20%，用户用同一笔订单可以获得更多可用次数。</p>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Field label="最多可被使用次数">
              <Input type="number" min={1} value={form.maxRedemptions} onChange={event => updateForm("maxRedemptions", Number(event.target.value))} />
            </Field>
            <Field label="每个用户最多使用次数">
              <Input type="number" min={1} value={form.perUserMaxRedemptions} onChange={event => updateForm("perUserMaxRedemptions", Number(event.target.value))} />
            </Field>
            <Field label="开始时间">
              <Input type="datetime-local" value={form.startsAt} onChange={event => updateForm("startsAt", event.target.value)} />
            </Field>
            <Field label="结束时间">
              <Input type="datetime-local" value={form.endsAt} onChange={event => updateForm("endsAt", event.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_12rem]">
            <Field label="备注">
              <Textarea value={form.description} maxLength={200} onChange={event => updateForm("description", event.target.value)} />
            </Field>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <Label htmlFor="promo-active">立即启用</Label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">关闭后会先保存优惠码，但用户暂时不能使用。</p>
              </div>
              <Switch id="promo-active" checked={form.active} onCheckedChange={checked => updateForm("active", checked)} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={generatePromoCodes} disabled={submitting} className="cursor-pointer">
              {submitting ? "生成中..." : "生成优惠码"}
            </Button>
            {generatedCodes.length > 0 && (
              <Button variant="outline" onClick={copyGeneratedCodes} className="cursor-pointer gap-2">
                <Copy className="size-4" />
                复制本次生成
              </Button>
            )}
          </div>

          {generatedCodes.length > 0 && (
            <div className="rounded-md border bg-slate-50 p-3 font-mono text-sm leading-6 dark:bg-slate-900">
              {generatedCodes.join("  ")}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">优惠码列表</CardTitle>
          <CardDescription>关闭某个优惠码后，用户就不能再使用它兑换订单。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>优惠码</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>减免</TableHead>
                <TableHead>已使用次数</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>启用</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map(promoCode => (
                <TableRow key={promoCode._id}>
                  <TableCell className="font-mono">{promoCode.code}</TableCell>
                  <TableCell>
                    <Badge variant={isPromoCodeCurrentlyAvailable(promoCode) ? "default" : "secondary"}>
                      {isPromoCodeCurrentlyAvailable(promoCode) ? "可用" : "不可用"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDiscount(promoCode.discountMultiplier)}</TableCell>
                  <TableCell>{`${promoCode.redeemedCount} / ${promoCode.maxRedemptions}`}</TableCell>
                  <TableCell>
                    {formatDateTime(promoCode.startsAt)}
                    <span className="mx-1 text-slate-400">至</span>
                    {formatDateTime(promoCode.endsAt)}
                  </TableCell>
                  <TableCell className="max-w-56 truncate">{promoCode.description || "-"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={promoCode.active}
                      disabled={savingCode === promoCode.code}
                      onCheckedChange={checked => togglePromoCodeActive(promoCode, checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {codes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                    暂无优惠码，先在上方生成一批。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近兑换记录</CardTitle>
          <CardDescription>这里可以看到哪些用户最近使用过优惠码。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>优惠码</TableHead>
                <TableHead>用户 UID</TableHead>
                <TableHead>减免</TableHead>
                <TableHead>兑换时间</TableHead>
                <TableHead>失效时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRedemptions.map(redemption => (
                <TableRow key={redemption._id}>
                  <TableCell className="font-mono">{redemption.code}</TableCell>
                  <TableCell>{redemption.uid}</TableCell>
                  <TableCell>{formatDiscount(redemption.discountMultiplier)}</TableCell>
                  <TableCell>{formatDateTime(redemption.redeemedAt)}</TableCell>
                  <TableCell>{formatDateTime(redemption.expiresAt)}</TableCell>
                </TableRow>
              ))}
              {recentRedemptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                    暂无兑换记录。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

/**
 * 管理表单字段容器。
 * @param props - 字段属性
 * @param props.label - 字段标签
 * @param props.children - 字段控件
 */
function Field({ label, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
