import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { missionPhaseOutput, shipIntelligenceAgentCallLog } from "@/storage/database/shared/schema";
import { eq, sql } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

const schema = z.object({
  outputId: z.string().min(1),
  operation: z.enum(["confirm", "reject"]),
  modifiedContent: z.string().optional(),
});

export const dynamic = "force-dynamic";

/** 人工确认 / 修改 Agent 产出（人类专属行为，留痕） */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("参数错误");

  const dbi = await db();
  const existing = await dbi
    .select()
    .from(missionPhaseOutput)
    .where(eq(missionPhaseOutput.outputId, body.data.outputId))
    .limit(1);
  if (existing.length === 0) return fail("产出物不存在", 404);

  await dbi
    .update(missionPhaseOutput)
    .set({
      phaseStatus: body.data.operation === "confirm" ? "confirmed" : "rejected",
      confirmUserId: me.userId,
      outputContentText: body.data.modifiedContent ?? existing[0].outputContentText,
      updatedAt: sql`now()`,
    })
    .where(eq(missionPhaseOutput.outputId, body.data.outputId));

  // 同步回写 Agent 调用日志的人工操作类型
  if (existing[0].agentCallLogId) {
    await dbi
      .update(shipIntelligenceAgentCallLog)
      .set({
        humanOperationType: body.data.operation === "confirm" ? "confirmed" : "rejected",
        humanModifyContent: body.data.modifiedContent ?? null,
      })
      .where(eq(shipIntelligenceAgentCallLog.callLogId, existing[0].agentCallLogId));
  }

  return ok({ status: body.data.operation });
});
