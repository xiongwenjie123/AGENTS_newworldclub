import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sysUser } from "@/storage/database/shared/schema";
import { eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getLatestPassport } from "@/lib/passport";
import { SEATS } from "@/lib/domain";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 候选池列表：返回所有入池成员的公开航行档案（脱敏） */
export const GET = handler(async () => {
  const dbi = await db();
  const users = await dbi
    .select()
    .from(sysUser)
    .where(sql`${sysUser.inCandidatePool} = true AND ${sysUser.deletedAt} IS NULL`);

  const list = [];
  for (const u of users) {
    const snap = await getLatestPassport(u.userId);
    if (!snap) continue;
    const seatScores = SEATS.map((s) => ({
      seatId: s.id,
      seatName: s.name,
      cabin: s.cabin,
      score: (snap.seatFullScore as Record<string, number>)[s.id] ?? 0,
    })).sort((a, b) => b.score - a.score);

    list.push({
      userId: u.userId,
      nickname: u.nickname,
      civilizationNo: u.civilizationNo,
      avatarUrl: u.avatarUrl,
      honorTitle: snap.honorTitle,
      cognitiveStyleTags: snap.cognitiveStyleTags,
      topSeats: seatScores.slice(0, 3),
      starCount: snap.starCount,
      missionCount: snap.missionCount,
      apuCredit: Number(snap.apuCreditSim),
      isDemo: u.isDemo,
    });
  }

  return ok({ total: list.length, members: list });
});

/** 加入 / 退出候选池 */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const body = (await req.json().catch(() => ({}))) as { join?: boolean };
  const join = body.join !== false;

  const dbi = await db();
  await dbi
    .update(sysUser)
    .set({ inCandidatePool: join, updatedAt: sql`now()` })
    .where(eq(sysUser.userId, me.userId));

  return ok({ inCandidatePool: join });
});
