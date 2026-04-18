import OpenAI from "openai";
import { getConfig, getGradingModelById } from "../config";
import { buildSystemPrompt, getModeInstructions } from "../constants/other/prompts";

export interface AnalysisStreamInput {
	articleText: string;
	mode: string;
	modelId: string;
	fingerprint: string;
	searchResults?: string | null;
	signal?: AbortSignal;
	onProgress?: (chunk: string, chunkCount: number) => Promise<void> | void;
}

export const runAnalysisModel = async (input: {
	articleText: string;
	mode: string;
	modelId: string;
	fingerprint: string;
	searchResults?: string | null;
	signal?: AbortSignal;
	onProgress?: (chunk: string, chunkCount: number) => Promise<void> | void;
}) => {
	const model = getGradingModelById(input.modelId);
	if (!model)
		throw new Error("无效的评分模型");

	const client = new OpenAI({ apiKey: model.api_key, baseURL: model.base_url });
	const modeInstruction = await getModeInstructions(input.mode);
	const systemPrompt = await buildSystemPrompt(modeInstruction);
	const messages: Array<{ role: "system" | "user"; content: string }> = [
		{ role: "system", content: systemPrompt },
	];

	if (input.searchResults) {
		messages.push({ role: "user", content: `以下是通过搜索获得的背景资料总结（供参考）：\n\n${input.searchResults}` });
	}
	messages.push({ role: "user", content: input.articleText });

	const stream = await client.chat.completions.create({
		model: model.model,
		messages,
		temperature: model.model.includes("gpt-5-nano") ? 1 : 0.3,
		...(model.supports_json_mode !== false ? { response_format: { type: "json_object" as const } } : {}),
		seed: input.fingerprint ? Number.parseInt(input.fingerprint) : undefined,
		stream: true,
	}, { signal: input.signal });

	let content = "";
	let chunkCount = 0;
	for await (const chunk of stream) {
		const delta = chunk.choices[0]?.delta?.content ?? "";
		if (!delta)
			continue;
		content += delta;
		chunkCount++;
		await input.onProgress?.(delta, chunkCount);
	}
	return content;
};

export const calculateScorePercentile = (score: number) => ({
	percentile: Math.max(0, Math.min(100, Math.round(score))),
	sampleSize: 0,
});

export const publicModels = () => getConfig().grading_models.filter(model => model.enabled);
