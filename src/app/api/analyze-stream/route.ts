import type { NextRequest } from "next/server";
import process from "node:process";
import dotenv from "dotenv";
import OpenAI from "openai";
import { buildSystemPrompt, getModeInstructions } from "@/lib/ai";
import { db_delete, db_find, db_insert } from "@/lib/db";
import { findApiKeyByToken } from "@/lib/token-server";

dotenv.config();

export async function POST(request: NextRequest) {
	try {
		const { articleText, mode } = await request.json();
		const session = request.headers.get("X-Token");
		const apiKey = request.headers.get("X-Api-Key");

		let orderNumber = null;

		if (apiKey) {
			const apiKeyInfo = await findApiKeyByToken(apiKey);
			orderNumber = apiKeyInfo?.orderNumber;
		}

		const ip = request.headers.get("X-Forwarded-For");

		if (!session) {
			return Response.json({ error: "缺少 Session" }, { status: 400 });
		}

		let sessionInfo = null;
		try {
			sessionInfo = await db_find("ink_battles", "sessions", { session });
		} catch (e) {
			console.error("查找 session 失败", e);
			return Response.json({ error: "Session 校验异常" }, { status: 500 });
		}

		if (!sessionInfo) {
			return Response.json({ error: "Session 不存在或已失效" }, { status: 401 });
		}

		try {
			await db_delete("ink_battles", "sessions", { session });
		} catch (e) {
			console.error("删除 session 失败", e);
			// 不阻断主流程
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
		});

		// 创建一个可读流
		const encoder = new TextEncoder();
		let resultContent = "";
		let usageInfo: any = null;
		const readable = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of stream) {
						const content = chunk.choices[0]?.delta?.content || "";
						if (content) {
							resultContent += content;
							controller.enqueue(encoder.encode(content));
						}
						// 尝试获取usage信息（openai流式一般最后一个chunk带usage）
						if (chunk.usage) {
							usageInfo = chunk.usage;
						}
					}
					controller.close();

					const jsonRegex = /```json([\s\S]*?)```/;
					const match = resultContent.match(jsonRegex);
					const jsonContent = match ? match[1].trim() : resultContent;

					try {
						const overallScore = (() => {
							try {
								return JSON.parse(jsonContent)?.overallScore || 0;
							} catch {
								return 0;
							}
						})();

						await db_insert(
							"ink_battles",
							"analysis_requests_flash",
							{
								articleText,
								session,
								result: jsonContent,
								ip,
								usage: usageInfo,
								mode: mode || "default",
								timestamp: new Date().toISOString(),
								overallScore,
								orderNumber: orderNumber || null,
							},
						);
					} catch (e) {
						console.error("缓存AI结果失败", e);
					}
				} catch (error) {
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
		console.error("流式分析出错:", error);
		return Response.json({ error: "分析出错", detail: (error as Error).message }, { status: 500 });
	}
}
