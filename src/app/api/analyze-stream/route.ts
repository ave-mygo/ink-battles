import type { NextRequest } from "next/server";
import process from "node:process";
import crypto from "crypto-js";
import dotenv from "dotenv";
import OpenAI from "openai";
import { buildSystemPrompt, getModeInstructions } from "@/lib/ai";
import { db_name, db_table } from "@/lib/constants";
import { db_find, db_insert } from "@/lib/db";
import { checkAndConsumeUsage, getCurrentUserEmail } from "@/lib/utils-server";

dotenv.config();

export async function POST(request: NextRequest) {
	try {
		const { articleText, mode } = await request.json();
		const normalizedText = articleText.replace(/[\s\p{P}\p{S}]/gu, "");
		const sha1 = crypto.SHA1(normalizedText).toString();
		const cached = await db_find(db_name, db_table, { sha1, mode: mode || "default" });
		if (cached && cached.result) {
			const encoder = new TextEncoder();
			const resultStr = typeof cached.result === "string" ? cached.result : JSON.stringify(cached.result);
			const chunkSize = 100;
			let pos = 0;
			const readable = new ReadableStream({
				start(controller) {
					while (pos < resultStr.length) {
						const chunk = resultStr.slice(pos, pos + chunkSize);
						controller.enqueue(encoder.encode(chunk));
						pos += chunkSize;
					}
					controller.close();
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
						// 验证JSON解析是否成功
						let parsedResult;
						try {
							parsedResult = JSON.parse(jsonContent);
							if (!parsedResult || typeof parsedResult !== "object") {
								throw new Error("Invalid JSON result");
							}
						} catch (parseError) {
							console.error("JSON解析失败，不保存到数据库:", parseError);
							return; // 不保存失败的解析结果
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
