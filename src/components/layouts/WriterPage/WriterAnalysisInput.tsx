"use client";

import { FileText, LogIn, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { generateBrowserFingerprint } from "@/lib/browser-fingerprint";
import { DAILY_CAP_GUEST, PER_REQUEST_GUEST, PER_REQUEST_LOGGED } from "@/lib/constants";

function LimitModal({ open, onClose, isLoggedIn, currentLimit }: {
	open: boolean;
	onClose: () => void;
	isLoggedIn: boolean;
	currentLimit: number;
}) {
	if (!open)
		return null;
	return (
		<div className="bg-black/40 flex items-center inset-0 justify-center fixed z-50">
			<div className="px-8 py-8 rounded-2xl bg-white flex flex-col gap-4 min-w-[320px] shadow-2xl items-center animate-fade-in">
				<div className="text-2xl text-blue-600 font-bold mb-2">已达单次字数上限</div>
				<div className="text-slate-700 mb-2 text-center">
					{isLoggedIn
						? `登录用户单次最多 ${currentLimit} 字`
						: `未登录用户单次最多 ${currentLimit} 字，每日累计 ${DAILY_CAP_GUEST} 字`}
				</div>
				<div className="text-sm text-slate-600 text-center">
					{isLoggedIn
						? "请尝试分段提交，或联系管理员申请更高限额。"
						: "请尝试分段提交，或先登录以获得更好体验。"}
				</div>
				{!isLoggedIn && (
					<a href="/signin" className="text-white font-bold px-6 py-3 rounded-lg bg-blue-600 shadow transition-all duration-200 hover:bg-blue-700">去登录</a>
				)}
				<button type="button" className="text-slate-600 mt-2" onClick={onClose}>我知道了</button>
			</div>
		</div>
	);
}

export default function WriterAnalysisInput({ articleText, setArticleText }: { articleText: string; setArticleText: (text: string) => void }) {
	const [showLimitModal, setShowLimitModal] = useState(false);
	const [_browserFingerprint, setBrowserFingerprint] = useState<string>("");
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
	const [userEmail, setUserEmail] = useState<string>("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// 页面加载时初始化浏览器指纹并检查登录状态
	useEffect(() => {
		// 初始化浏览器指纹
		(async () => {
			try {
				const fingerprint = await generateBrowserFingerprint();
				setBrowserFingerprint(fingerprint);
			} catch (error) {
				console.error("生成浏览器指纹失败:", error);
			}
		})();

		// 检查用户登录状态
		const checkLoginStatus = async () => {
			try {
				const response = await fetch("/api/auth/me", {
					credentials: "include",
				});
				if (response.ok) {
					const data = await response.json();
					setIsLoggedIn(true);
					setUserEmail(data.email || "");
				} else {
					setIsLoggedIn(false);
					setUserEmail("");
				}
			} catch (error) {
				console.error("检查登录状态失败:", error);
				setIsLoggedIn(false);
				setUserEmail("");
			}
		};

		checkLoginStatus();
	}, []);

	const getCurrentLimit = () => {
		return isLoggedIn ? PER_REQUEST_LOGGED : PER_REQUEST_GUEST;
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

	return (
		<Card className="mx-auto border-0 bg-white/80 h-full max-w-2xl w-full shadow-lg backdrop-blur-sm">
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<FileText className="text-blue-600 h-5 w-5" />
					作品输入
				</CardTitle>
				<CardDescription>请粘贴您要分析的完整作品内容，支持小说、散文、诗歌等各类文体</CardDescription>
			</CardHeader>
			<CardContent>
				{/* 用户状态与限额信息 */}
				<div className="mb-4 p-4 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
					{isLoggedIn
						? (
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<div className="flex gap-2 items-center">
											<User className="text-green-600 h-5 w-5" />
											<span className="text-sm font-semibold text-green-700">欢迎回来</span>
										</div>
										<div className="text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full">
											会员用户
										</div>
									</div>
									<div className="text-xs text-slate-600 flex items-center gap-1">
										<span>当前账号：</span>
										<span className="text-green-700 font-mono">{userEmail}</span>
									</div>
									<div className="text-xs text-green-600 bg-white/60 rounded px-2 py-1 inline-block">
										✨ 单次最多 {PER_REQUEST_LOGGED.toLocaleString()} 字，无每日限制
									</div>
								</div>
							)
						: (
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<div className="flex gap-2 items-center">
											<LogIn className="text-amber-600 h-5 w-5" />
											<span className="text-sm font-semibold text-amber-700">体验模式</span>
										</div>
										<div className="text-xs text-amber-600 font-medium bg-amber-100 px-2 py-1 rounded-full">
											游客用户
										</div>
									</div>
									<div className="text-xs text-amber-600 bg-white/60 rounded px-2 py-1 inline-block">
										单次最多 {PER_REQUEST_GUEST.toLocaleString()} 字，每日累计 {DAILY_CAP_GUEST.toLocaleString()} 字
									</div>
									<div className="text-xs text-slate-600">
										<a href="/signin" className="text-blue-600 hover:text-blue-700 underline">登录</a> 
										<span className="mx-1">或</span> 
										<a href="/signup" className="text-blue-600 hover:text-blue-700 underline">注册</a> 
										<span className="ml-1">获得更好体验</span>
									</div>
								</div>
							)}
				</div>

				{/* 使用说明区域 - 仅在未登录时显示对比 */}
				{!isLoggedIn && (
					<div className="mb-4 p-3 border border-slate-200 rounded-lg bg-slate-50">
						<div className="mb-2 flex gap-2 items-center">
							<div className="rounded-full bg-green-500 h-2 w-2"></div>
							<span className="text-sm text-green-700 font-medium">登录用户</span>
							<span className="text-xs text-green-600">
								单次
								{PER_REQUEST_LOGGED}
								{" "}
								字，无每日上限
							</span>
						</div>
						<div className="flex gap-2 items-center">
							<div className="rounded-full bg-yellow-500 h-2 w-2"></div>
							<span className="text-sm text-yellow-700 font-medium">未登录用户</span>
							<span className="text-xs text-yellow-600">
								单次
								{PER_REQUEST_GUEST}
								{" "}
								字，当日累计
								{DAILY_CAP_GUEST}
								{" "}
								字
							</span>
						</div>
					</div>
				)}

				<Textarea
					ref={textareaRef}
					placeholder="请在此处粘贴要分析的作品全文..."
					value={articleText}
					onChange={handleTextChange}
					className="text-base leading-relaxed border-slate-200 max-h-[500px] min-h-[200px] w-full resize-y overflow-auto focus:border-blue-500 focus:ring-blue-500/20"
					style={{ height: "auto", maxHeight: 500 }}
				/>
				<div className="text-sm text-slate-500 mt-2 flex items-center justify-between">
					<span>
						字数统计:
						{" "}
						{articleText.length}
						{" "}
						/
						{" "}
						{getCurrentLimit().toLocaleString()}
						{" "}
						字
					</span>
					{articleText.length > getCurrentLimit() * 0.8 && (
						<span className="text-xs text-amber-600">
							接近限额，建议
							{!isLoggedIn && "登录或"}
							分段提交
						</span>
					)}
				</div>
				<LimitModal
					open={showLimitModal}
					onClose={() => setShowLimitModal(false)}
					isLoggedIn={isLoggedIn}
					currentLimit={getCurrentLimit()}
				/>
			</CardContent>
		</Card>
	);
}
