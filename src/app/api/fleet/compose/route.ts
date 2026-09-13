import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { generateFleetPlans, getCandidates } from "@/lib/fleet";
import { db } from "@/lib/db";
import { shipIntelligenceAgentCallLog } from "@/storage/database/shared/schema";
import { ok, handler } from "@/lib/api-helpers";
import { SEATS } from "@/lib/domain";

export const dynamic = "force-dynamic";

const schema = z.object({
  missionId: z.string().min(1),
  mustHumanSeats: z.array(z.string()).optional(),
});

/**
 * AI 自动组舰：扫描候选池，生成 3 套候选舰队方案（人工不可见算法中间态，仅记录日志）
 */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();

  const parsed = schema.safeParse(await req.json());
  const missionId = parsed.success ? parsed.data.missionId : "";
  const mustHumanSeats = parsed.success
    ? parsed.data.mustHumanSeats ?? ["fleet_commander", "star_dock_keeper", "engine_chief"]
    : ["fleet_commander", "star_dock_keeper", "engine_chief"];

  const started = Date.now();
  const plans = await generateFleetPlans({ mustHumanSeats, strategy: "balanced" });
  const costMs = Date.now() - started;

  // 记录 Agent 组舰日志
  const candidates = await getCandidates();
  const dbi = await db();
  await dbi.insert(shipIntelligenceAgentCallLog).values({
    missionId: missionId || null,
    fleetId: null,
    agentName: "Cargo Agent 02",
    callTriggerUserId: me.userId,
    userInstruction: "AI 自动组舰：扫描候选池并生成 3 套互补舰队方案",
    agentInputPrompt: `候选池 ${candidates.length} 人，21 席三舱需求，强制人工席位：${mustHumanSeats.join("、")}`,
    llmModelName: "drizzle-rule-engine",
    llmRawOutput: JSON.stringify(
      plans.map((p) => ({ strategy: p.strategy, human: p.humanCount, agent: p.agentCount, risk: p.riskLevel }))
    ),
    humanOperationType: null,
    tokenConsumedInput: candidates.length * 21,
    tokenConsumedOutput: plans.length * SEATS.length,
    callCostTimeMs: costMs,
    isDemo: false,
  });

  return ok({
    plans: plans.map((p, idx) => ({
      planIndex: idx,
      strategy: p.strategy,
      humanCount: p.humanCount,
      agentCount: p.agentCount,
      riskLevel: p.riskLevel,
      riskNote: p.riskNote,
      assignments: p.assignments,
    })),
    candidateCount: candidates.length,
  });
});
