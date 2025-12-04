import type { NextRequest } from "next/server";
import crypto from "crypto-js";
import OpenAI from "openai";
import { getGradingModel } from "@/config";
import { buildSystemPrompt, calculateFinalScore, getModeInstructions } from "@/lib/ai";

import { db_name, db_table } from "@/lib/constants";

import { db_delete, db_find, db_insert } from "@/lib/db";
import { getCurrentUserInfo } from "@/utils/auth/server";
import { deductCallBalance, hasAvailableCalls } from "@/utils/billing/server";

export async function POST(request: NextRequest) {
	try {
		const { articleText, mode, modelId } = await request.json();

		// 输入验证
		if (!articleText || typeof articleText !== "string") {
			return Response.json({ error: "文章内容不能为空" }, { status: 400 });
		}

		// 获取选择的评分模型
		const gradingModel = getGradingModel(modelId);
		if (!gradingModel) {
			return Response.json({ error: "无效的评分模型" }, { status: 400 });
		}

		// 获取当前用户信息
		const user = await getCurrentUserInfo();
		const uid = user?.uid || null;

		// 检查模型是否为高级模型
		const isPremiumModel = gradingModel.premium === true;

		// 如果是高级模型，必须登录
		if (isPremiumModel && !uid) {
			return Response.json(
				{ error: "高级模型需要登录后使用，请先登录" },
				{ status: 401 },
			);
		}

		const normalizedText = articleText.replace(/[\s\p{P}\p{S}]/gu, "");
		const sha1 = crypto.SHA1(normalizedText).toString();

		// 1. 检查数据库缓存（通过 sha1 比对）
		const cached = await db_find(db_name, db_table, {
			"metadata.sha1": sha1,
			"article.input.mode": mode,
			"metadata.modelId": modelId,
		});

		// 如果找到缓存且 sha1 匹配，直接返回缓存结果
		if (cached && cached.metadata?.sha1 === sha1 && cached.article?.output?.result) {
			const resultStr = typeof cached.article.output.result === "string"
				? cached.article.output.result
				: JSON.stringify(cached.article.output.result);
			// 缓存命中直接模拟流式返回，不扣减次数
			return createTextStreamResponse(resultStr);
		}
		// 2. 权限与Session校验
		const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
		const fingerprint = request.headers.get("x-fingerprint");
		const session = request.headers.get("x-session");

		if (!session) {
			return Response.json({ error: "缺少会话标识，请刷新页面重试" }, { status: 400 });
		}

		const sessionRecords = await db_find(db_name, "sessions", { session });
		if (!sessionRecords) {
			return Response.json({ error: "该会话标识不存在或已被使用，请刷新页面重试" }, { status: 400 });
		}

		// 检查 session 是否过期（30 分钟）
		const sessionCreatedAt = new Date(sessionRecords.createdAt).getTime();
		const now = Date.now();
		const SESSION_TTL = 30 * 60 * 1000; // 30 分钟
		if (now - sessionCreatedAt > SESSION_TTL) {
			// 过期则删除并返回错误
			await db_delete(db_name, "sessions", { session });
			return Response.json({ error: "会话已过期，请重新提交分析" }, { status: 400 });
		}

		// 如果是高级模型，检查是否有可用次数
		if (isPremiumModel && uid) {
			const hasCalls = await hasAvailableCalls(uid);
			if (!hasCalls) {
				return Response.json(
					{ error: "调用次数不足，请前往计费管理页面充值或兑换订单" },
					{ status: 403 },
				);
			}
		}

		// 3. 从 session 记录获取搜索结果
		const searchResults = sessionRecords.searchResults || null;

		// 4. 准备 OpenAI 请求
		const openAI = new OpenAI({
			apiKey: gradingModel.api_key,
			baseURL: gradingModel.base_url,
		});

		const modeInstruction = await getModeInstructions(mode);
		const systemPrompt = await buildSystemPrompt(modeInstruction);

		const messages: Array<{ role: "system" | "user"; content: string }> = [
			{ role: "system", content: systemPrompt },
		];

		// 如果有搜索结果总结，添加到对话中
		if (searchResults) {
			messages.push({
				role: "user",
				content: `以下是通过搜索获得的背景资料总结（供参考）：\n\n${searchResults}`,
			});
		}

		messages.push({ role: "user", content: articleText });

		// 5. 发起流式请求
		const stream = await openAI.chat.completions.create({
			model: gradingModel.model,
			messages,
			temperature: gradingModel.model.includes("gpt-5-nano") ? 1 : 0.3,
			stream: true,
			response_format: { type: "json_object" },
			seed: fingerprint ? Number.parseInt(fingerprint) : undefined,
		});

		// 6. 构建流式响应
		const encoder = new TextEncoder();
		let accumulatedContent = ""; // 用于存储完整内容以便存库

		const readable = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of stream) {
						const content = chunk.choices[0]?.delta?.content || "";
						if (content) {
							accumulatedContent += content;
							controller.enqueue(encoder.encode(content));
						}
					}
					controller.close();

					// 7. 异步保存结果到数据库 (流结束后执行)
					if (accumulatedContent.trim()) {
						// 使用 setImmediate 或不 await 保证不阻塞流关闭
						saveToDatabase({
							accumulatedContent,
							articleText,
							mode,
							searchResults,
							sha1,
							ip,
							fingerprint,
							modelId,
							uid,
							session, // 传递 session 用于成功后删除
						}).catch(err => console.error("异步保存数据库失败:", err));

						// 如果是高级模型且用户已登录，扣减调用次数
						if (isPremiumModel && uid) {
							deductCallBalance(uid).catch(err =>
								console.error("扣减调用次数失败:", err),
							);
						}
					}
				} catch (error) {
					console.error("流式响应出错:", error);
					controller.error(error);
				}
			},
		});

		return new Response(readable, {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-cache",
				"Connection": "keep-alive",
			},
		});
	} catch (error) {
		console.error("分析请求出错:", error);
		return Response.json({ error: "服务器内部错误", detail: (error as Error).message }, { status: 500 });
	}
}

// 辅助：简单的文本流式响应 (用于缓存)
function createTextStreamResponse(text: string) {
	const encoder = new TextEncoder();
	const readable = new ReadableStream({
		start(controller) {
			// 模拟流式输出，提升用户体验
			const chunkSize = 100;
			let pos = 0;

			const push = () => {
				if (pos >= text.length) {
					controller.close();
					return;
				}
				const chunk = text.slice(pos, pos + chunkSize);
				controller.enqueue(encoder.encode(chunk));
				pos += chunkSize;
				setTimeout(push, 10); // 10ms 延迟模拟打字机效果
			};

			push();
		},
	});

	return new Response(readable, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
		},
	});
}

// 辅助：数据库保存逻辑抽离
async function saveToDatabase({
	accumulatedContent,
	articleText,
	mode,
	searchResults,
	sha1,
	ip,
	fingerprint,
	modelId,
	uid,
	session,
}: {
	accumulatedContent: string;
	articleText: string;
	mode: string;
	searchResults: string | null;
	sha1: string;
	ip: string | null;
	fingerprint: string | null;
	modelId: string;
	uid: number | null;
	session: string;
}) {
	try {
		// 尝试提取 JSON
		const codeBlockMatch = accumulatedContent.match(/```json\n?>([\s\S]+?)\n?```/);
		const jsonObjectMatch = accumulatedContent.match(/\{[\s\S]+\}/);
		// codeBlockMatch[1] 是捕获组内容，jsonObjectMatch[0] 是整个匹配
		const jsonContent = codeBlockMatch ? codeBlockMatch[1].trim() : (jsonObjectMatch ? jsonObjectMatch[0].trim() : accumulatedContent);

		let parsedResult;
		try {
			parsedResult = JSON.parse(jsonContent);
		} catch {
			// 解析失败也保存原始内容
			parsedResult = { raw: accumulatedContent };
		}

		const tags = parsedResult.tags || [];
		const overallScore = await calculateFinalScore(parsedResult);

		await db_insert(
			db_name,
			db_table,
			{
				uid,
				article: {
					input: {
						articleText,
						mode: mode || "default",
						search: {
							searchResults: searchResults || "",
						},
					},
					output: { result: jsonContent, overallScore, tags },
				},
				metadata: {
					sha1,
					ip,
					fingerprint,
					modelId,
				},
				timestamp: new Date().toISOString(),
			},
		);

		// 数据库写入成功后，删除 session
		await db_delete(db_name, "sessions", { session });
	} catch (e) {
		console.error("保存数据库逻辑异常:", e);
		// 如果保存失败，不删除 session，以便重试
	}
}
