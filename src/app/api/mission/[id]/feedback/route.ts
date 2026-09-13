import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fleet, fleetSeatAssignment, missionCollaborateFeedback } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

const seatFeedbackItem = z.object({
  score: z.number().min(1).max(5),
  evidenceText: z.string().default(""),
  problemNote: z.string().optional(),
});
const schema = z.object({
  fleetId: z.string().min(1),
  targetUserId: z.string().min(1),
  seatFeedback: z.record(z.string(), seatFeedbackItem),
  summary: z.string().optional(),
});
type SeatFeedbackItem = z.infer<typeof seatFeedbackItem>;

export const dynamic = "force-dynamic";

/** 提交同伴协作反馈（归档时用于更新航行档案） */
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  const { id: missionId } = await ctx.params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail(body.error.issues[0]?.message ?? "参数错误");

  const dbi = await db();
  // 校验 fleet 属于该 mission
  const fleetRows = await dbi
    .select()
    .from(fleet)
    .where(eq(fleet.fleetId, body.data.fleetId))
    .limit(1);
  if (!fleetRows[0] || fleetRows[0].missionId !== missionId) return fail("舰队不属于该使命", 400);

  // 校验目标成员在舰队中
  const seatRows = await dbi
    .select()
    .from(fleetSeatAssignment)
    .where(eq(fleetSeatAssignment.fleetId, body.data.fleetId));
  const inFleet = seatRows.some((s) => s.assignedUserId === body.data.targetUserId);
  if (!inFleet) return fail("目标成员不在该舰队中", 400);

  const seatFeedbackJson: Record<string, { score: number; evidence_text: string; problem_note?: string }> = {};
  for (const [seat, v] of Object.entries(body.data.seatFeedback as Record<string, SeatFeedbackItem>)) {
    seatFeedbackJson[seat] = {
      score: v.score,
      evidence_text: v.evidenceText,
      problem_note: v.problemNote,
    };
  }

  const inserted = await dbi
    .insert(missionCollaborateFeedback)
    .values({
      missionId: missionId,
      fleetId: body.data.fleetId,
      feedbackFromUserId: me.userId,
      feedbackTargetUserId: body.data.targetUserId,
      seatFeedbackJson: seatFeedbackJson,
      feedbackSummaryText: body.data.summary ?? "",
      isDemo: false,
    })
    .returning({ feedbackId: missionCollaborateFeedback.feedbackId });

  return ok({ feedbackId: inserted[0].feedbackId });
});
