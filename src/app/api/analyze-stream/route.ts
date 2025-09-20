import type { NextRequest } from "next/server";
import type { JinaSearchResponse } from "@/types/callback/external";
import crypto from "crypto-js";
import OpenAI from "openai";
import { getGradingModel } from "@/config";
import { buildSystemPrompt, getModeInstructions } from "@/lib/ai";

import { db_name, db_table } from "@/lib/constants";

import { db_find, db_insert } from "@/lib/db";
import { searchWebFromJina } from "@/lib/external";
import { aiResultCache } from "@/lib/memory-cache";

const CHUNK_BUFFER_SIZE = 10; // 减少缓冲区大小
const NON_STREAM_TIMEOUT = 120000; // 非流式模式超时时间
const FIRST_CHUNK_TIMEOUT = 10000; // 首个chunk超时时间

// 格式化搜索结果为适合AI对话的文本
function formatSearchResultsForAI(searchResult: JinaSearchResponse): string {
	if (!searchResult || !searchResult.data || searchResult.data.length === 0) {
		return "";
	}

	const searchInfo = searchResult.data
		.slice(0, 5) // 只取前5个结果，避免内容过长
		.map((article, index) => {
			return `${index + 1}. 标题: ${article.title}
   来源: ${article.url}
   描述: ${article.description}
   内容摘要: ${article.content.substring(0, 200)}...`;
		})
		.join("\n\n");

	return `\n\n=== 相关资料检索结果 ===\n${searchInfo}\n=== 检索结果结束 ===\n\n`;
}

export async function POST(request: NextRequest) {
	let resultContent = "";
	let chunkQueue: string[] = [];
	let hasError = false;

	try {
		const { articleText, mode, modelId, needSearch, searchKeywords } = await request.json();

		// 输入验证
		if (!articleText || typeof articleText !== "string") {
			return Response.json({ error: "文章内容不能为空" }, { status: 400 });
		}

		// 获取选择的评分模型
		const gradingModel = getGradingModel(modelId);
		if (!gradingModel) {
			return Response.json({ error: "无效的评分模型" }, { status: 400 });
		}

		const normalizedText = articleText.replace(/[\s\p{P}\p{S}]/gu, "");
		const sha1 = crypto.SHA1(normalizedText).toString();
		const cacheKey = `${sha1}-${mode || "default"}-${modelId}`;

		// 先检查内存缓存
		const memoryResult = aiResultCache.get(cacheKey);
		if (memoryResult) {
			return createStreamResponse(memoryResult, "cached");
		}

		// 再检查数据库缓存
		const cached = await db_find(db_name, db_table, {
			sha1,
			mode: mode || "default",
			modelId: modelId || "standard",
		});
		if (cached && cached.result) {
			const resultStr = typeof cached.result === "string" ? cached.result : JSON.stringify(cached.result);
			// 存入内存缓存以加速后续访问
			aiResultCache.set(cacheKey, resultStr);
			return createStreamResponse(resultStr, "cached");
		}

		// 新限额逻辑：基于登录状态、IP、指纹
		const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
		const fingerprint = request.headers.get("x-fingerprint");

		// 执行搜索并保存结果
		let searchResult = null;
		if (needSearch && searchKeywords) {
			searchResult = await searchWebFromJina(searchKeywords);
		}

		const openAI = new OpenAI({
			apiKey: gradingModel.api_key,
			baseURL: gradingModel.base_url,
		});

		const model: string = gradingModel.model;

		// 拼接模式指令
		const modeInstruction = await getModeInstructions(mode);

		// 构建严格基于文档的系统提示词
		const systemPrompt = await buildSystemPrompt(modeInstruction);

		// 直接尝试建立流式连接
		const abortController = new AbortController();
		const timeoutId = setTimeout(() => {
			abortController.abort();
		}, NON_STREAM_TIMEOUT); // 使用更长的超时时间以支持非流式模式

		try {
			// 动态构建 messages，将搜索结果插入到系统提示之后
			const messages: Array<{ role: "system" | "user"; content: string }> = [
				{ role: "system", content: systemPrompt },
			];

			// 如果存在搜索结果，则将其作为一条独立的用户消息附加
			const formattedSearch = searchResult ? formatSearchResultsForAI(searchResult as JinaSearchResponse) : "";
			if (formattedSearch && formattedSearch.trim().length > 0) {
				messages.push({
					role: "user",
					content: `以下是与主题相关的检索资料（供参考）：\n${formattedSearch}`,
				});
			}

			messages.push({ role: "user", content: articleText });

			const stream = await openAI.chat.completions.create({
				model,
				messages,
				temperature: 0.3,
				stream: true,
				response_format: { type: "json_object" },
				seed: fingerprint ? Number.parseInt(fingerprint) : undefined,
			}, {
				signal: abortController.signal,
			});

			// 创建一个可读流
			const encoder = new TextEncoder();
			let isStreamingMode = true; // 假设支持流式，在首次响应时验证

			const readable = new ReadableStream({
				async start(controller) {
					try {
						let firstChunkReceived = false;
						const firstChunkTimeout = setTimeout(() => {
							if (!firstChunkReceived) {
								console.warn("首个chunk超时，可能不支持流式响应");
								isStreamingMode = false;
							}
						}, FIRST_CHUNK_TIMEOUT);

						for await (const chunk of stream) {
							if (!firstChunkReceived) {
								firstChunkReceived = true;
								clearTimeout(firstChunkTimeout);

								// 检查chunk的结构来判断是否真正支持流式
								if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
									isStreamingMode = true;
									console.warn("检测到原生流式模式");
									// 发送模式标识（客户端可以解析这个信息）
									controller.enqueue(encoder.encode("<!--STREAM_MODE:native-->"));
								} else {
									isStreamingMode = false;
									console.warn("检测到非流式模式，将等待完整响应");
									// 发送模式标识（客户端可以解析这个信息）
									controller.enqueue(encoder.encode("<!--STREAM_MODE:simulated-->"));
								}
							}

							const content = chunk.choices[0]?.delta?.content || "";
							if (content && !hasError) {
								resultContent += content;

								if (isStreamingMode) {
									// 流式模式：立即发送内容
									chunkQueue.push(content);
									if (chunkQueue.length >= CHUNK_BUFFER_SIZE) {
										const bufferedContent = chunkQueue.join("");
										chunkQueue = [];
										controller.enqueue(encoder.encode(bufferedContent));
									}
								}
								// 非流式模式：只累积内容，不立即发送
							}
						}

						// 处理剩余内容
						if (!hasError) {
							if (isStreamingMode && chunkQueue.length > 0) {
								// 流式模式：发送剩余的缓冲内容
								controller.enqueue(encoder.encode(chunkQueue.join("")));
								chunkQueue = [];
							} else if (!isStreamingMode && resultContent.trim()) {
								// 非流式模式：模拟流式发送完整内容
								const chunkSize = 50;
								let pos = 0;
								const sendChunks = () => {
									if (pos >= resultContent.length) {
										controller.close();
										return;
									}
									const chunk = resultContent.slice(pos, pos + chunkSize);
									controller.enqueue(encoder.encode(chunk));
									pos += chunkSize;
									setTimeout(sendChunks, 10); // 添加小延迟模拟流式
								};
								sendChunks();
								return; // 提前返回，避免重复关闭
							}
						}

						controller.close();

						// 异步处理数据库缓存，不影响响应速度
						if (!hasError && resultContent.trim()) {
							setImmediate(async () => {
								try {
									const jsonRegex = /```json([\s\S]*?)```/;
									const match = resultContent.match(jsonRegex);
									const jsonContent = match ? match[1].trim() : resultContent;

									let parsedResult;
									try {
										parsedResult = JSON.parse(jsonContent);
										if (!parsedResult || typeof parsedResult !== "object") {
											throw new Error("Invalid JSON result");
										}
									} catch (parseError) {
										console.error("JSON解析失败，以文本形式保存", parseError);
										parsedResult = resultContent; // 如果解析失败，则保存原始文本
									} finally {
										// 立即清空大对象引用，释放内存
										resultContent = "";
									}

									const overallScore = parsedResult.overallScore || 0;
									const tags = parsedResult.tags || [];

									await db_insert(
										db_name,
										db_table,
										{
											uid: null,
											article: {
												input: { articleText, mode: mode || "default", modelId: modelId || "standard" },
												output: { result: jsonContent, overallScore, tags },
											},
											metadata: {
												sha1,
												ip,
												fingerprint,
												modelId: modelId || "standard",
											},
											timestamp: new Date().toISOString(),
										},
									);

									// 同时存入内存缓存
									aiResultCache.set(cacheKey, jsonContent);
								} catch (e) {
									console.error("缓存AI结果失败", e);
								}
							});
						}
					} catch (error) {
						hasError = true;
						controller.error(error);
					} finally {
						clearTimeout(timeoutId);
						// 清理内存
						resultContent = "";
						chunkQueue = [];
					}
				},
			});

			return new Response(readable, {
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					"Cache-Control": "no-cache",
					"Connection": "keep-alive",
					"X-Stream-Mode": "auto-detect", // 表示将在运行时检测
					"X-Response-Mode": "adaptive", // 表示自适应模式
				},
			});
		} finally {
			clearTimeout(timeoutId);
		}
	} catch (error) {
		console.error("流式分析出错:", error);
		// 清理内存
		resultContent = "";
		chunkQueue = [];
		return Response.json({ error: "分析出错", detail: (error as Error).message }, { status: 500 });
	}
}

// 辅助函数：创建流式响应
function createStreamResponse(resultStr: string, mode: "cached" | "simulated" | "native" = "native") {
	const encoder = new TextEncoder();
	const chunkSize = 50; // 减小块大小以减少内存占用
	let pos = 0;

	const readable = new ReadableStream({
		start(controller) {
			// 首先发送模式标识
			controller.enqueue(encoder.encode(`<!--STREAM_MODE:${mode}-->`));

			const sendChunks = () => {
				try {
					if (pos >= resultStr.length) {
						controller.close();
						return;
					}

					const chunk = resultStr.slice(pos, pos + chunkSize);
					controller.enqueue(encoder.encode(chunk));
					pos += chunkSize;
					setTimeout(sendChunks, 5);
				} catch (error) {
					controller.error(error);
				}
			};
			sendChunks();
		},
	});

	const headers: Record<string, string> = {
		"Content-Type": "text/plain; charset=utf-8",
		"Cache-Control": "no-cache",
		"Connection": "keep-alive",
	};

	// 添加响应头指示当前模式
	switch (mode) {
		case "cached":
			headers["X-Stream-Mode"] = "cached";
			headers["X-Response-Mode"] = "cached";
			break;
		case "simulated":
			headers["X-Stream-Mode"] = "simulated";
			headers["X-Response-Mode"] = "non-streaming";
			break;
		case "native":
		default:
			headers["X-Stream-Mode"] = "native";
			headers["X-Response-Mode"] = "streaming";
			break;
	}

	return new Response(readable, { headers });
}
