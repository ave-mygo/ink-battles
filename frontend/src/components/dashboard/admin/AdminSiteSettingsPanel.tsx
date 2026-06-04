"use client";

import type {
  HonoraryWriterUserSummary,
  SiteSettingHistoryItem,
  SiteSettingKey,
  SiteSettingMeta,
  SiteSettingValueMap,
} from "@ink-battles/shared/types/common";
import { Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult, unwrapEdenPayload } from "@/utils/api/eden-response";
import {
  AiGenerationEditor,
  AnalysisRuntimeEditor,
  BooleanField,
  FriendLinksEditor,
  GradingModelsEditor,
  HonoraryWritersEditor,
  JsonEditor,
  NumberField,
  SaveButton,
  ScoringPolicyEditor,
  SettingMeta,
  TextField,
} from "./AdminSiteSettingsEditors";

interface AdminSiteSettingsPanelProps {
  initialSettings: SiteSettingMeta[];
  initialHistory: SiteSettingHistoryItem[];
  initialUsers: HonoraryWriterUserSummary[];
}

type DraftValues = Record<SiteSettingKey, string>;

const formatDateTime = (value: string | null) => value ? new Date(value).toLocaleString("zh-CN") : "尚未修改";

const stringifyValue = (value: unknown) => JSON.stringify(value, null, 2);

const parseJsonDraft = <T,>(draft: string, fallback: T): T => {
  try {
    return JSON.parse(draft) as T;
  } catch {
    return fallback;
  }
};

/**
 * 后台站点配置面板。
 */
export function AdminSiteSettingsPanel({ initialSettings, initialHistory, initialUsers }: AdminSiteSettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [history, setHistory] = useState(initialHistory);
  const [savingKey, setSavingKey] = useState<SiteSettingKey | null>(null);
  const [drafts, setDrafts] = useState<DraftValues>(() => Object.fromEntries(
    initialSettings.map(setting => [setting.key, stringifyValue(setting.value)]),
  ) as DraftValues);

  const settingsByKey = useMemo(
    () => new Map(settings.map(setting => [setting.key, setting])),
    [settings],
  );

  const updateDraftValue = <Key extends SiteSettingKey>(key: Key, value: SiteSettingValueMap[Key]) => {
    setDrafts(current => ({ ...current, [key]: stringifyValue(value) }));
  };

  const getDraftValue = <Key extends SiteSettingKey>(key: Key): SiteSettingValueMap[Key] | null => {
    const setting = settingsByKey.get(key);
    if (!setting)
      return null;
    return parseJsonDraft<SiteSettingValueMap[Key]>(drafts[key], setting.value as SiteSettingValueMap[Key]);
  };

  const refreshHistory = async () => {
    const response = await createClientEden().api.v2.admin["site-settings"].history.get();
    const payload = await unwrapEdenPayload<{ success: boolean; data?: SiteSettingHistoryItem[] }>(
      response.data,
      response.error,
      { success: false, data: [] },
    );
    setHistory(payload.data ?? []);
  };

  const saveSetting = async (key: SiteSettingKey) => {
    const setting = settingsByKey.get(key);
    if (!setting)
      return;

    const value = parseJsonDraft<SiteSettingValueMap[SiteSettingKey]>(drafts[key], setting.value);
    setSavingKey(key);
    try {
      const response = await createClientEden().api.v2.admin["site-settings"]({ key }).put({ value });
      const result = await normalizeEdenResult<{ success: boolean; message?: string; data?: SiteSettingMeta[] }>(
        response.data,
        response.error,
        "保存失败",
      );
      if (!result.success) {
        toast.error(result.message ?? "保存失败");
        return;
      }
      setSettings(result.data ?? settings);
      await refreshHistory();
      toast.success("配置已保存");
    } finally {
      setSavingKey(null);
    }
  };

  const renderCard = (key: SiteSettingKey, children: React.ReactNode) => {
    const setting = settingsByKey.get(key);
    if (!setting)
      return null;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{setting.label}</CardTitle>
              <CardDescription className="mt-1">{setting.description}</CardDescription>
            </div>
            <Badge variant="outline">{setting.key}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {children}
          <JsonEditor keyName={key} draft={drafts[key] ?? ""} onChange={value => setDrafts(current => ({ ...current, [key]: value }))} />
          <SettingMeta setting={setting} />
          <SaveButton saving={savingKey === key} onClick={() => saveSetting(key)} />
        </CardContent>
      </Card>
    );
  };

  const notice = getDraftValue("site.notice");
  const registration = getDraftValue("registration.policy");
  const uploadLimits = getDraftValue("content.uploadLimits");
  const friends = getDraftValue("site.friends");
  const runtime = getDraftValue("analysis.runtime");
  const scoringPolicy = getDraftValue("analysis.scoringPolicy");
  const generation = getDraftValue("ai.generation");
  const gradingModels = getDraftValue("ai.gradingModels");
  const honoraryWriters = getDraftValue("content.honoraryWriters");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">站点配置</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          页面会解析每个 JSON 配置并渲染为可视化表单；高级 JSON 区用于批量粘贴和精确调整。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {notice && renderCard(
          "site.notice",
          <div className="space-y-4">
            <BooleanField
              id="notice-enabled"
              label="启用公告"
              description="关闭后首页顶部公告栏不渲染。"
              checked={notice.enabled === true}
              onChange={enabled => updateDraftValue("site.notice", { ...notice, enabled })}
            />
            <TextField label="公告内容" description="建议控制在一行内，避免首页首屏被公告挤压。" value={notice.content ?? ""} onChange={content => updateDraftValue("site.notice", { ...notice, content })} />
            <TextField label="公告链接" description="可为空；填写后点击公告会打开此链接。" value={notice.link ?? ""} onChange={link => updateDraftValue("site.notice", { ...notice, link })} />
          </div>,
        )}

        {registration && renderCard(
          "registration.policy",
          <BooleanField
            id="invite-required"
            label="注册需要邀请码"
            description="打开后，邮箱注册流程必须提供有效邀请码。保存后立即影响注册接口。"
            checked={registration.invite_code_required === true}
            onChange={invite_code_required => updateDraftValue("registration.policy", { invite_code_required })}
          />,
        )}

        {uploadLimits && renderCard(
          "content.uploadLimits",
          <div className="grid gap-4 md:grid-cols-3">
            <NumberField label="游客单次字数" description="控制未登录用户单次输入/上传的前端限制。" value={uploadLimits.guestPerRequestChars} onChange={guestPerRequestChars => updateDraftValue("content.uploadLimits", { ...uploadLimits, guestPerRequestChars })} />
            <NumberField label="登录用户单次字数" description="控制普通登录用户单次输入/上传的前端限制。" value={uploadLimits.loggedPerRequestChars} onChange={loggedPerRequestChars => updateDraftValue("content.uploadLimits", { ...uploadLimits, loggedPerRequestChars })} />
            <NumberField label="游客每日字数" description="用于展示游客每日额度，后续接入日限流时复用。" value={uploadLimits.guestDailyChars} onChange={guestDailyChars => updateDraftValue("content.uploadLimits", { ...uploadLimits, guestDailyChars })} />
          </div>,
        )}

        {friends && renderCard("site.friends", (<FriendLinksEditor value={friends} onChange={value => updateDraftValue("site.friends", value)} />))}

        {honoraryWriters && renderCard(
          "content.honoraryWriters",
          <HonoraryWritersEditor
            value={honoraryWriters}
            users={initialUsers}
            onChange={value => updateDraftValue("content.honoraryWriters", value)}
          />,
        )}

        {runtime && renderCard("analysis.runtime", (<AnalysisRuntimeEditor value={runtime} onChange={value => updateDraftValue("analysis.runtime", value)} />))}

        {scoringPolicy && renderCard("analysis.scoringPolicy", (<ScoringPolicyEditor value={scoringPolicy} onChange={value => updateDraftValue("analysis.scoringPolicy", value)} />))}

        {generation && renderCard("ai.generation", (<AiGenerationEditor value={generation} onChange={value => updateDraftValue("ai.generation", value)} />))}

        {gradingModels && renderCard("ai.gradingModels", (<GradingModelsEditor value={gradingModels} onChange={value => updateDraftValue("ai.gradingModels", value)} />))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex gap-2 items-center text-base">
            <Clock className="h-4 w-4" />
            最近变更
          </CardTitle>
          <CardDescription>记录管理员、修改时间、配置项与变更后内容。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>配置</TableHead>
                <TableHead>管理员</TableHead>
                <TableHead>变更后内容</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                  <TableCell><Badge variant="outline">{item.key}</Badge></TableCell>
                  <TableCell>{item.adminLabel}</TableCell>
                  <TableCell className="max-w-xl whitespace-normal">
                    <code className="text-xs">{stringifyValue(item.after).slice(0, 240)}</code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
