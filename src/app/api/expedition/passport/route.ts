import { requireUser } from "@/lib/auth";
import { getLatestPassport } from "@/lib/passport";
import { SEATS, DIMENSION_META } from "@/lib/domain";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 我的航行档案（最新快照） */
export const GET = handler(async () => {
  const me = await requireUser();
  const snap = await getLatestPassport(me.userId);
  if (!snap) return ok({ passport: null });

  const seatScores = SEATS.map((s) => ({
    seatId: s.id,
    seatName: s.name,
    cabin: s.cabin,
    cabinName: s.cabinName,
    score: (snap.seatFullScore as Record<string, number>)[s.id] ?? 0,
  })).sort((a, b) => b.score - a.score);

  const basis = (snap.seatExplainBasis as { target_item: string; score: number; basis_text: string }[]) ?? [];

  return ok({
    passport: {
      snapshotId: snap.passportSnapshotId,
      version: snap.passportVersionNo,
      honorTitle: snap.honorTitle,
      nickname: me.nickname,
      civilizationNo: me.civilizationNo,
      eightDimScore: snap.eightDimScore,
      dimensions: DIMENSION_META,
      cognitiveStyleTags: snap.cognitiveStyleTags,
      starCount: snap.starCount,
      apuCredit: Number(snap.apuCreditSim),
      missionCount: snap.missionCount,
      seatScores,
      topSeats: seatScores.slice(0, 3),
      comment: snap.snapshotComment,
      basis,
      createdAt: snap.createdAt,
    },
  });
});
