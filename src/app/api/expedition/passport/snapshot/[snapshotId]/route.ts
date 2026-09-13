import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { expeditionPassportSnapshot } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { SEATS, DIMENSION_META } from "@/lib/domain";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 获取指定版本的航行档案快照 */
export const GET = handler(async (_req: NextRequest, ctx: { params: Promise<{ snapshotId: string }> }) => {
  const me = await requireUser();
  const { snapshotId } = await ctx.params;
  const dbi = await db();

  const snap = await dbi
    .select()
    .from(expeditionPassportSnapshot)
    .where(eq(expeditionPassportSnapshot.passportSnapshotId, snapshotId))
    .limit(1);

  if (snap.length === 0) return fail("快照不存在", 404);
  if (snap[0].userId !== me.userId) return fail("无权查看他人档案", 403);

  const s = snap[0];
  const seatScores = SEATS.map((seat) => ({
    seatId: seat.id,
    seatName: seat.name,
    cabin: seat.cabin,
    cabinName: seat.cabinName,
    score: (s.seatFullScore as Record<string, number>)[seat.id] ?? 0,
  })).sort((a, b) => b.score - a.score);

  const basis = (s.seatExplainBasis as { target_item: string; score: number; basis_text: string }[]) ?? [];

  return ok({
    passport: {
      snapshotId: s.passportSnapshotId,
      version: s.passportVersionNo,
      honorTitle: s.honorTitle,
      nickname: me.nickname,
      civilizationNo: me.civilizationNo,
      eightDimScore: s.eightDimScore,
      dimensions: DIMENSION_META,
      cognitiveStyleTags: s.cognitiveStyleTags,
      starCount: s.starCount,
      apuCredit: Number(s.apuCreditSim),
      missionCount: s.missionCount,
      seatScores,
      topSeats: seatScores.slice(0, 3),
      comment: s.snapshotComment,
      basis,
      createdAt: s.createdAt,
    },
  });
});