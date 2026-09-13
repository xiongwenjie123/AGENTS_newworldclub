import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  mission,
  fleet,
  fleetSeatAssignment,
  missionPhaseOutput,
  apuCreditRecord,
  sysUser,
} from "@/storage/database/shared/schema";
import { eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { archiveMissionPassport } from "@/lib/passport";
import { MISSION_PHASES } from "@/lib/domain";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/**
 * 归档复盘：
 * 1. 校验 Mission 闭环（核心阶段产出已确认）
 * 2. 汇总全流程 Agent 调用
 * 3. 全员协作反馈 -> 更新航行档案版本
 * 4. 写归档航迹报告 + APU 奖励
 */
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  const { id: missionId } = await ctx.params;
  const dbi = await db();

  const missionRows = await dbi.select().from(mission).where(eq(mission.missionId, missionId)).limit(1);
  const m = missionRows[0];
  if (!m) return fail("使命不存在", 404);

  // 1. 闭环校验
  const outputs = await dbi.select().from(missionPhaseOutput).where(eq(missionPhaseOutput.missionId, missionId));
  const confirmedPhases = new Set(outputs.filter((o) => o.phaseStatus === "confirmed").map((o) => o.phaseName));
  const missing = MISSION_PHASES.map((p) => p.id)
    .filter((p) => !confirmedPhases.has(p))
    .map((p) => MISSION_PHASES.find((x) => x.id === p)?.name);

  if (missing.length > 0) {
    return fail(`Mission 尚未闭环，以下阶段缺少已确认产出：${missing.join("、")}`, 400);
  }

  // 2. 汇总舰队成员
  const fleets = await dbi.select().from(fleet).where(eq(fleet.missionId, missionId));
  const primaryFleet = fleets.find((f) => f.isPrimary) ?? fleets[0];
  const assignments = primaryFleet
    ? await dbi.select().from(fleetSeatAssignment).where(eq(fleetSeatAssignment.fleetId, primaryFleet.fleetId))
    : [];
  const humanUserIds = [...new Set(assignments.filter((a) => a.assignType === "human" && a.assignedUserId).map((a) => a.assignedUserId as string))];

  // 3. 为每位真人成员生成航行档案新版本（基于反馈；无反馈也推进 missionCount）
  const passportUpdates: { userId: string; nickname: string; newVersion: number; dimDeltas: Record<string, number> }[] = [];
  for (const uid of humanUserIds) {
    const result = await archiveMissionPassport({ userId: uid, missionId, isDemo: m.isDemo });
    const u = await dbi.select().from(sysUser).where(eq(sysUser.userId, uid)).limit(1);
    if (result && u[0]) {
      passportUpdates.push({ userId: uid, nickname: u[0].nickname, newVersion: result.newVersion, dimDeltas: result.dimDeltas });
    }
    // APU 奖励
    await dbi.insert(apuCreditRecord).values({
      userId: uid,
      missionId: missionId,
      changeAmount: "50.00",
      balanceAfter: "0",
      reason: `Mission「${m.missionName}」归档协作奖励`,
      evidenceRef: missionId,
      isDemo: m.isDemo,
    });
  }

  // 4. 归档航迹报告
  const archiveReport = {
    missionNo: m.missionNo,
    missionName: m.missionName,
    closedAt: new Date().toISOString(),
    archivedBy: me.nickname,
    totalPhases: MISSION_PHASES.length,
    confirmedOutputs: outputs.filter((o) => o.phaseStatus === "confirmed").length,
    humanCrew: humanUserIds.length,
    agentCrew: assignments.filter((a) => a.assignType === "agent").length,
    passportUpdates,
  };

  await dbi
    .update(mission)
    .set({
      missionStatus: "archived",
      currentPhase: "archive_retrospect",
      finalArchiveReportJson: archiveReport,
      updatedAt: sql`now()`,
    })
    .where(eq(mission.missionId, missionId));

  return ok({ archived: true, report: archiveReport });
});
