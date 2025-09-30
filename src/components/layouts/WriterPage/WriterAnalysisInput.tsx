"use client";

import { Crown, FileText, Gift, Users, Zap } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { USER_LIMITS, UserType } from "@/lib/constants";
import { getFingerprintId } from "@/lib/fingerprint";

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
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	const fetchUserTierData = async () => {
		try {
			// TODO: 在这里实现用户数据请求逻辑
			// 示例代码:
			// const response = await fetch('/api/user/profile');
			// const userData = await response.json();
			// const userType = userData.userType;

			// 临时默认值，请替换为实际的 API 调用
			const userType: UserType = UserType.GUEST;

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
				badgeColor = "text-yellow-700 bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300 dark:text-yellow-300 dark:from-yellow-900/30 dark:to-orange-900/30 dark:border-yellow-800";
			}

			setTierData({
				userType,
				displayName,
				icon,
				badgeColor,
				limits,
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
	};

	// 页面加载时初始化浏览器指纹并获取用户分级信息
	useEffect(() => {
		const initializeData = async () => {
			try {
				// 初始化浏览器指纹
				const fingerprint = await getFingerprintId();
				setBrowserFingerprint(fingerprint);

				// 获取用户分级信息
				await fetchUserTierData();
			} catch (error) {
				console.error("初始化数据失败:", error);
			} finally {
				setLoading(false);
			}
		};

		initializeData();
	}, []);

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

		// 立即更新本地状态以保证输入响应性
		setArticleText(val);
	}, [getCurrentLimit, setArticleText]);

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
				<div className="mb-4 p-4 rounded-xl ring-1 ring-slate-200 from-indigo-50/60 to-white bg-gradient-to-r dark:ring-slate-700 dark:from-slate-800/60 dark:to-slate-900/40">
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
											已开通
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
							<div className="text-muted-foreground text-[12px]">升级会员解锁无限分析与高级模型</div>
							<a href="/sponsors" className="text-xs text-orange-600 font-medium dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">了解会员</a>
						</div>
					)}
					{tierData.userType === UserType.MEMBER && tierData.donationAmount !== undefined && (
						<div className="text-[12px] text-slate-600 mt-3 pt-3 border-t flex items-center justify-between dark:text-slate-300">
							<span>
								感谢支持！当前累计赞助：¥
								{tierData.donationAmount?.toLocaleString?.() || tierData.donationAmount}
							</span>
							<a href="/dashboard" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">管理赞助</a>
						</div>
					)}
				</div>

				<Textarea
					ref={textareaRef}
					placeholder="请在此处粘贴要分析的作品全文..."
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
