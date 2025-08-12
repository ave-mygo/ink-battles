"use client";

import { Crown, FileText, Gift, Users, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { generateBrowserFingerprint } from "@/lib/browser-fingerprint";
import { calculateAdvancedModelCalls, getUserType, USER_LIMITS, UserType } from "@/lib/constants";

interface UserTierData {
	userType: UserType;
	displayName: string;
	icon: React.ReactNode;
	badgeColor: string;
	email?: string;
	donationAmount?: number;
	limits: {
		perRequest: number | null;
		dailyLimit: number | null;
	};
	advancedModelCalls?: number;
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

	const fetchUserTierData = async () => {
		let userType = UserType.GUEST;
		let email = "";
		let donationAmount = 0;

		// 检查用户登录状态
		try {
			const authResponse = await fetch("/api/auth/me", { credentials: "include" });
			if (authResponse.ok) {
				const authData = await authResponse.json();
				email = authData.email || "";

				// 如果已登录，获取订阅信息
				if (email) {
					try {
						const subscriptionResponse = await fetch("/api/user/subscription");
						if (subscriptionResponse.ok) {
							const subscriptionData = await subscriptionResponse.json();
							donationAmount = subscriptionData.subscription?.totalAmount || 0;
						}
					} catch (error) {
						console.warn("获取订阅信息失败:", error);
					}
				}
			}
		} catch (error) {
			console.error("检查登录状态失败:", error);
		}

		// 确定用户类型
		const isLoggedIn = Boolean(email);
		userType = getUserType(isLoggedIn, donationAmount);
		const limits = USER_LIMITS[userType];

		let displayName = "";
		let icon: React.ReactNode = null;
		let badgeColor = "";

		switch (userType) {
			case UserType.GUEST: {
				displayName = "游客用户";
				icon = <Users className="h-4 w-4" />;
				badgeColor = "text-gray-600 bg-gray-50 border-gray-200";
				break;
			}
			case UserType.REGULAR: {
				displayName = "普通用户";
				icon = <Gift className="h-4 w-4" />;
				badgeColor = "text-blue-600 bg-blue-50 border-blue-200";
				break;
			}
			case UserType.MEMBER: {
				displayName = "会员用户";
				icon = <Crown className="h-4 w-4" />;
				badgeColor = "text-yellow-700 bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300";
				break;
			}
		}

		const advancedModelCalls = userType === UserType.MEMBER && donationAmount > 0
			? calculateAdvancedModelCalls(donationAmount)
			: undefined;

		setTierData({
			userType,
			displayName,
			icon,
			badgeColor,
			email,
			donationAmount,
			limits,
			advancedModelCalls,
		});
	};

	// 页面加载时初始化浏览器指纹并获取用户分级信息
	useEffect(() => {
		const initializeData = async () => {
			try {
				// 初始化浏览器指纹
				const fingerprint = await generateBrowserFingerprint();
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

	const getCurrentLimit = () => {
		return tierData.limits.perRequest || Number.MAX_SAFE_INTEGER;
	};

	const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
		setArticleText(val);
	};

	if (loading) {
		return (
			<Card className="border-0 bg-white/80 h-full w-full shadow-lg backdrop-blur-sm">
				<CardHeader>
					<CardTitle className="flex gap-2 items-center">
						<FileText className="text-blue-600 h-5 w-5" />
						作品输入
					</CardTitle>
					<CardDescription>请粘贴您要分析的完整作品内容，支持小说、散文、诗歌等各类文体</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col h-full">
					<div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 animate-pulse">
						<div className="mb-2 rounded bg-gray-200 h-4 w-1/2"></div>
						<div className="rounded bg-gray-200 h-3 w-3/4"></div>
					</div>
					<div className="rounded bg-gray-100 flex-1 min-h-[200px] animate-pulse"></div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-0 bg-white/80 h-full w-full shadow-lg backdrop-blur-sm">
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<FileText className="text-blue-600 h-5 w-5" />
					作品输入
				</CardTitle>
				<CardDescription>请粘贴您要分析的完整作品内容，支持小说、散文、诗歌等各类文体</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col h-full">
				{/* 用户分级信息 */}
				<div className="mb-4 p-4 border rounded-lg">
					<div className="space-y-3">
						{/* 用户等级展示 */}
						<div className="flex items-center justify-between">
							<div className="flex gap-2 items-center">
								{tierData.icon}
								<span className="text-sm font-semibold">{tierData.displayName}</span>
								{tierData.email && (
									<span className="text-muted-foreground text-xs">
										(
										{tierData.email}
										)
									</span>
								)}
							</div>
							<Badge className={tierData.badgeColor}>
								{tierData.userType === UserType.MEMBER && tierData.donationAmount
									? `已捐赠 ¥${tierData.donationAmount}`
									: tierData.displayName}
							</Badge>
						</div>

						{/* 权益信息 */}
						<div className="text-xs space-y-1">
							<div className="flex justify-between">
								<span className="text-muted-foreground">单次分析上限:</span>
								<span className="font-medium">
									{tierData.limits.perRequest ? `${tierData.limits.perRequest.toLocaleString()} 字` : "无限制"}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">每日累计上限:</span>
								<span className="font-medium">
									{tierData.limits.dailyLimit ? `${tierData.limits.dailyLimit.toLocaleString()} 字` : "无限制"}
								</span>
							</div>
							{tierData.advancedModelCalls && (
								<div className="flex justify-between">
									<span className="text-muted-foreground flex gap-1 items-center">
										<Zap className="h-3 w-3" />
										高级模型调用:
									</span>
									<span className="font-medium">
										{tierData.advancedModelCalls.toLocaleString()}
										{" "}
										次/日
									</span>
								</div>
							)}
						</div>

						{/* 升级提示 */}
						{tierData.userType === UserType.GUEST && (
							<div className="pt-2 text-center border-t">
								<p className="text-muted-foreground text-xs mb-2">
									注册登录获得更高字数限制
								</p>
								<div className="flex gap-2 justify-center">
									<a href="/signin" className="text-xs text-blue-600 underline hover:text-blue-700">
										登录
									</a>
									<span className="text-muted-foreground text-xs">或</span>
									<a href="/signup" className="text-xs text-blue-600 underline hover:text-blue-700">
										注册
									</a>
								</div>
							</div>
						)}

						{tierData.userType === UserType.REGULAR && (
							<div className="pt-2 text-center border-t">
								<p className="text-muted-foreground text-xs mb-2">
									成为会员解锁无限分析和高级模型
								</p>
								<a href="/sponsors" className="text-xs text-orange-600 underline hover:text-orange-700">
									了解会员权益
								</a>
							</div>
						)}
					</div>
				</div>

				<Textarea
					ref={textareaRef}
					placeholder="请在此处粘贴要分析的作品全文..."
					value={articleText}
					onChange={handleTextChange}
					className="text-base leading-relaxed border-slate-200 flex-1 min-h-[200px] w-full resize-none overflow-auto focus:border-blue-500 focus:ring-blue-500/20"
				/>
				<div className="text-sm text-slate-500 mt-2 flex items-center justify-between">
					<span>
						字数统计:
						{" "}
						{articleText.length}
						{" "}
						/
						{" "}
						{getCurrentLimit() === Number.MAX_SAFE_INTEGER ? "无限制" : getCurrentLimit().toLocaleString()}
						{" "}
						字
					</span>
					{getCurrentLimit() !== Number.MAX_SAFE_INTEGER && articleText.length > getCurrentLimit() * 0.8 && (
						<span className="text-xs text-amber-600">
							接近限额，建议
							{tierData.userType === UserType.GUEST && "登录或"}
							{tierData.userType === UserType.REGULAR && "升级会员或"}
							分段提交
						</span>
					)}
				</div>
				<LimitModal
					open={showLimitModal}
					onClose={() => setShowLimitModal(false)}
					tierData={tierData}
				/>
			</CardContent>
		</Card>
	);
}
