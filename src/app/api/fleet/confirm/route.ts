import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { persistFleet, type FleetPlan } from "@/lib/fleet";
import { db } from "@/lib/db";
import { mission } from "@/storage/database/shared/schema";
import { eq, sql } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

const schema = z.object({
  missionId: z.string().min(1),
  plan: z.object({
    strategy: z.string(),
    humanCount: z.number(),
    agentCount: z.number(),
    riskLevel: z.string(),
    riskNote: z.array(z.string()),
    assignments: z.array(
      z.object({
        seatId: z.string(),
        seatName: z.string(),
        cabin: z.string(),
        assignType: z.string(),
        assignedUserId: z.string().nullable().optional(),
        agentAlias: z.string().nullable().optional(),
        matchScore: z.number(),
        assignComment: z.string(),
      })
    ),
  }),
});

export const dynamic = "force-dynamic";

/** 人工确认舰队（最终唯一有效版本） */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("编队数据格式错误");

  const dbi = await db();
  const fleetId = await persistFleet({
    missionId: body.data.missionId,
    commanderUserId: me.userId,
    plan: body.data.plan as FleetPlan,
    isPrimary: true,
    isDemo: false,
  });

  // 更新 Mission 状态为组建舰队中/已编队
  await dbi
    .update(mission)
    .set({ missionStatus: "in_progress", updatedAt: sql`now()` })
    .where(eq(mission.missionId, body.data.missionId));

  return ok({ fleetId, status: "confirmed" });
});
