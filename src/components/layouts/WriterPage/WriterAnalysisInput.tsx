"use client";
import { CheckCircle, FileText, KeyRound, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { generateBrowserFingerprint } from "@/lib/browser-fingerprint";

function DonateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
	if (!open)
		return null;
	return (
		<div className="bg-black/40 flex items-center inset-0 justify-center fixed z-50">
			<div className="px-8 py-8 rounded-2xl bg-white flex flex-col gap-4 min-w-[320px] shadow-2xl items-center animate-fade-in">
				<div className="text-2xl text-pink-600 font-bold mb-2">需要Token才能分析超长作品</div>
				<div className="text-slate-700 mb-4 text-center">
					如需分析超过6万字的作品，请先捐赠并获取Token。
					<br />
					感谢您的支持！
				</div>
				<a href="/sponsors" className="text-white font-bold px-6 py-3 rounded-lg bg-pink-600 shadow transition-all duration-200 hover:bg-pink-700">前往捐赠</a>
				<Button variant="ghost" className="mt-2" onClick={onClose}>我知道了</Button>
			</div>
		</div>
	);
}

export default function WriterAnalysisInput({ articleText, setArticleText }: { articleText: string; setArticleText: (text: string) => void }) {
	const [token, setToken] = useState<string>("");
	const [tokenValid, setTokenValid] = useState<boolean>(false);
	const [checking, setChecking] = useState(false);
	const [showDonate, setShowDonate] = useState(false);
	const [showResult, setShowResult] = useState(false);
	const [validationMessage, setValidationMessage] = useState<string>("");
	const [browserFingerprint, setBrowserFingerprint] = useState<string>("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// 页面加载时初始化浏览器指纹并自动校验token
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

		// 检查本地存储的token
		const saved = localStorage.getItem("ink_battles_token");
		if (saved) {
			setToken(saved);
		}
	}, []);

	useEffect(() => {
		if (token)
			localStorage.setItem("ink_battles_token", token);
	}, [token]);

	const handleTokenCheck = async () => {
		if (!browserFingerprint) {
			setValidationMessage("浏览器指纹未初始化，请刷新页面重试");
			setShowResult(true);
			return;
		}

		setChecking(true);
		setShowResult(false);
		setValidationMessage("");

		try {
			const response = await fetch("/api/validate-token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					token,
					browserFingerprint,
				}),
			});

			const result = await response.json();

			if (result.valid) {
				setTokenValid(true);
				setValidationMessage(`Token验证成功！`);
				// 保存有效的token到本地存储
				localStorage.setItem("ink_battles_token", token);
			} else {
				setTokenValid(false);
				setValidationMessage(result.reason || "Token验证失败");
				// 清除无效的token
				localStorage.removeItem("ink_battles_token");
			}
		} catch (error) {
			console.error("Token验证失败:", error);
			setTokenValid(false);
			setValidationMessage("网络错误，请检查网络连接后重试");
		}

		setShowResult(true);
		setChecking(false);
	};

	const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		if (!tokenValid && val.length > 60000) {
			setShowDonate(true);
			setArticleText(val.slice(0, 60000));
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
				{/* 使用说明区域 */}
				<div className="mb-4 p-3 border border-blue-200 rounded-lg bg-blue-50">
					<div className="mb-2 flex gap-2 items-center">
						<div className="rounded-full bg-green-500 h-2 w-2"></div>
						<span className="text-sm text-green-700 font-medium">免费使用</span>
						<span className="text-xs text-green-600">支持 6 万字以内作品分析</span>
					</div>
					<div className="flex gap-2 items-center">
						<div className="rounded-full bg-yellow-500 h-2 w-2"></div>
						<span className="text-sm text-yellow-700 font-medium">Token 用户</span>
						<span className="text-xs text-yellow-600">无字数限制，支持超长作品分析</span>
					</div>
				</div>

				{/* Token 输入区域 */}
				<div className="mb-4">
					<div className="mb-2 flex gap-2 items-center">
						<KeyRound className="text-yellow-500 h-4 w-4" />
						<span className="text-sm text-gray-700 font-medium">Token 输入（可选）</span>
					</div>
					<div className="flex gap-2 items-center">
						<input
							type="text"
							placeholder="输入您的 Token，或留空使用免费版本"
							value={token}
							onChange={(e) => {
								setToken(e.target.value);
								setTokenValid(false);
								setShowResult(false);
							}}
							className="text-sm px-3 py-2 border rounded-md flex-1 focus:border-blue-500 focus:ring-blue-500/20"
						/>
						{!tokenValid && token && (
							<Button size="sm" onClick={handleTokenCheck} disabled={checking} variant="outline">
								{checking ? "校验中..." : "校验"}
							</Button>
						)}
					</div>
					{showResult && token && (
						<div className="mt-2">
							{tokenValid
								? (
										<div className="text-green-600 flex gap-2 items-center">
											<CheckCircle className="h-4 w-4" />
											<span className="text-sm">{validationMessage || "Token 有效，已开启无限制模式"}</span>
										</div>
									)
								: (
										<div className="text-red-500 flex gap-2 items-center">
											<XCircle className="h-4 w-4" />
											<span className="text-sm">{validationMessage || "Token 无效，将使用免费版本（限 6 万字）"}</span>
										</div>
									)}
						</div>
					)}
					{!tokenValid && token && (
						<div className="mt-2 p-3 border border-orange-200 rounded-lg bg-orange-50">
							<div className="text-sm text-orange-700 font-medium mb-1">⚠️ 重要提示</div>
							<div className="text-xs text-orange-600">
								我们已更换了 Token 验证方式，旧的 Token 将无法使用。如您之前已获取过 Token，请重新申领新的 Token。
								<Link href="/token" className="text-xs text-blue-500 underline hover:text-blue-700">获取 Token</Link>
								。
							</div>
						</div>
					)}
					{!token && (
						<div className="text-blue-600 mt-2 flex gap-2 items-center">
							<div className="rounded-full bg-blue-500 h-2 w-2"></div>
							<span className="text-sm">当前使用免费版本，支持 6 万字以内作品</span>
							<Link href="/token" className="text-xs text-blue-500 underline hover:text-blue-700">获取 Token</Link>
						</div>
					)}
				</div>
				<Textarea
					ref={textareaRef}
					placeholder="请在此处粘贴要分析的作品全文..."
					value={articleText}
					onChange={handleTextChange}
					className="text-base leading-relaxed border-slate-200 max-h-[500px] min-h-[200px] w-full resize-y overflow-auto focus:border-blue-500 focus:ring-blue-500/20"
					style={{ height: "auto", maxHeight: 500 }}
				/>
				<div className="text-sm text-slate-500 mt-2">
					字数统计:
					{articleText.length}
					{" "}
					字
				</div>
				<DonateModal open={showDonate} onClose={() => setShowDonate(false)} />
			</CardContent>
		</Card>
	);
}
