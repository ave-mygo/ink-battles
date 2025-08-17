import type { NextRequest } from "next/server";
import process from "node:process";
import crypto from "crypto-js";
import dotenv from "dotenv";
import OpenAI from "openai";
import { buildSystemPrompt, getModeInstructions } from "@/lib/ai";
import { db_name, db_table } from "@/lib/constants";
import { db_find, db_insert } from "@/lib/db";
import { aiResultCache } from "@/lib/memory-cache";
import { getCurrentUserEmail } from "@/utils/auth-server";
import { checkAndConsumeUsage } from "@/utils/usage-server";

const CHUNK_BUFFER_SIZE = 10; // 减少缓冲区大小
const RESPONSE_TIMEOUT = 30000; // 30秒超时

dotenv.config();

export async function POST(request: NextRequest) {
	let resultContent = "";
	let usageInfo: any = null;
	let chunkQueue: string[] = [];
	let hasError = false;

	try {
		const { articleText, mode } = await request.json();

		// 输入验证
		if (!articleText || typeof articleText !== "string") {
			return Response.json({ error: "文章内容不能为空" }, { status: 400 });
		}

		const normalizedText = articleText.replace(/[\s\p{P}\p{S}]/gu, "");
		const sha1 = crypto.SHA1(normalizedText).toString();
		const cacheKey = `${sha1}-${mode || "default"}`;

		// 先检查内存缓存
		const memoryResult = aiResultCache.get(cacheKey);
		if (memoryResult) {
			return createStreamResponse(memoryResult);
		}

		// 再检查数据库缓存
		const cached = await db_find(db_name, db_table, { sha1, mode: mode || "default" });
		if (cached && cached.result) {
			const resultStr = typeof cached.result === "string" ? cached.result : JSON.stringify(cached.result);
			// 存入内存缓存以加速后续访问
			aiResultCache.set(cacheKey, resultStr);
			return createStreamResponse(resultStr);
		}

		// 新限额逻辑：基于登录状态、IP、指纹
		const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
		const fingerprint = request.headers.get("x-fingerprint");
		const userEmail = await getCurrentUserEmail();
		const usageCheck = await checkAndConsumeUsage({
			userEmail,
			ip,
			fingerprint: fingerprint || null,
			textLength: normalizedText.length,
		});
		if (!usageCheck.allowed) {
			return Response.json({ error: usageCheck.message || "超出使用限制" }, { status: 429 });
		}

		const openAI = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY_2!,
			baseURL: process.env.OPENAI_BASE_URL_2!,
		});

		// 读取模型名，优先使用环境变量，否则用默认值
		type ModelType = string;
		const model: ModelType = process.env.OPENAI_MODEL_2 || "gemini-2.5-flash";

		// 拼接模式指令
		const modeInstruction = await getModeInstructions(mode);

		// 构建严格基于文档的系统提示词
		const systemPrompt = await buildSystemPrompt(modeInstruction);

		// 创建超时控制
		const abortController = new AbortController();
		const timeoutId = setTimeout(() => {
			abortController.abort();
		}, RESPONSE_TIMEOUT);

		try {
			const stream = await openAI.chat.completions.create({
				model,
				messages: [
					{
						role: "system",
						content: systemPrompt,
					},
					{
						role: "user",
						content: articleText,
					},
				],
				temperature: 0.1,
				stream: true,
				tools: [
					{
						type: "function",
						function: {
							name: "googleSearch",
						},
					},
				],
				tool_choice: "required",
			}, {
				signal: abortController.signal,
			});

			// 创建一个可读流
			const encoder = new TextEncoder();

			const readable = new ReadableStream({
				async start(controller) {
					try {
						for await (const chunk of stream) {
							const content = chunk.choices[0]?.delta?.content || "";
							if (content && !hasError) {
								resultContent += content;

								// 优化缓冲机制，减少内存占用
								chunkQueue.push(content);
								if (chunkQueue.length >= CHUNK_BUFFER_SIZE) {
									const bufferedContent = chunkQueue.join("");
									chunkQueue = []; // 立即清空数组
									controller.enqueue(encoder.encode(bufferedContent));
								}

								// 防止内存溢出 - 限制单次响应最大长度
								if (resultContent.length > 100000) {
									hasError = true;
									controller.error(new Error("响应内容过长，已中止"));
									break;
								}
							}
							if (chunk.usage) {
								usageInfo = chunk.usage;
							}
						}

						// 发送剩余的缓冲内容
						if (chunkQueue.length > 0 && !hasError) {
							controller.enqueue(encoder.encode(chunkQueue.join("")));
							chunkQueue = []; // 清空数组释放内存
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
										console.error("JSON解析失败，不保存到数据库:", parseError);
										return;
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
											articleText,
											userEmail,
											result: jsonContent,
											ip,
											usage: usageInfo,
											mode: mode || "default",
											timestamp: new Date().toISOString(),
											overallScore,
											tags,
											sha1,
										},
									);

									// 同时存入内存缓存
									aiResultCache.set(cacheKey, jsonContent);
								} catch (e) {
									console.error("缓存AI结果失败", e);
								} finally {
									// 确保清理工作完成
									usageInfo = null;
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
						usageInfo = null;
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
		} finally {
			clearTimeout(timeoutId);
		}
	} catch (error) {
		console.error("流式分析出错:", error);
		// 清理内存
		resultContent = "";
		chunkQueue = [];
		usageInfo = null;
		return Response.json({ error: "分析出错", detail: (error as Error).message }, { status: 500 });
	}
}

// 辅助函数：创建流式响应
function createStreamResponse(resultStr: string) {
	const encoder = new TextEncoder();
	const chunkSize = 50; // 减小块大小以减少内存占用
	let pos = 0;

	const readable = new ReadableStream({
		start(controller) {
			const sendChunks = () => {
				try {
					if (pos >= resultStr.length) {
						controller.close();
						return;
					}

					const chunk = resultStr.slice(pos, pos + chunkSize);
					controller.enqueue(encoder.encode(chunk));
					pos += chunkSize;

					// 使用 setTimeout 而不是同步循环，避免阻塞
					// 添加小延迟以减少 CPU 占用
					setTimeout(sendChunks, 5);
				} catch (error) {
					controller.error(error);
				}
			};
			sendChunks();
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
