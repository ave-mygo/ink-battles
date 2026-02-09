"use client";

import { Crown, FileText, Gift, Upload, Users, X, Zap } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { USER_LIMITS, UserType } from "@/lib/constants";
import { getFingerprintId } from "@/lib/fingerprint";
import { useAuthHydration, useAuthLoading, useIsAuthenticated } from "@/store";
import { getAvailableCalls } from "@/utils/billing/actions";
import { FILE_ACCEPT_STRING, parseFile, SUPPORTED_EXTENSIONS } from "@/utils/common/file-parser";

interface UserTierData {
	userType: UserType;
	displayName: string;
	icon: React.ReactNode;
	badgeColor: string;
	limits: {
		perRequest: number | null;
		dailyLimit: number | null;
	};
	advancedModelCalls?: boolean;
	donationAmount?: number;
}

function LimitModal({ open, onClose, tierData }: {
	open: boolean;
	onClose: () => void;
	tierData: UserTierData;
}) {
	if (!open)
		return null;

	return (
		<div className="bg-black/40 flex items-center inset-0 justify-center fixed z-50">
			<div className="px-8 py-8 rounded-2xl bg-white flex flex-col gap-4 min-w-[320px] shadow-2xl items-center animate-fade-in">
				<div className="text-2xl text-blue-600 font-bold mb-2">已达单次字数上限</div>
				<div className="text-slate-700 mb-2 text-center">
					{tierData.userType === UserType.GUEST
						? (
								<>
									游客用户单次最多
									{" "}
									{tierData.limits.perRequest?.toLocaleString()}
									{" "}
									字
									<br />
									每日累计限制
									{" "}
									{tierData.limits.dailyLimit?.toLocaleString()}
									{" "}
									字
								</>
							)
						: (
								<>
									{tierData.displayName}
									单次最多
									{tierData.limits.perRequest ? `${tierData.limits.perRequest.toLocaleString()} 字` : "无限制"}
								</>
							)}
				</div>
				<div className="text-sm text-slate-600 text-center">
					{tierData.userType === UserType.GUEST
						? "请尝试分段提交，或先登录以获得更好体验。"
						: tierData.userType === UserType.REGULAR
							? "请尝试分段提交，或考虑成为会员获得无限制体验。"
							: "请尝试分段提交。"}
				</div>
				{tierData.userType === UserType.GUEST && (
					<a href="/signin" className="text-white font-bold px-6 py-3 rounded-lg bg-blue-600 shadow transition-all duration-200 hover:bg-blue-700">
						去登录
					</a>
				)}
				{tierData.userType === UserType.REGULAR && (
					<a href="/sponsors" className="text-white font-bold px-6 py-3 rounded-lg bg-orange-600 shadow transition-all duration-200 hover:bg-orange-700">
						了解会员
					</a>
				)}
				<button type="button" className="text-slate-600 mt-2" onClick={onClose}>我知道了</button>
			</div>
		</div>
	);
}

// 独立的进度组件，使用 memo 优化
const UsageProgress = React.memo(({ articleLength, perRequestLimit }: {
	articleLength: number;
	perRequestLimit: number | null;
}) => {
	const progressValue = useMemo(() => {
		if (!perRequestLimit)
			return 0;
		return Math.min(100, Math.round((articleLength / perRequestLimit) * 100));
	}, [articleLength, perRequestLimit]);

	return (
		<div className="mt-3">
			{perRequestLimit
				? (
						<>
							<div className="text-[12px] text-slate-600 mb-1 flex justify-between">
								<span>本次输入进度</span>
								<span>
									{articleLength.toLocaleString()}
									{" "}
									/
									{perRequestLimit.toLocaleString()}
									{" "}
									字
								</span>
							</div>
							<Progress value={progressValue} className="h-2" />
						</>
					)
				: (
						<div className="text-[12px] text-slate-600">本次输入：无限制</div>
					)}
		</div>
	);
});
UsageProgress.displayName = "UsageProgress";

// 独立的字数统计组件，使用 memo 优化
const WordCounter = React.memo(({ articleLength, currentLimit, userType }: {
	articleLength: number;
	currentLimit: number;
	userType: UserType;
}) => {
	const isNearLimit = useMemo(() => {
		return currentLimit !== Number.MAX_SAFE_INTEGER && articleLength > currentLimit * 0.8;
	}, [currentLimit, articleLength]);

	const limitDisplay = useMemo(() => {
		return currentLimit === Number.MAX_SAFE_INTEGER ? "无限制" : currentLimit.toLocaleString();
	}, [currentLimit]);

	return (
		<div className="text-sm text-slate-500 mt-2 flex items-center justify-between">
			<span>
				字数统计:
				{" "}
				{articleLength}
				{" "}
				/
				{" "}
				{limitDisplay}
				{" "}
				字
			</span>
			{isNearLimit && (
				<span className="text-xs text-amber-600">
					接近限额，建议
					{userType === UserType.GUEST && "登录或"}
					{userType === UserType.REGULAR && "升级会员或"}
					分段提交
				</span>
			)}
		</div>
	);
});
WordCounter.displayName = "WordCounter";

export default function WriterAnalysisInput({ articleText, setArticleText }: { articleText: string; setArticleText: (text: string) => void }) {
	const [showLimitModal, setShowLimitModal] = useState(false);
	const [_browserFingerprint, setBrowserFingerprint] = useState<string>("");
	const [tierData, setTierData] = useState<UserTierData>({
		userType: UserType.GUEST,
		displayName: "游客用户",
		icon: <Users className="h-4 w-4" />,
		badgeColor: "text-gray-600 bg-gray-50 border-gray-200",
		limits: USER_LIMITS[UserType.GUEST],
	});
	const [loading, setLoading] = useState(true);
	const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
	const [isParsingFile, setIsParsingFile] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	// 使用客户端状态管理判断登录状态
	const isLoggedIn = useIsAuthenticated();
	const authLoading = useAuthLoading();
	useAuthHydration();

	const fetchUserTierData = useCallback(async (isAuthenticated: boolean) => {
		try {
			let userType: UserType = UserType.GUEST;
			let availableCalls = 0;

			if (isAuthenticated) {
				// 用户已登录，使用 Server Action 获取计费信息
				const callsResult = await getAvailableCalls();

				if (callsResult.success && callsResult.data) {
					availableCalls = callsResult.data.totalCalls;
					// 如果有可用调用次数，则为会员用户
					userType = availableCalls > 0 ? UserType.MEMBER : UserType.REGULAR;
				} else {
					userType = UserType.REGULAR;
				}
			}

			const limits = USER_LIMITS[userType];

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
				limits: USER_LIMITS[UserType.GUEST],
			});
		}
	}, []);

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

	// 处理文件上传
	const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file)
			return;

		// 重置 input 以便可以再次选择同一文件
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}

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
					<div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 animate-pulse dark:border-slate-700 dark:bg-slate-800">
						<div className="mb-2 rounded bg-gray-200 h-4 w-1/2 dark:bg-slate-700"></div>
						<div className="rounded bg-gray-200 h-3 w-3/4 dark:bg-slate-700"></div>
					</div>
					<div className="rounded bg-gray-100 flex-1 min-h-[200px] animate-pulse dark:bg-slate-800/70"></div>
				</CardContent>
			</Card>
		);
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
				<div className="mb-3 flex gap-2 items-center">
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
						格式
					</span>
					{uploadedFileName && (
						<div className="text-xs text-blue-600 ml-auto px-2 py-1 border border-blue-200 rounded-md bg-blue-50 flex gap-1.5 items-center dark:text-blue-400 dark:border-blue-900 dark:bg-blue-950/30">
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

				<Textarea
					ref={textareaRef}
					placeholder="请在此处粘贴要分析的作品全文，或上传文件..."
					value={articleText}
					onChange={handleTextChange}
					className="text-base leading-relaxed border-slate-200 flex-1 max-h-[400px] min-h-[200px] w-full resize-none overflow-auto dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
				/>
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
