import { NextRequest } from "next/server";
import { llmInvoke, forwardHeadersFrom } from "@/lib/llm";
import { handler, ok, fail } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

async function probe(req: NextRequest) {
  try {
    const t = await llmInvoke(
      [{ role: "user", content: "用一句话回答：1+1等于几？只输出数字。" }],
      { forwardHeaders: forwardHeadersFrom(req) }
    );
    return ok({ reply: t });
  } catch (e) {
    return fail("LLM error: " + (e instanceof Error ? e.message : JSON.stringify(e)));
  }
}

export const GET = handler(probe);
export const POST = handler(probe);
