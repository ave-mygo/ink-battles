"use client";

import type {
  AiGenerationSetting,
  AnalysisRuntimeSetting,
  AnalysisScoringPolicySetting,
  FriendLink,
  GradingModelAdminConfig,
  HonoraryWriterSetting,
  HonoraryWriterUserSummary,
  SiteSettingKey,
  SiteSettingMeta,
} from "@ink-battles/shared/types/common";
import { Plus, Save, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const formatDateTime = (value: string | null) => value ? new Date(value).toLocaleString("zh-CN") : "尚未修改";

export function FriendLinksEditor({ value, onChange }: { value: FriendLink[]; onChange: (value: FriendLink[]) => void }) {
  const updateItem = (index: number, item: FriendLink) => onChange(value.map((current, itemIndex) => itemIndex === index ? item : current));

  return (
    <div className="space-y-3">
      {value.map((friend, index) => (
        <div key={friend.url || index} className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">
              友链
              {index + 1}
            </div>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}>
              <Trash2 className="mr-1 h-4 w-4" />
              删除
            </Button>
          </div>
          <TextField label="站点名称" description="显示在友链卡片上的标题。" value={friend.title} onChange={title => updateItem(index, { ...friend, title })} />
          <TextField label="站点描述" description="简短说明对方站点类型或合作关系。" value={friend.description} onChange={description => updateItem(index, { ...friend, description })} />
          <TextField label="链接地址" description="必须是完整 URL。" value={friend.url} onChange={url => updateItem(index, { ...friend, url })} />
        </div>
      ))}
      <Button variant="outline" className="cursor-pointer" onClick={() => onChange([...value, { title: "", description: "", url: "" }])}>
        <Plus className="mr-2 h-4 w-4" />
        添加友链
      </Button>
    </div>
  );
}

export function HonoraryWritersEditor({ value, users, onChange }: {
  value: HonoraryWriterSetting;
  users: HonoraryWriterUserSummary[];
  onChange: (value: HonoraryWriterSetting) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const selectedUids = new Set(value.uids);
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (!normalizedKeyword)
      return true;
    return [
      String(user.uid),
      user.nickname ?? "",
      user.email ?? "",
    ].some(text => text.toLowerCase().includes(normalizedKeyword));
  });

  const updateUid = (uid: number, selected: boolean) => {
    const nextUids = selected
      ? Array.from(new Set([...value.uids, uid]))
      : value.uids.filter(currentUid => currentUid !== uid);
    onChange({ uids: nextUids });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>
            已授权
            {" "}
            {value.uids.length}
            {" "}
            位荣誉作家
          </span>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder="搜索昵称、邮箱或 UID"
            className="pl-9"
          />
        </div>
      </div>

      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {filteredUsers.map((user) => {
          const displayName = user.nickname || user.email || `UID ${user.uid}`;
          const isSelected = selectedUids.has(user.uid);
          return (
            <div key={user.uid} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar ?? undefined} alt={displayName} />
                  <AvatarFallback>{getUserInitials(displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{displayName}</p>
                    {user.isAdmin && <Badge variant="outline">管理员</Badge>}
                    {isSelected && <Badge className="bg-emerald-600">荣誉作家</Badge>}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    UID:
                    {" "}
                    {user.uid}
                    {user.email ? ` · ${user.email}` : ""}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={isSelected ? "outline" : "default"}
                className="cursor-pointer disabled:cursor-not-allowed sm:w-28"
                disabled={user.isAdmin && !isSelected}
                onClick={() => updateUid(user.uid, !isSelected)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {isSelected ? "移除" : user.isAdmin ? "已具备" : "授权"}
              </Button>
            </div>
          );
        })}
        {filteredUsers.length === 0 && (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-slate-500">
            没有匹配的用户。
          </div>
        )}
      </div>
    </div>
  );
}

export function AnalysisRuntimeEditor({ value, onChange }: { value: AnalysisRuntimeSetting; onChange: (value: AnalysisRuntimeSetting) => void }) {
  const updateField = (field: keyof AnalysisRuntimeSetting, nextValue: number) => onChange({ ...value, [field]: nextValue });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <NumberField label="文章最大字符数" description="后端提交硬限制，超过后拒绝创建分析任务。" value={value.max_article_chars} onChange={nextValue => updateField("max_article_chars", nextValue)} />
      <NumberField label="输出最大字符数" description="模型流式输出的最大保存长度。" value={value.max_output_chars} onChange={nextValue => updateField("max_output_chars", nextValue)} />
      <NumberField label="并发任务数" description="后台同时执行的分析任务上限。" value={value.max_concurrent_tasks} onChange={nextValue => updateField("max_concurrent_tasks", nextValue)} />
      <NumberField label="普通队列长度" description="免费/游客任务的排队容量。" value={value.max_queued_tasks} onChange={nextValue => updateField("max_queued_tasks", nextValue)} />
      <NumberField label="赞助队列长度" description="赞助用户独立队列容量。" value={value.max_sponsor_queued_tasks} onChange={nextValue => updateField("max_sponsor_queued_tasks", nextValue)} />
      <NumberField label="单用户活跃任务数" description="同一用户或游客指纹可同时存在的进行中任务数。" value={value.max_active_tasks_per_user} onChange={nextValue => updateField("max_active_tasks_per_user", nextValue)} />
      <NumberField label="模式字段最大长度" description="限制分析模式字符串长度，避免异常请求膨胀。" value={value.max_mode_chars} onChange={nextValue => updateField("max_mode_chars", nextValue)} />
      <NumberField label="指纹字段最大长度" description="限制游客 fingerprint 字段长度。" value={value.max_fingerprint_chars} onChange={nextValue => updateField("max_fingerprint_chars", nextValue)} />
      <NumberField label="游客结果保留分钟" description="游客首次打开结果页后的逻辑保留时间。" value={value.guest_result_ttl_minutes} onChange={nextValue => updateField("guest_result_ttl_minutes", nextValue)} />
      <NumberField label="任务超时毫秒" description="单个分析任务执行超时时间。" value={value.task_timeout_ms} onChange={nextValue => updateField("task_timeout_ms", nextValue)} />
      <NumberField label="流式最大块数" description="模型流式返回 chunk 数量保护阈值。" value={value.stream_max_chunks} onChange={nextValue => updateField("stream_max_chunks", nextValue)} />
      <NumberField label="验证输出最大字符" description="文本审核模型返回内容的最大长度。" value={value.validation_max_text_chars} onChange={nextValue => updateField("validation_max_text_chars", nextValue)} />
      <NumberField label="亮点句子数量" description="每篇分析结果最多保留的亮点句子候选数。" value={value.excellent_sentences_max_count} onChange={nextValue => updateField("excellent_sentences_max_count", nextValue)} />
    </div>
  );
}

export function ScoringPolicyEditor({ value, onChange }: { value: AnalysisScoringPolicySetting; onChange: (value: AnalysisScoringPolicySetting) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <BooleanField
        id="score-compensation"
        label="启用低分补偿"
        description={`开启后，如果高分维度数量达到下面任一阈值，所有低于 ${value.compensation_score_floor} 分的基础维度都会被补到 ${value.compensation_score_floor} 分。`}
        checked={value.enable_low_score_compensation}
        onChange={enable_low_score_compensation => onChange({ ...value, enable_low_score_compensation })}
      />
      <NumberField label="低分补到几分" description={`当前设置为 ${value.compensation_score_floor} 分；触发补偿后，低于 ${value.compensation_score_floor} 分的基础维度会直接变成 ${value.compensation_score_floor} 分。`} value={value.compensation_score_floor} step={0.1} onChange={compensation_score_floor => onChange({ ...value, compensation_score_floor })} />
      <NumberField label="触发条件：超过 3.5 分的维度数" description={`基础维度中超过 3.5 分的数量达到 ${value.compensation_min_count_above_3_5} 个时触发补偿。`} value={value.compensation_min_count_above_3_5} onChange={compensation_min_count_above_3_5 => onChange({ ...value, compensation_min_count_above_3_5 })} />
      <NumberField label="触发条件：超过 4.0 分的维度数" description={`基础维度中超过 4.0 分的数量达到 ${value.compensation_min_count_above_4_0} 个时也会触发补偿。`} value={value.compensation_min_count_above_4_0} onChange={compensation_min_count_above_4_0 => onChange({ ...value, compensation_min_count_above_4_0 })} />
    </div>
  );
}

export function AiGenerationEditor({ value, onChange }: { value: AiGenerationSetting; onChange: (value: AiGenerationSetting) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <NumberField label="默认 temperature" description="普通评分模型的生成温度，越高越发散。" value={value.default_temperature} step={0.1} onChange={default_temperature => onChange({ ...value, default_temperature })} />
      <NumberField label="GPT-5 nano temperature" description="针对 gpt-5-nano 的特殊温度。" value={value.gpt5_nano_temperature} step={0.1} onChange={gpt5_nano_temperature => onChange({ ...value, gpt5_nano_temperature })} />
      <BooleanField id="ai-seed" label="启用 seed" description="启用后会用 fingerprint 作为 seed，提升同输入稳定性。" checked={value.enable_seed} onChange={enable_seed => onChange({ ...value, enable_seed })} />
      <BooleanField id="ai-json-mode" label="启用 JSON mode" description="模型支持时请求 JSON object，提升解析稳定性。" checked={value.enable_json_mode_when_supported} onChange={enable_json_mode_when_supported => onChange({ ...value, enable_json_mode_when_supported })} />
    </div>
  );
}

export function GradingModelsEditor({ value, onChange }: { value: GradingModelAdminConfig[]; onChange: (value: GradingModelAdminConfig[]) => void }) {
  const updateItem = (index: number, item: GradingModelAdminConfig) => onChange(value.map((current, itemIndex) => itemIndex === index ? item : current));

  return (
    <div className="space-y-3">
      {value.map((model, index) => (
        <div key={model.id || index} className="space-y-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{model.name || model.id}</div>
              <div className="text-xs text-slate-500">真实模型名和凭证仍来自 config.toml，这里维护运营展示字段。</div>
            </div>
            <div className="flex gap-3">
              <BooleanField id={`model-enabled-${index}`} label="启用" checked={model.enabled} onChange={enabled => updateItem(index, { ...model, enabled })} compact />
              <BooleanField id={`model-premium-${index}`} label="会员" checked={model.premium === true} onChange={premium => updateItem(index, { ...model, premium })} compact />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="模型 ID" description="前端提交和后端匹配使用的稳定 ID。" value={model.id} onChange={id => updateItem(index, { ...model, id })} />
            <TextField label="展示名称" description="模型选择器中展示的名称。" value={model.name} onChange={name => updateItem(index, { ...model, name })} />
            <TextField label="真实模型名" description="用于和启动配置中的模型条目匹配，不建议随意修改。" value={model.model} onChange={nextModel => updateItem(index, { ...model, model: nextModel })} />
            <TextField label="使用场景" description="模型选择器中的场景说明。" value={model.usageScenario ?? ""} onChange={usageScenario => updateItem(index, { ...model, usageScenario })} />
          </div>
          <LongTextField label="模型描述" description="公开模型列表和选择器中的摘要。" value={model.description} onChange={description => updateItem(index, { ...model, description })} />
          <LongTextField label="警告说明" description="例如成本、速度、稳定性或数据处理提示，可为空。" value={model.warning ?? ""} onChange={warning => updateItem(index, { ...model, warning })} />
          <StringListField label="功能标签" description="每行一个标签，用于模型选择器展示。" value={model.features ?? []} onChange={features => updateItem(index, { ...model, features })} />
          <StringListField label="模型优势" description="每行一个优势说明。" value={model.advantages ?? []} onChange={advantages => updateItem(index, { ...model, advantages })} />
        </div>
      ))}
    </div>
  );
}

export function JsonEditor({ keyName, draft, onChange }: { keyName: SiteSettingKey; draft: string; onChange: (value: string) => void }) {
  const isValidJson = (() => {
    try {
      JSON.parse(draft);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <div className="space-y-2 rounded-md border bg-slate-50/60 p-3 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor={`json-${keyName}`}>高级 JSON</Label>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">表单会同步到这里，也可以直接粘贴完整 JSON。</p>
        </div>
        <Badge variant={isValidJson ? "outline" : "destructive"}>{isValidJson ? "JSON 有效" : "JSON 错误"}</Badge>
      </div>
      <Textarea id={`json-${keyName}`} className="min-h-36 font-mono text-xs" value={draft} onChange={event => onChange(event.target.value)} />
    </div>
  );
}

export function SettingMeta({ setting }: { setting: SiteSettingMeta }) {
  return (
    <div className="text-xs text-slate-500 dark:text-slate-400">
      最后修改：
      {formatDateTime(setting.updatedAt)}
      {" · "}
      {setting.updatedByLabel ?? "来自 config.toml 默认值"}
      {" · "}
      <Badge variant="outline">{setting.source}</Badge>
    </div>
  );
}

export function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <Button type="button" onClick={onClick} disabled={saving} className="cursor-pointer">
      <Save className="mr-2 h-4 w-4" />
      {saving ? "保存中" : "保存配置"}
    </Button>
  );
}

export function BooleanField({ id, label, description, checked, onChange, compact = false }: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex items-center gap-2" : "flex items-center justify-between rounded-md border p-3"}>
      <div>
        <Label htmlFor={id}>{label}</Label>
        {description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function NumberField({ label, description, value, onChange, step = 1 }: {
  label: string;
  description?: string;
  value?: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      <Input
        type="number"
        min={0}
        step={step}
        value={value ?? 0}
        onChange={event => onChange(Number(event.target.value) || 0)}
      />
    </div>
  );
}

export function TextField({ label, description, value, onChange }: { label: string; description?: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      <Input value={value} onChange={event => onChange(event.target.value)} />
    </div>
  );
}

function LongTextField({ label, description, value, onChange }: { label: string; description?: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      <Textarea className="min-h-20" value={value} onChange={event => onChange(event.target.value)} />
    </div>
  );
}

function StringListField({ label, description, value, onChange }: { label: string; description?: string; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      <Textarea
        className="min-h-20"
        value={value.join("\n")}
        onChange={event => onChange(event.target.value.split("\n").map(item => item.trim()).filter(Boolean))}
      />
    </div>
  );
}

function getUserInitials(displayName: string) {
  return displayName
    .split(/\s+/u)
    .map(item => item[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";
}
