import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { demoPresetSnapshot, expeditionPassportSnapshot, sysUser } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api-helpers";
import { eq, desc } from "drizzle-orm";
import { SEATS } from "@/lib/domain";

export const dynamic = "force-dynamic";

/** 将预置档案载入当前用户的航行档案（对照演示模式一键替换） */
export const POST = handler(async (_req: NextRequest, ctx: { params: Promise<{ label: string }> }) => {
  const me = await requireUser(["fleet_commander", "platform_admin", "club_operator", "club_governor"]);
  const { label } = await ctx.params;
  const dbi = await db();

  const preset = await dbi.select().from(demoPresetSnapshot).where(eq(demoPresetSnapshot.presetLabel, label)).limit(1);
  if (preset.length === 0) return fail(`预置档案 ${label} 不存在`, 404);

  const p = preset[0];
  const latest = await dbi
    .select()
    .from(expeditionPassportSnapshot)
    .where(eq(expeditionPassportSnapshot.userId, me.userId))
    .orderBy(desc(expeditionPassportSnapshot.passportVersionNo))
    .limit(1);

  const nextVersion = (latest[0]?.passportVersionNo ?? 0) + 1;
  const seatScores = SEATS.reduce((acc, s) => {
    acc[s.id] = (p.seatFullScore as Record<string, number>)[s.id] ?? 0;
    return acc;
  }, {} as Record<string, number>);

  await dbi.insert(expeditionPassportSnapshot).values({
    userId: me.userId,
    passportVersionNo: nextVersion,
    snapshotSourceType: "demo_preset",
    eightDimScore: p.eightDimScore,
    seatFullScore: seatScores,
    cognitiveStyleTags: p.cognitiveStyleTags ? p.cognitiveStyleTags.split(",").map((s) => s.trim()) : [],
    honorTitle: p.honorTitle ?? "Explorer",
    starCount: p.starCount ?? 0,
    missionCount: p.missionCount ?? 0,
    apuCreditSim: "100",
    snapshotComment: `对照演示模式：载入预置档案 ${p.presetName}`,
    seatExplainBasis: [],
    collaboratorSeatEvalJson: {},
    isDemo: true,
  });

  await dbi.update(sysUser).set({ inCandidatePool: true }).where(eq(sysUser.userId, me.userId));

  return ok({
    message: `已载入预置档案 ${p.presetName}`,
    preset: {
      label: p.presetLabel,
      name: p.presetName,
      eightDimScore: p.eightDimScore,
      seatFullScore: seatScores,
      honorTitle: p.honorTitle,
    },
  });
});