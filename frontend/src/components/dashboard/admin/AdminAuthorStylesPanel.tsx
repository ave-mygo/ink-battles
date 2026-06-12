"use client";

import type { AuthorStyleLibraryItem, AuthorStyleLibrarySaveInput, AuthorStyleSetting, SiteSettingMeta } from "@ink-battles/shared/types/common";
import { Database, Edit3, Plus, RotateCw, Save, Settings2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthorStyleSettingEditor } from "@/components/dashboard/admin/AdminSiteSettingsEditors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult } from "@/utils/api/eden-response";

interface AdminAuthorStylesPanelProps {
  initialItems: AuthorStyleLibraryItem[];
  initialSetting: AuthorStyleSetting;
}

interface AuthorStyleFormState {
  id: string | null;
  authorName: string;
  bio: string;
  representativeWorks: string;
  representativeTexts: string;
  styleIntro: string;
}

const emptyForm: AuthorStyleFormState = {
  id: null,
  authorName: "",
  bio: "",
  representativeWorks: "",
  representativeTexts: "",
  styleIntro: "",
};

const splitLines = (value: string) => value.split("\n").map(item => item.trim()).filter(Boolean);

const splitTextBlocks = (value: string) => value.split(/\n{2,}/u).map(item => item.trim()).filter(Boolean);

/**
 * 作者风格库后台管理面板。
 */
export function AdminAuthorStylesPanel({ initialItems, initialSetting }: AdminAuthorStylesPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [setting, setSetting] = useState(initialSetting);
  const [form, setForm] = useState<AuthorStyleFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);
  const [rebuildingId, setRebuildingId] = useState<string | null>(null);
  const [rebuildingAll, setRebuildingAll] = useState(false);
  const isEditing = Boolean(form.id);

  const readyCount = useMemo(() => items.filter(item => item.vectorStatus === "ready").length, [items]);

  const updateForm = (field: keyof AuthorStyleFormState, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const buildPayload = (): AuthorStyleLibrarySaveInput => ({
    authorName: form.authorName,
    bio: form.bio,
    representativeWorks: splitLines(form.representativeWorks),
    representativeTexts: splitTextBlocks(form.representativeTexts),
    styleIntro: form.styleIntro,
  });

  const refreshItems = async () => {
    const response = await createClientEden().api.v2.admin["author-styles"].get();
    const result = await normalizeEdenResult<{ success: boolean; data?: { items: AuthorStyleLibraryItem[] } }>(
      response.data,
      response.error,
      "刷新失败",
    );
    if (result.success)
      setItems(result.data?.items ?? []);
  };

  const saveSetting = async () => {
    setSavingSetting(true);
    try {
      const response = await createClientEden().api.v2.admin["site-settings"]({ key: "ai.authorStyle" }).put({ value: setting });
      const result = await normalizeEdenResult<{ success: boolean; message?: string; data?: SiteSettingMeta[] }>(
        response.data,
        response.error,
        "保存失败",
      );
      if (!result.success) {
        toast.error(result.message ?? "保存失败");
        return;
      }
      const savedSetting = result.data?.find(item => item.key === "ai.authorStyle")?.value as AuthorStyleSetting | undefined;
      if (savedSetting)
        setSetting(savedSetting);
      toast.success(setting.enabled ? "作者风格匹配已启用" : "作者风格匹配已关闭");
    } finally {
      setSavingSetting(false);
    }
  };

  const saveAuthorStyle = async () => {
    const payload = buildPayload();
    if (!payload.authorName.trim()) {
      toast.error("请填写作者名称");
      return;
    }
    if (payload.representativeTexts.length === 0) {
      toast.error("请至少填写一段代表性文案");
      return;
    }

    setSaving(true);
    try {
      const response = form.id
        ? await createClientEden().api.v2.admin["author-styles"]({ id: form.id }).patch(payload)
        : await createClientEden().api.v2.admin["author-styles"].post(payload);
      const result = await normalizeEdenResult<{ success: boolean; message?: string; data?: AuthorStyleLibraryItem }>(
        response.data,
        response.error,
        "保存失败",
      );
      if (!result.success) {
        toast.error(result.message ?? "保存失败");
        return;
      }
      await refreshItems();
      setForm(emptyForm);
      toast.success(result.message ?? "作者风格已保存，后台生成中");
    } finally {
      setSaving(false);
    }
  };

  const editItem = (item: AuthorStyleLibraryItem) => {
    setForm({
      id: item.id,
      authorName: item.authorName,
      bio: item.bio,
      representativeWorks: item.representativeWorks.join("\n"),
      representativeTexts: item.representativeTexts.join("\n\n"),
      styleIntro: item.styleIntro,
    });
  };

  const rebuildItem = async (id: string) => {
    setRebuildingId(id);
    try {
      const response = await createClientEden().api.v2.admin["author-styles"]({ id }).rebuild.post();
      const result = await normalizeEdenResult<{ success: boolean; message?: string; data?: AuthorStyleLibraryItem }>(
        response.data,
        response.error,
        "重建失败",
      );
      if (!result.success) {
        toast.error(result.message ?? "重建失败");
        return;
      }
      await refreshItems();
      toast.success(result.message ?? "已加入后台重建队列");
    } finally {
      setRebuildingId(null);
    }
  };

  const rebuildAll = async () => {
    setRebuildingAll(true);
    try {
      const response = await createClientEden().api.v2.admin["author-styles"].rebuild.post({ limit: 200 });
      const result = await normalizeEdenResult<{ success: boolean; message?: string; data?: { queued: number } }>(
        response.data,
        response.error,
        "批量重建失败",
      );
      if (!result.success) {
        toast.error(result.message ?? "批量重建失败");
        return;
      }
      await refreshItems();
      toast.success(`已加入后台队列：${result.data?.queued ?? 0} 条`);
    } finally {
      setRebuildingAll(false);
    }
  };

  const deleteItem = async (id: string) => {
    const response = await createClientEden().api.v2.admin["author-styles"]({ id }).delete();
    const result = await normalizeEdenResult<{ success: boolean; message?: string }>(
      response.data,
      response.error,
      "删除失败",
    );
    if (!result.success) {
      toast.error(result.message ?? "删除失败");
      return;
    }
    setItems(current => current.filter(item => item.id !== id));
    if (form.id === id)
      setForm(emptyForm);
    toast.success("作者风格已删除");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">作者风格库</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            录入作者资料和代表性文案后，系统会自动抽取风格特征并生成向量，用于分析结果中的相似作者匹配。
          </p>
        </div>
        <Button type="button" variant="outline" className="cursor-pointer disabled:cursor-not-allowed" disabled={rebuildingAll || items.length === 0} onClick={rebuildAll}>
          <Database className="mr-2 h-4 w-4" />
          {rebuildingAll ? "入队中" : "批量重建向量"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4" />
                匹配配置
              </CardTitle>
              <CardDescription className="mt-1">
                开启后，分析完成时会用当前作品文风画像和作者风格库向量做相似度检索；未命中时仍保留模型生成的作者参照。
              </CardDescription>
            </div>
            <Badge variant={setting.enabled ? "default" : "secondary"}>
              {setting.enabled ? "已启用" : "未启用"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuthorStyleSettingEditor value={setting} onChange={setSetting} />
          <Button type="button" className="cursor-pointer disabled:cursor-not-allowed" disabled={savingSetting} onClick={saveSetting}>
            <Save className="mr-2 h-4 w-4" />
            {savingSetting ? "保存中" : "保存匹配配置"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {isEditing ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEditing ? "编辑作者" : "新增作者"}
            </CardTitle>
            <CardDescription>代表性文案按空行拆分为多段样本，保存后会进入后台队列生成风格向量。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="作者名称（必填）">
              <Input value={form.authorName} onChange={event => updateForm("authorName", event.target.value)} placeholder="例如：张爱玲" />
            </Field>
            <Field label="作者简介（选填）">
              <Textarea className="min-h-24" value={form.bio} onChange={event => updateForm("bio", event.target.value)} placeholder="可留空；用于管理端辅助识别作者背景。" />
            </Field>
            <Field label="代表作品（选填）">
              <Textarea className="min-h-20" value={form.representativeWorks} onChange={event => updateForm("representativeWorks", event.target.value)} placeholder="每行一个作品名" />
            </Field>
            <Field label="补充说明（可选）">
              <Textarea
                className="min-h-24"
                value={form.styleIntro}
                onChange={event => updateForm("styleIntro", event.target.value)}
                placeholder="可留空；系统会根据代表性文案自动生成风格简介和风格特征。"
              />
            </Field>
            <Field label="代表性文案（必填）">
              <Textarea className="field-sizing-fixed min-h-44 max-h-80 resize-y overflow-y-auto" value={form.representativeTexts} onChange={event => updateForm("representativeTexts", event.target.value)} placeholder="多段样本文案之间空一行" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="cursor-pointer disabled:cursor-not-allowed" disabled={saving} onClick={saveAuthorStyle}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "入队中" : "保存并入队"}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setForm(emptyForm)}>
                  取消编辑
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusCard label="作者数量" value={items.length} />
            <StatusCard label="可匹配向量" value={readyCount} />
            <StatusCard label="待处理/失败" value={items.length - readyCount} />
          </div>

          {items.map(item => (
            <AuthorStyleCard
              key={item.id}
              item={item}
              rebuilding={rebuildingId === item.id}
              onEdit={() => editItem(item)}
              onRebuild={() => rebuildItem(item.id)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
          {items.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-slate-500">
                还没有作者风格记录。
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      </CardContent>
    </Card>
  );
}

function AuthorStyleCard({
  item,
  rebuilding,
  onEdit,
  onRebuild,
  onDelete,
}: {
  item: AuthorStyleLibraryItem;
  rebuilding: boolean;
  onEdit: () => void;
  onRebuild: () => void;
  onDelete: () => void;
}) {
  const profile = item.featureProfile;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">{item.authorName}</CardTitle>
            <CardDescription className="mt-1">{profile?.styleLabel || item.styleIntro || "尚未生成风格标签"}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={item.vectorStatus === "ready" ? "default" : item.vectorStatus === "failed" ? "destructive" : "secondary"}>
              {item.vectorStatus === "ready" ? "向量就绪" : item.vectorStatus === "failed" ? "生成失败" : "待生成"}
            </Badge>
            {item.vectorModelId && <Badge variant="outline">{item.vectorModelId}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.bio && <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item.bio}</p>}
        {profile && (
          <div className="grid gap-3 md:grid-cols-2">
            <FeatureBlock title="语言习惯" value={profile.languageHabits.join("、")} />
            <FeatureBlock title="句式结构" value={profile.sentenceStructures.join("、")} />
            <FeatureBlock title="表达节奏" value={profile.expressionRhythm} />
            <FeatureBlock title="意象偏好" value={profile.imageryPreferences.join("、")} />
            <FeatureBlock title="情感倾向" value={profile.emotionalTendency} />
            <FeatureBlock title="精神内核" value={profile.spiritualCore} />
          </div>
        )}
        {item.vectorError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {item.vectorError}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="cursor-pointer" onClick={onEdit}>
            <Edit3 className="mr-2 h-4 w-4" />
            编辑
          </Button>
          <Button type="button" variant="outline" className="cursor-pointer disabled:cursor-not-allowed" disabled={rebuilding} onClick={onRebuild}>
            <RotateCw className="mr-2 h-4 w-4" />
            {rebuilding ? "入队中" : "重建向量"}
          </Button>
          <Button type="button" variant="outline" className="cursor-pointer text-red-600 hover:text-red-700" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs font-medium text-slate-500">{title}</div>
      <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{value || "暂无"}</p>
    </div>
  );
}
