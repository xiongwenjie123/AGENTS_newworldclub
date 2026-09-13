import "server-only";
import { LLMClient, Config, HeaderUtils, type Message } from "coze-coding-dev-sdk";
import type { NextRequest } from "next/server";

const DEFAULT_MODEL = "doubao-seed-2-0-lite-260215";

// 无头兜底客户端（缺失请求上下文时使用；正式请求应透传 headers 以完成鉴权/配额计量）
let fallbackClient: LLMClient | null = null;

/** 从入站请求中提取需要透传给 SDK 的头（鉴权 / 链路追踪 / 配额计量所必需） */
export function forwardHeadersFrom(req: NextRequest): Record<string, string> {
  try {
    return HeaderUtils.extractForwardHeaders(req.headers);
  } catch {
    return {};
  }
}

function resolveClient(forwardHeaders?: Record<string, string>): LLMClient {
  if (forwardHeaders && Object.keys(forwardHeaders).length > 0) {
    // 每次请求携带其上下文头，避免跨请求复用导致鉴权/配额错乱
    return new LLMClient(new Config(), forwardHeaders);
  }
  if (!fallbackClient) fallbackClient = new LLMClient(new Config());
  return fallbackClient;
}

/**
 * 归一化 SDK / langchain 内部抛出的错误。
 * 部分情况下网关返回的字符串错误会被 langchain 当作对象读取，抛出
 * "Cannot read properties of undefined (reading 'message')" 之类二次错误，
 * 这里统一还原为可读的 Error，便于上层判定并降级。
 */
function normalizeErr(e: unknown): Error {
  if (e instanceof Error) {
    const msg = e.message ?? "";
    if (msg.includes("reading 'message'")) {
      return new Error("舰载智能网关临时不可用（资源点不足或模型响应异常）");
    }
    return e;
  }
  return new Error(typeof e === "string" ? e : "舰载智能调用失败");
}

export interface LlmCallOpts {
  model?: string;
  temperature?: number;
  thinking?: "enabled" | "disabled";
  forwardHeaders?: Record<string, string>;
}

/** 非结构化文本调用 */
export async function llmInvoke(messages: Message[], opts: LlmCallOpts = {}): Promise<string> {
  const c = resolveClient(opts.forwardHeaders);
  try {
    const resp = await c.invoke(messages, {
      model: opts.model ?? DEFAULT_MODEL,
      temperature: opts.temperature ?? 0.4,
      thinking: opts.thinking ?? "disabled",
      streaming: false,
    });
    return resp.content ?? "";
  } catch (e) {
    throw normalizeErr(e);
  }
}

/** 流式调用：逐块 yield 文本 */
export async function* llmStream(
  messages: Message[],
  opts: LlmCallOpts = {}
): AsyncGenerator<string> {
  const c = resolveClient(opts.forwardHeaders);
  try {
    const stream = c.stream(messages, {
      model: opts.model ?? DEFAULT_MODEL,
      temperature: opts.temperature ?? 0.4,
      streaming: true,
    });
    for await (const chunk of stream) {
      const text = typeof chunk.content === "string" ? chunk.content : "";
      if (text) yield text;
    }
  } catch (e) {
    throw normalizeErr(e);
  }
}

/** 让 LLM 返回 JSON 对象（自动剥离 markdown 代码围栏并容错解析） */
export async function llmJson<T>(messages: Message[], opts: LlmCallOpts = {}): Promise<T> {
  const raw = await llmInvoke(messages, { ...opts, temperature: opts.temperature ?? 0.3 });
  return parseJsonLoose<T>(raw);
}

export function parseJsonLoose<T>(raw: string): T {
  let text = raw.trim();
  // 剥离 ```json ... ``` 围栏
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // 截取第一个 { 到最后一个 }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  return JSON.parse(text) as T;
}
