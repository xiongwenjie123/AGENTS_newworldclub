import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fleetSeatAssignment, sysUser } from "@/storage/database/shared/schema";
import { eq, sql } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";
import { getLatestPassport } from "@/lib/passport";
import { SEATS } from "@/lib/domain";

const schema = z.object({
  assignmentId: z.string().min(1),
  // 二选一：换真人（userId）或改回 Agent
  userId: z.string().optional(),
  toAgent: z.boolean().optional(),
  agentAlias: z.string().optional(),
});

export const dynamic = "force-dynamic";

/** 手动调整席位：Agent 补位 <-> 真人，或更换真人（覆盖 AI 推荐，留痕） */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("参数错误");
  const dbi = await db();

  const rows = await dbi
    .select()
    .from(fleetSeatAssignment)
    .where(eq(fleetSeatAssignment.assignmentId, body.data.assignmentId))
    .limit(1);
  const seat = rows[0];
  if (!seat) return fail("席位不存在", 404);

  if (body.data.toAgent) {
    await dbi
      .update(fleetSeatAssignment)
      .set({
        assignType: "agent",
        assignedUserId: null,
        agentAlias: body.data.agentAlias ?? "Agent 补位",
        matchScore: 0,
        assignComment: `人工调整：由 ${me.nickname} 改为 Agent 补位（待后续替换）`,
        updatedAt: sql`now()`,
      })
      .where(eq(fleetSeatAssignment.assignmentId, body.data.assignmentId));
    return ok({ status: "agent" });
  }

  if (!body.data.userId) return fail("请选择替换的成员或改为 Agent 补位");

  const userRows = await dbi.select().from(sysUser).where(eq(sysUser.userId, body.data.userId)).limit(1);
  const target = userRows[0];
  if (!target) return fail("成员不存在", 404);

  const snap = await getLatestPassport(body.data.userId);
  const seatDef = SEATS.find((s) => s.name === seat.seatName);
  const matchScore =
    snap && seatDef ? (snap.seatFullScore as Record<string, number>)[seatDef.id] ?? 0 : 0;

  await dbi
    .update(fleetSeatAssignment)
    .set({
      assignType: "human",
      assignedUserId: body.data.userId,
      agentAlias: null,
      matchScore: matchScore,
      assignComment: `人工调整：由 ${me.nickname} 指定 ${target.nickname}（适配分 ${matchScore}，覆盖 AI 推荐）`,
      updatedAt: sql`now()`,
    })
    .where(eq(fleetSeatAssignment.assignmentId, body.data.assignmentId));

  return ok({ status: "human", matchScore });
});
