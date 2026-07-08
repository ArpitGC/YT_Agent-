import OpenAI from "openai";
import { config } from "../config";

const client = new OpenAI({ apiKey: config.openAiApiKey });

function buildPrompt(input: {
  title: string;
  description: string;
  tags: string[];
  notes?: string | null;
  competitors: string[];
  keywordGaps?: string[];
  nicheClusters?: string[];
  engagementInsights?: string[];
}) {
  return [
    "You are a senior YouTube growth strategist.",
    "Return strict JSON with keys: title, description, tags, topicSummary.",
    "Keep title <= 70 chars and avoid misleading clickbait.",
    "Use keyword gaps and engagement insights to improve discoverability.",
    "",
    `Current title: ${input.title}`,
    `Current description: ${input.description}`,
    `Current tags: ${input.tags.join(", ")}`,
    `Creator notes: ${input.notes ?? ""}`,
    `Keyword gaps: ${(input.keywordGaps ?? []).join(", ")}`,
    "Niche clusters:",
    ...(input.nicheClusters ?? []).map((line) => `- ${line}`),
    "Engagement leaders:",
    ...(input.engagementInsights ?? []).map((line) => `- ${line}`),
    "Top competitors:",
    ...input.competitors.map((c) => `- ${c}`)
  ].join("\n");
}

export async function generateMetadata(input: {
  title: string;
  description: string;
  tags: string[];
  notes?: string | null;
  competitors: string[];
  keywordGaps?: string[];
  nicheClusters?: string[];
  engagementInsights?: string[];
}): Promise<{ title: string; description: string; tags: string[]; topicSummary: string }> {
  const response = await client.chat.completions.create({
    model: config.openAiTextModel,
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You generate YouTube metadata." },
      { role: "user", content: buildPrompt(input) }
    ]
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return {
    title: String(parsed.title ?? input.title),
    description: String(parsed.description ?? input.description),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((v: unknown) => String(v)).slice(0, 15) : input.tags,
    topicSummary: String(parsed.topicSummary ?? parsed.topic_summary ?? "")
  };
}

export async function generateThumbnail(topic: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const result = await client.images.generate({
    model: config.openAiImageModel,
    prompt: `YouTube thumbnail, high CTR, bold contrast, clear focal subject, theme: ${topic}`,
    size: "1536x1024"
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image bytes returned from image model");
  }

  return { bytes: Buffer.from(b64, "base64"), mimeType: "image/png" };
}
