"use client";

import type { UserTierData } from "./WriterAnalysisInputParts";
import { Crown, FileText, Gift, Upload, Users, X, Zap } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { UserType } from "@/lib/constants";
import { getFingerprintId } from "@/lib/fingerprint";
import { useAuthHydration, useAuthLoading, useIsAuthenticated } from "@/store";
import { useWriterUploadLimits } from "@/store/writer-config-context";
import { BILLING_BALANCE_UPDATED_EVENT, getAvailableCalls } from "@/utils/billing/client";
import { FILE_ACCEPT_STRING, parseFile, SUPPORTED_EXTENSIONS } from "@/utils/common/file-parser";
import { getDynamicUserLimits } from "./WriterAnalysisInputLimits";
import { LimitModal, UsageProgress, WordCounter, WriterAnalysisInputLoading } from "./WriterAnalysisInputParts";

export default function WriterAnalysisInput({ articleText, setArticleText }: { articleText: string; setArticleText: (text: string) => void }) {
  const uploadLimits = useWriterUploadLimits();
  const dynamicUserLimits = useMemo(() => getDynamicUserLimits(uploadLimits), [uploadLimits]);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [_browserFingerprint, setBrowserFingerprint] = useState<string>("");
  const [tierData, setTierData] = useState<UserTierData>({
    userType: UserType.GUEST,
    displayName: "游客用户",
    icon: <Users className="h-4 w-4" />,
    badgeColor: "text-gray-600 bg-gray-50 border-gray-200",
    limits: dynamicUserLimits[UserType.GUEST],
  });
  const [loading, setLoading] = useState(true);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isFileDragActive, setIsFileDragActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevArticleTextRef = useRef<string>(articleText);
  const fileDragDepthRef = useRef(0);
  // 存储 setUploadedFileName 的稳定引用，避免在 useEffect 中直接调用
  const setUploadedFileNameRef = useRef(setUploadedFileName);
  setUploadedFileNameRef.current = setUploadedFileName;

  // 使用客户端状态管理判断登录状态
  const isLoggedIn = useIsAuthenticated();
  const authLoading = useAuthLoading();
  useAuthHydration();

  const fetchUserTierData = useCallback(async (isAuthenticated: boolean) => {
    try {
      let userType: UserType = UserType.GUEST;
      let availableCalls = 0;

      if (isAuthenticated) {
        // 用户已登录，通过 backend API 获取计费信息
        const callsResult = await getAvailableCalls();

        if (callsResult.success && callsResult.data) {
          availableCalls = callsResult.data.totalCalls;
          // 如果有可用调用次数，则为会员用户
          userType = availableCalls > 0 ? UserType.MEMBER : UserType.REGULAR;
        } else {
          userType = UserType.REGULAR;
        }
      }

      const limits = dynamicUserLimits[userType];

      let displayName = "";
      let icon: React.ReactNode = null;
      let badgeColor = "";

      if (userType === UserType.GUEST) {
        displayName = "游客用户";
        icon = <Users className="h-4 w-4" />;
        badgeColor = "text-gray-600 bg-gray-50 border-gray-200 dark:text-slate-300 dark:bg-slate-800/60 dark:border-slate-700";
      } else if (userType === UserType.REGULAR) {
        displayName = "普通用户";
        icon = <Gift className="h-4 w-4" />;
        badgeColor = "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-900";
      } else if (userType === UserType.MEMBER) {
        displayName = "会员用户";
        icon = <Crown className="h-4 w-4" />;
        badgeColor = "text-yellow-700 bg-linear-to-r from-yellow-100 to-orange-100 border-yellow-300 dark:text-yellow-300 dark:from-yellow-900/30 dark:to-orange-900/30 dark:border-yellow-800";
      }

      setTierData({
        userType,
        displayName,
        icon,
        badgeColor,
        limits,
        advancedModelCalls: availableCalls > 0,
        donationAmount: availableCalls, // 暂时用可用次数代替捐赠金额显示
      });
    } catch (error) {
      console.error("获取用户数据失败:", error);
      // 发生错误时使用默认值
      setTierData({
        userType: UserType.GUEST,
        displayName: "游客用户",
        icon: <Users className="h-4 w-4" />,
        badgeColor: "text-gray-600 bg-gray-50 border-gray-200 dark:text-slate-300 dark:bg-slate-800/60 dark:border-slate-700",
        limits: dynamicUserLimits[UserType.GUEST],
      });
    }
  }, [dynamicUserLimits]);

  // 页面加载时初始化浏览器指纹并获取用户分级信息
  useEffect(() => {
    const initializeData = async () => {
      // 等待认证状态水合完成
      if (authLoading)
        return;

      try {
        // 初始化浏览器指纹
        const fingerprint = await getFingerprintId();
        setBrowserFingerprint(fingerprint);

        // 获取用户分级信息，传入当前认证状态
        await fetchUserTierData(isLoggedIn);
      } catch (error) {
        console.error("初始化数据失败:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [authLoading, isLoggedIn, fetchUserTierData]);

  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const handleBillingUpdated = () => {
      if (!authLoading) {
        void fetchUserTierData(isLoggedIn);
      }
    };

    window.addEventListener(BILLING_BALANCE_UPDATED_EVENT, handleBillingUpdated);

    return () => {
      window.removeEventListener(BILLING_BALANCE_UPDATED_EVENT, handleBillingUpdated);
    };
  }, [authLoading, isLoggedIn, fetchUserTierData]);

  // 监听 articleText 变化，当被外部清空时同步清除文件名
  useEffect(() => {
    // 当 articleText 从有内容变为空时，清除文件名
    if (prevArticleTextRef.current !== "" && articleText === "" && uploadedFileName !== null) {
      setUploadedFileNameRef.current(null);
    }
    // 更新 ref
    prevArticleTextRef.current = articleText;
  }, [articleText, uploadedFileName]);

  const getCurrentLimit = useCallback(() => {
    return tierData.limits.perRequest || Number.MAX_SAFE_INTEGER;
  }, [tierData.limits.perRequest]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const currentLimit = getCurrentLimit();

    if (val.length > currentLimit) {
      setShowLimitModal(true);
      setArticleText(val.slice(0, currentLimit));
      const ref = textareaRef.current;
      if (ref) {
        ref.blur();
      }
      return;
    }

    // 清除之前的防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 清除已上传文件名（用户手动编辑时）
    if (uploadedFileName) {
      setUploadedFileName(null);
    }

    // 立即更新本地状态以保证输入响应性
    setArticleText(val);
  }, [getCurrentLimit, setArticleText, uploadedFileName]);

  const hasDraggedFiles = useCallback((event: React.DragEvent<HTMLElement>) => {
    return Array.from(event.dataTransfer.types).includes("Files");
  }, []);

  // 处理文件内容导入，文件选择和拖拽上传共用同一条解析链路。
  const processUploadedFile = useCallback(async (file: File) => {
    if (!file)
      return;

    setIsParsingFile(true);

    try {
      const result = await parseFile(file);

      if (!result.success) {
        toast.error(result.error || "文件解析失败");
        return;
      }

      const text = result.text || "";
      const currentLimit = getCurrentLimit();

      // 检查解析后的文本是否超过限制
      if (text.length > currentLimit) {
        setArticleText(text.slice(0, currentLimit));
        setUploadedFileName(result.fileName || null);
        toast.warning(`文件内容已截断至 ${currentLimit.toLocaleString()} 字（原文 ${text.length.toLocaleString()} 字）`);
        setShowLimitModal(true);
      } else {
        setArticleText(text);
        setUploadedFileName(result.fileName || null);
        toast.success(`已导入「${result.fileName}」，共 ${text.length.toLocaleString()} 字`);
      }
    } catch (error) {
      console.error("文件上传处理错误:", error);
      toast.error("文件处理失败，请重试");
    } finally {
      setIsParsingFile(false);
    }
  }, [getCurrentLimit, setArticleText]);

  // 处理文件上传
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file)
      return;

    // 重置 input 以便可以再次选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    await processUploadedFile(file);
  }, [processUploadedFile]);

  const handleFileDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event))
      return;

    event.preventDefault();
    fileDragDepthRef.current += 1;
    setIsFileDragActive(true);
  }, [hasDraggedFiles]);

  const handleFileDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event))
      return;

    event.preventDefault();
    event.dataTransfer.dropEffect = isParsingFile ? "none" : "copy";
  }, [hasDraggedFiles, isParsingFile]);

  const handleFileDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event))
      return;

    event.preventDefault();
    fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1);
    if (fileDragDepthRef.current === 0) {
      setIsFileDragActive(false);
    }
  }, [hasDraggedFiles]);

  const handleFileDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event))
      return;

    event.preventDefault();
    fileDragDepthRef.current = 0;
    setIsFileDragActive(false);

    if (isParsingFile) {
      return;
    }

    const files = Array.from(event.dataTransfer.files);
    const file = files[0];
    if (!file)
      return;

    if (files.length > 1) {
      toast.info("一次仅支持导入一个文件，已使用第一个文件");
    }

    await processUploadedFile(file);
  }, [hasDraggedFiles, isParsingFile, processUploadedFile]);

  // 触发文件选择
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 清除已上传文件
  const handleClearFile = useCallback(() => {
    setUploadedFileName(null);
    setArticleText("");
  }, [setArticleText]);

  if (loading) {
    return <WriterAnalysisInputLoading />;
  }

  return (
    <Card className="border-0 bg-white/80 h-full w-full shadow-lg backdrop-blur-sm dark:bg-slate-900/70">
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <FileText className="text-blue-600 h-5 w-5 dark:text-blue-400" />
          作品输入
        </CardTitle>
        <CardDescription>请粘贴您要分析的完整作品内容，支持小说、散文、诗歌等各类文体</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        {/* 用户分级信息（现代化设计） */}
        <div className="mb-4 p-4 rounded-xl ring-1 ring-slate-200 from-indigo-50/60 to-white bg-linear-to-r dark:ring-slate-700 dark:from-slate-800/60 dark:to-slate-900/40">
          <div className="flex items-start justify-between">
            <div className="flex gap-2 items-center">
              {tierData.icon}
              <div className="flex flex-col">
                <div className="text-sm text-slate-900 leading-none font-semibold dark:text-slate-100">{tierData.displayName}</div>
              </div>
            </div>
            <Badge className={tierData.badgeColor}>
              {tierData.displayName}
            </Badge>
          </div>

          {/* 使用进度 */}
          <UsageProgress articleLength={articleText.length} perRequestLimit={tierData.limits.perRequest} />

          {/* 权益速览 */}
          <div className="text-[12px] mt-3 gap-2 grid grid-cols-3">
            <div className="px-2 py-1.5 border border-slate-200 rounded-md bg-white/70 flex items-center justify-between dark:border-slate-700 dark:bg-slate-800/60">
              <span className="text-slate-500 dark:text-slate-300">单次上限</span>
              <span className="font-medium">{tierData.limits.perRequest ? `${tierData.limits.perRequest.toLocaleString()} 字` : "无限制"}</span>
            </div>
            <div className="px-2 py-1.5 border border-slate-200 rounded-md bg-white/70 flex items-center justify-between dark:border-slate-700 dark:bg-slate-800/60">
              <span className="text-slate-500 dark:text-slate-300">每日上限</span>
              <span className="font-medium">{tierData.limits.dailyLimit ? `${tierData.limits.dailyLimit.toLocaleString()} 字` : "无限制"}</span>
            </div>
            {tierData.advancedModelCalls
              ? (
                  <div className="px-2 py-1.5 border border-slate-200 rounded-md bg-white/70 flex items-center justify-between dark:border-slate-700 dark:bg-slate-800/60">
                    <span className="text-slate-500 flex gap-1 items-center dark:text-slate-300">
                      <Zap className="h-3 w-3" />
                      高级模型
                    </span>
                    <span className="font-medium">
                      {tierData.donationAmount || 0}
                      {" "}
                      次
                    </span>
                  </div>
                )
              : (
                  <div className="text-slate-400 px-2 py-1.5 border border-slate-200 rounded-md border-dashed bg-white/40 flex items-center justify-center dark:text-slate-500 dark:border-slate-700 dark:bg-slate-800/40">暂无高级模型额度</div>
                )}
          </div>

          {/* 行动按钮 */}
          {tierData.userType === UserType.GUEST && (
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <div className="text-muted-foreground text-[12px]">登录可获得更高字数限制</div>
              <div className="flex gap-2">
                <a href="/signin" className="text-xs text-blue-600 font-medium dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">登录</a>
                <a href="/signup" className="text-xs text-blue-600 font-medium dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">注册</a>
              </div>
            </div>
          )}
          {tierData.userType === UserType.REGULAR && (
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <div className="text-muted-foreground text-[12px]">兑换订单获取高级模型调用次数</div>
              <a href="/dashboard/billing" className="text-xs text-orange-600 font-medium dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">去兑换</a>
            </div>
          )}
          {tierData.userType === UserType.MEMBER && tierData.donationAmount !== undefined && (
            <div className="text-[12px] text-slate-600 mt-3 pt-3 border-t flex items-center justify-between dark:text-slate-300">
              <span className="flex gap-1 items-center">
                <Zap className="h-3 w-3" />
                可用调用次数：
                {tierData.donationAmount}
              </span>
              <a href="/dashboard/billing" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">管理计费</a>
            </div>
          )}
        </div>

        {/* 文件上传区域 */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT_STRING}
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUploadClick}
            disabled={isParsingFile}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            {isParsingFile ? "解析中..." : "上传文件"}
          </Button>
          <span className="text-muted-foreground text-xs">
            支持
            {" "}
            {SUPPORTED_EXTENSIONS.join(", ")}
            {" "}
            格式，可点击上传或拖入下方输入框
          </span>
          {uploadedFileName && (
            <div className="text-xs text-blue-600 px-2 py-1 border border-blue-200 rounded-md bg-blue-50 flex gap-1.5 items-center dark:text-blue-400 dark:border-blue-900 dark:bg-blue-950/30 sm:ml-auto">
              <FileText className="h-3 w-3" />
              {uploadedFileName}
              <button
                type="button"
                onClick={handleClearFile}
                className="text-slate-400 cursor-pointer dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div
          onDragEnter={handleFileDragEnter}
          onDragOver={handleFileDragOver}
          onDragLeave={handleFileDragLeave}
          onDrop={handleFileDrop}
          className={`relative flex flex-1 min-h-50 rounded-md transition-colors ${
            isFileDragActive
              ? "ring-2 ring-blue-500/70 ring-offset-2 ring-offset-white dark:ring-blue-400/70 dark:ring-offset-slate-900"
              : ""
          }`}
        >
          <Textarea
            ref={textareaRef}
            placeholder="请在此处粘贴要分析的作品全文，或上传文件..."
            value={articleText}
            onChange={handleTextChange}
            className="text-base leading-relaxed border-slate-200 flex-1 max-h-100 min-h-50 w-full resize-none overflow-auto dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
          />
          {isFileDragActive && (
            <div className="text-blue-700 pointer-events-none absolute inset-0 rounded-md border-2 border-blue-400 border-dashed bg-blue-50/85 flex flex-col gap-2 items-center justify-center dark:text-blue-200 dark:border-blue-500/80 dark:bg-blue-950/80">
              <Upload className="h-6 w-6" />
              <span className="text-sm font-medium">
                松开即可导入文件
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-300">
                支持
                {" "}
                {SUPPORTED_EXTENSIONS.join(", ")}
              </span>
            </div>
          )}
        </div>
        <WordCounter
          articleLength={articleText.length}
          currentLimit={getCurrentLimit()}
          userType={tierData.userType}
        />
        <LimitModal
          open={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          tierData={tierData}
        />
      </CardContent>
    </Card>
  );
}
