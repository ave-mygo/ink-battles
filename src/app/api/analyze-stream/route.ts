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
	// 生成请求ID用于追踪
	const requestId = crypto.lib.WordArray.random(8).toString();
	const fingerprint = request.headers.get("x-fingerprint") || "unknown";
	const session = request.headers.get("x-session") || "unknown";

	// 获取请求的 AbortSignal，用于取消后端请求
	const abortSignal = request.signal;

	try {
		const { articleText, mode, modelId } = await request.json();

		// 输入验证
		if (!articleText || typeof articleText !== "string") {
			return Response.json({
				error: "文章内容不能为空",
				requestId,
				fingerprint,
				session,
			}, { status: 400 });
		}

		// 获取选择的评分模型
		const gradingModel = getGradingModel(modelId);
		if (!gradingModel) {
			return Response.json({
				error: "无效的评分模型",
				requestId,
				fingerprint,
				session,
			}, { status: 400 });
		}

		// 获取当前用户信息
		const user = await getCurrentUserInfo();
		const uid = user?.uid || null;

		// 检查模型是否为高级模型
		const isPremiumModel = gradingModel.premium === true;

		// 如果是高级模型，必须登录
		if (isPremiumModel && !uid) {
			return Response.json(
				{
					error: "高级模型需要登录后使用，请先登录",
					requestId,
					fingerprint,
					session,
				},
				{ status: 401 },
			);
		}

		const normalizedText = articleText.replace(/[\s\p{P}\p{S}]/gu, "");
		const sha1 = crypto.SHA1(normalizedText).toString();

		// 1. 检查数据库缓存（通过 sha1 比对）
		// 优先使用 modelName 查询，兼容旧数据的 modelId
		const cached = await db_find(db_name, db_table, {
			"metadata.sha1": sha1,
			"article.input.mode": mode,
			"metadata.modelName": gradingModel.model,
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

		if (!session || session === "unknown") {
			return Response.json({
				error: "缺少会话标识，请刷新页面重试",
				requestId,
				fingerprint,
				session,
			}, { status: 400 });
		}

		const sessionRecords = await db_find(db_name, "sessions", { session });
		if (!sessionRecords) {
			return Response.json({
				error: "该会话标识不存在或已被使用，请刷新页面重试",
				requestId,
				fingerprint,
				session,
			}, { status: 400 });
		}

		// 检查 session 是否过期（30 分钟）
		const sessionCreatedAt = new Date(sessionRecords.createdAt).getTime();
		const now = Date.now();
		const SESSION_TTL = 30 * 60 * 1000; // 30 分钟
		if (now - sessionCreatedAt > SESSION_TTL) {
			// 过期则删除并返回错误
			await db_delete(db_name, "sessions", { session });
			return Response.json({
				error: "会话已过期，请重新提交分析",
				requestId,
				fingerprint,
				session,
			}, { status: 400 });
		}

		// 如果是高级模型，检查是否有可用次数
		if (isPremiumModel && uid) {
			const hasCalls = await hasAvailableCalls(uid);
			if (!hasCalls) {
				return Response.json(
					{
						error: "调用次数不足，请前往计费管理页面充值或兑换订单",
						requestId,
						fingerprint,
						session,
					},
					{ status: 403 },
				);
			}
		}

		// 3. 从 session 记录获取搜索结果和网页信息
		const searchResults = sessionRecords.searchResults || null;
		const searchWebPages = sessionRecords.searchWebPages || null;

		// 4. 准备 OpenAI 请求
		console.log(`[${fingerprint}:${requestId}] 准备OpenAI请求，baseURL: ${gradingModel.base_url}, model: ${gradingModel.model}`);

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

		console.log(`[${fingerprint}:${requestId}] 消息数量: ${messages.length}, 用户内容长度: ${articleText.length}`);

		// 5. 发起流式请求
		let stream: any;
		try {
			stream = await openAI.chat.completions.create({
				model: gradingModel.model,
				messages,
				temperature: gradingModel.model.includes("gpt-5-nano") ? 1 : 0.3,
				stream: true,
				response_format: { type: "json_object" },
				seed: fingerprint ? Number.parseInt(fingerprint) : undefined,
			}, {
				// 传递 AbortSignal 给 OpenAI 请求
				signal: abortSignal,
			});

			console.log(`[${fingerprint}:${requestId}] OpenAI流式请求已创建`);
		} catch (apiError) {
			// 检查是否是取消错误
			if (abortSignal.aborted) {
				console.log(`[${fingerprint}:${requestId}] 请求被前端取消`);
				return new Response("", { status: 499 }); // 499 Client Closed Request
			}

			console.error(`[${fingerprint}:${requestId}] OpenAI API调用失败:`, apiError);
			return Response.json({
				error: `AI模型调用失败: ${(apiError as Error).message}`,
				requestId,
				fingerprint,
				session,
				modelInfo: {
					name: gradingModel.name,
					model: gradingModel.model,
					baseURL: gradingModel.base_url,
				},
			}, { status: 500 });
		}

		// 6. 构建流式响应
		const encoder = new TextEncoder();
		let accumulatedContent = ""; // 用于存储完整内容以便存库

		console.log(`[${fingerprint}:${requestId}] 开始流式请求，模型: ${gradingModel.model}`);

		const readable = new ReadableStream({
			async start(controller) {
				try {
					// 首先发送搜索凭据信息（使用特殊标记）
					if (searchResults || searchWebPages) {
						const credentialsData = JSON.stringify({
							__search_credentials__: true,
							searchResults,
							searchWebPages,
						});
						controller.enqueue(encoder.encode(`__SEARCH_CREDENTIALS__:${credentialsData}\n`));
					}

					let chunkCount = 0;
					let streamCancelled = false;

					// 监听取消信号
					const onAbort = () => {
						streamCancelled = true;
						console.log(`[${fingerprint}:${requestId}] 流被前端取消，已处理 ${chunkCount} 个chunk`);
						controller.close();
					};

					if (abortSignal.aborted) {
						onAbort();
						return;
					}

					abortSignal.addEventListener("abort", onAbort);

					try {
						for await (const chunk of stream) {
							// 检查是否被取消
							if (streamCancelled || abortSignal.aborted) {
								console.log(`[${fingerprint}:${requestId}] 检测到取消信号，停止处理流`);
								break;
							}

							const content = chunk.choices[0]?.delta?.content || "";
							if (content) {
								chunkCount++;
								accumulatedContent += content;
								controller.enqueue(encoder.encode(content));

								// 每100个chunk记录一次日志
								if (chunkCount % 100 === 0) {
									console.log(`[${fingerprint}:${requestId}] 已处理 ${chunkCount} 个chunk，累计长度: ${accumulatedContent.length}`);
								}
							}
						}
					} finally {
						// 清理事件监听器
						abortSignal.removeEventListener("abort", onAbort);
					}

					console.log(`[${fingerprint}:${requestId}] 流式请求完成，总chunk数: ${chunkCount}，最终内容长度: ${accumulatedContent.length}，是否被取消: ${streamCancelled}`);

					// 如果被取消，不进行后续处理
					if (streamCancelled || abortSignal.aborted) {
						console.log(`[${fingerprint}:${requestId}] 请求被取消，跳过数据保存和计费扣减`);
						return;
					}

					// 如果没有收到任何内容，发送错误信息
					if (accumulatedContent.trim() === "") {
						const errorMsg = `❌ AI模型返回空内容\n请求ID: ${requestId}\n模型: ${gradingModel.model}\n这可能是模型服务异常，请稍后重试`;
						controller.enqueue(encoder.encode(errorMsg));
						console.error(`[${fingerprint}:${requestId}] AI模型返回空内容`);
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
							searchWebPages,
							sha1,
							ip,
							fingerprint,
							modelName: gradingModel.model,
							uid,
							session, // 传递 session 用于成功后删除
						}).catch(err => console.error(`[${fingerprint}:${requestId}] 异步保存数据库失败:`, err)); // 如果是高级模型且用户已登录，扣减调用次数
						if (isPremiumModel && uid) {
							deductCallBalance(uid).catch(err =>
								console.error(`[${fingerprint}:${requestId}] 扣减调用次数失败:`, err),
							);
						}
					}
				} catch (error) {
					// 检查是否是取消错误
					if (abortSignal.aborted) {
						console.log(`[${fingerprint}:${requestId}] 流处理被取消`);
						return;
					}

					console.error(`[${fingerprint}:${requestId}] 流式响应出错:`, error);
					const errorMsg = `\n\n❌ 流式传输错误\n错误信息: ${(error as Error).message}\n请求ID: ${requestId}\n指纹: ${fingerprint}\n会话: ${session}`;
					controller.enqueue(encoder.encode(errorMsg));
					controller.error(error);
				}
			},

			// 添加 cancel 方法处理流被取消的情况
			cancel(reason) {
				console.log(`[${fingerprint}:${requestId}] ReadableStream被取消:`, reason);
			},
		});

		return new Response(readable, {
			headers: {
				"Content-Type": "text/stream; charset=utf-8",
				"Cache-Control": "no-cache",
				"Connection": "keep-alive",
				"Transfer-Encoding": "chunked",
			},
		});
	} catch (error) {
		console.error("分析请求出错:", error);
		return Response.json({
			error: "服务器内部错误",
			detail: (error as Error).message,
			requestId,
			fingerprint,
			session,
		}, { status: 500 });
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
			"Content-Type": "text/stream; charset=utf-8",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
			"Transfer-Encoding": "chunked",
		},
	});
}

// 辅助：数据库保存逻辑抽离
async function saveToDatabase({
	accumulatedContent,
	articleText,
	mode,
	searchResults,
	searchWebPages,
	sha1,
	ip,
	fingerprint,
	modelName,
	uid,
	session,
}: {
	accumulatedContent: string;
	articleText: string;
	mode: string;
	searchResults: string | null;
	searchWebPages: Array<{ uri: string; title?: string }> | null;
	sha1: string;
	ip: string | null;
	fingerprint: string | null;
	modelName: string;
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
							searchWebPages: searchWebPages || undefined,
						},
					},
					output: { result: jsonContent, overallScore, tags },
				},
				metadata: {
					sha1,
					ip,
					fingerprint,
					modelName, // 新增：保存模型名称
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
